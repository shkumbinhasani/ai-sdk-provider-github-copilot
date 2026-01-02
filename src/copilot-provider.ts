import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getCopilotToken, loadStoredAuth } from "./auth";

const COPILOT_API_URL = "https://api.githubcopilot.com";

// OpenAI models
export type OpenAIModelId =
  | "o1"
  | "o1-2024-12-17"
  | "o3"
  | "o3-2025-04-16"
  | "o3-mini"
  | "o3-mini-2025-01-31"
  | "gpt-4o"
  | "gpt-4o-2024-11-20"
  | "gpt-4o-mini"
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4-turbo"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4.5-preview"
  | "gpt-5"
  | "gpt-5-mini"
  | "gpt-5-nano"
  | "gpt-5.1"
  | "gpt-5.2"
  | "gpt-5.2-pro"
  | "chatgpt-4o-latest";

// Anthropic models
export type AnthropicModelId =
  | "claude-3-5-haiku-latest"
  | "claude-3-7-sonnet-latest"
  | "claude-haiku-4-5"
  | "claude-sonnet-4-5"
  | "claude-opus-4-0"
  | "claude-opus-4-1"
  | "claude-opus-4-5"
  | "claude-sonnet-4-0"
  | "claude-sonnet-4-20250514";

// Google models
export type GoogleModelId =
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-3-pro-preview"
  | "gemini-3-flash-preview";

export type CopilotModelId =
  | OpenAIModelId
  | AnthropicModelId
  | GoogleModelId
  | (string & {});

export interface CopilotTokens {
  githubToken: string;
  accessToken?: string;
  expiresAt?: number;
}

export interface CopilotProviderSettings {
  enterpriseUrl?: string;
  headers?: Record<string, string>;
  getTokens?: () => CopilotTokens | Promise<CopilotTokens>;
  onTokenRefresh?: (tokens: CopilotTokens) => void | Promise<void>;
}

export interface CopilotProvider {
  (modelId: CopilotModelId): LanguageModel;
  languageModel(modelId: CopilotModelId): LanguageModel;
  chat(modelId: CopilotModelId): LanguageModel;
}

function createCopilotFetch(settings: CopilotProviderSettings) {
  let cached: { token: string; expiresAt: number } | null = null;

  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const now = Date.now() / 1000;

    if (!cached || now >= cached.expiresAt - 60) {
      let tokens: CopilotTokens;

      if (settings.getTokens) {
        tokens = await settings.getTokens();
      } else {
        const stored = loadStoredAuth();
        if (!stored?.githubToken) {
          throw new Error("Not authenticated. Run `login()` first.");
        }
        tokens = {
          githubToken: stored.githubToken,
          accessToken: stored.copilotToken,
          expiresAt: stored.copilotTokenExpiresAt,
        };
      }

      if (
        tokens.accessToken &&
        tokens.expiresAt &&
        now < tokens.expiresAt - 60
      ) {
        cached = { token: tokens.accessToken, expiresAt: tokens.expiresAt };
      } else {
        const copilot = await getCopilotToken(
          tokens.githubToken,
          settings.enterpriseUrl,
        );
        cached = { token: copilot.token, expiresAt: copilot.expires_at };

        if (settings.onTokenRefresh) {
          await settings.onTokenRefresh({
            githubToken: tokens.githubToken,
            accessToken: copilot.token,
            expiresAt: copilot.expires_at,
          });
        }
      }
    }

    const headers = new Headers(init?.headers);
    headers.delete("Authorization");
    headers.set("Authorization", `Bearer ${cached.token}`);
    headers.set("User-Agent", "GitHubCopilotChat/0.32.4");
    headers.set("Editor-Version", "vscode/1.105.1");
    headers.set("Editor-Plugin-Version", "copilot-chat/0.32.4");
    headers.set("Copilot-Integration-Id", "vscode-chat");
    headers.set("Openai-Intent", "conversation-edits");

    if (settings.headers) {
      for (const [key, value] of Object.entries(settings.headers)) {
        headers.set(key, value);
      }
    }

    return fetch(input, { ...init, headers });
  };
}

export function createCopilot(
  settings: CopilotProviderSettings = {},
): CopilotProvider {
  const baseURL = settings.enterpriseUrl
    ? `${settings.enterpriseUrl}/api/copilot`
    : COPILOT_API_URL;

  const compatible = createOpenAICompatible({
    name: "github-copilot",
    baseURL,
    fetch: createCopilotFetch(settings),
  });

  const create = (modelId: CopilotModelId): LanguageModel => {
    return compatible.chatModel(modelId);
  };

  const provider = ((modelId: CopilotModelId) =>
    create(modelId)) as CopilotProvider;
  provider.languageModel = create;
  provider.chat = create;

  return provider;
}

export const copilot = createCopilot();
