import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98";
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token";

export interface TokenInfo {
  accessToken: string;
  expiresAt: number;
}

export interface StoredAuth {
  githubToken: string;
  copilotToken?: string;
  copilotTokenExpiresAt?: number;
  enterpriseUrl?: string;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface CopilotTokenResponse {
  token: string;
  expires_at: number;
}

interface OpenCodeAuth {
  "github-copilot"?: {
    type: "oauth";
    refresh: string;
    access: string;
    expires: number;
  };
}

function getAuthFilePath(): string {
  const dir = path.join(os.homedir(), ".ai-sdk-copilot");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return path.join(dir, "auth.json");
}

function getOpenCodeAuthPath(): string {
  const xdg =
    process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  const primary = path.join(xdg, "opencode", "auth.json");
  const fallback = path.join(os.homedir(), ".opencode", "auth.json");

  if (fs.existsSync(primary)) return primary;
  if (fs.existsSync(fallback)) return fallback;
  return primary;
}

export function loadOpenCodeAuth(): StoredAuth | null {
  const filepath = getOpenCodeAuthPath();
  if (!fs.existsSync(filepath)) return null;

  const data = fs.readFileSync(filepath, "utf-8");
  const parsed = JSON.parse(data) as OpenCodeAuth;
  const auth = parsed["github-copilot"];

  if (!auth || auth.type !== "oauth") return null;

  return {
    githubToken: auth.refresh,
    copilotToken: auth.access,
    copilotTokenExpiresAt: auth.expires / 1000,
  };
}

export function loadStoredAuth(): StoredAuth | null {
  const filepath = getAuthFilePath();
  if (fs.existsSync(filepath)) {
    const data = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(data) as StoredAuth;
  }
  return loadOpenCodeAuth();
}

export function saveAuth(auth: StoredAuth): void {
  const filepath = getAuthFilePath();
  fs.writeFileSync(filepath, JSON.stringify(auth, null, 2), { mode: 0o600 });
}

export function clearAuth(): void {
  const filepath = getAuthFilePath();
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

export async function requestDeviceCode(
  enterpriseUrl?: string,
): Promise<DeviceCodeResponse> {
  const url = enterpriseUrl
    ? `${enterpriseUrl}/login/device/code`
    : GITHUB_DEVICE_CODE_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: "read:user",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to request device code: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<DeviceCodeResponse>;
}

export async function pollForAccessToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  enterpriseUrl?: string,
): Promise<string> {
  const url = enterpriseUrl
    ? `${enterpriseUrl}/login/oauth/access_token`
    : GITHUB_ACCESS_TOKEN_URL;
  const expiresAt = Date.now() + expiresIn * 1000;
  let pollInterval = interval;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to poll for access token: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.access_token) return data.access_token;
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      pollInterval += 5;
      continue;
    }
    if (data.error === "expired_token")
      throw new Error("Device code expired. Please try again.");
    if (data.error === "access_denied")
      throw new Error("Access denied by user.");
    if (data.error) throw new Error(data.error_description ?? data.error);
  }

  throw new Error("Device code expired. Please try again.");
}

export async function getCopilotToken(
  githubToken: string,
  enterpriseUrl?: string,
): Promise<CopilotTokenResponse> {
  const url = enterpriseUrl
    ? `${enterpriseUrl}/api/v3/copilot_internal/v2/token`
    : COPILOT_TOKEN_URL;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/json",
      "User-Agent": "GitHubCopilotChat/0.32.4",
      "Editor-Version": "vscode/1.105.1",
      "Editor-Plugin-Version": "copilot-chat/0.32.4",
    },
  });

  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        "GitHub token is invalid or expired. Please login again.",
      );
    throw new Error(
      `Failed to get Copilot token: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<CopilotTokenResponse>;
}

export async function getValidCopilotToken(
  enterpriseUrl?: string,
): Promise<TokenInfo> {
  const stored = loadStoredAuth();
  if (!stored?.githubToken) {
    throw new Error(
      "Not authenticated. Please run the login flow first or provide a GitHub token.",
    );
  }

  if (stored.copilotToken && stored.copilotTokenExpiresAt) {
    const now = Date.now() / 1000;
    if (now < stored.copilotTokenExpiresAt - 60) {
      return {
        accessToken: stored.copilotToken,
        expiresAt: stored.copilotTokenExpiresAt,
      };
    }
  }

  const copilot = await getCopilotToken(stored.githubToken, enterpriseUrl);

  const ownPath = getAuthFilePath();
  if (fs.existsSync(ownPath)) {
    stored.copilotToken = copilot.token;
    stored.copilotTokenExpiresAt = copilot.expires_at;
    saveAuth(stored);
  }

  return { accessToken: copilot.token, expiresAt: copilot.expires_at };
}

export async function login(enterpriseUrl?: string): Promise<void> {
  console.log("Starting GitHub Copilot authentication...\n");

  const device = await requestDeviceCode(enterpriseUrl);

  console.log("Please visit:", device.verification_uri);
  console.log("And enter code:", device.user_code);
  console.log("\nWaiting for authorization...");

  const githubToken = await pollForAccessToken(
    device.device_code,
    device.interval,
    device.expires_in,
    enterpriseUrl,
  );
  const copilot = await getCopilotToken(githubToken, enterpriseUrl);

  saveAuth({
    githubToken,
    copilotToken: copilot.token,
    copilotTokenExpiresAt: copilot.expires_at,
    enterpriseUrl,
  });

  console.log("\nSuccessfully authenticated with GitHub Copilot!");
}

export function logout(): void {
  clearAuth();
  console.log("Logged out from GitHub Copilot.");
}

export function isAuthenticated(): boolean {
  const stored = loadStoredAuth();
  return !!stored?.githubToken;
}
