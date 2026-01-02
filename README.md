# AI SDK Provider for GitHub Copilot

[![npm version](https://img.shields.io/npm/v/ai-sdk-provider-github-copilot)](https://www.npmjs.com/package/ai-sdk-provider-github-copilot)
[![License: MIT](https://img.shields.io/npm/l/ai-sdk-provider-github-copilot)](https://www.npmjs.com/package/ai-sdk-provider-github-copilot)

Use your GitHub Copilot subscription with the [Vercel AI SDK](https://sdk.vercel.ai/docs).

Access GPT-5, Claude, Gemini and other models through GitHub Copilot's API using the standard AI SDK interface.

## Installation

```bash
npm install ai-sdk-provider-github-copilot ai
```

## Authentication

### Option 1: Device Flow (Recommended)

```typescript
import { login } from "ai-sdk-provider-github-copilot";

await login();
```

This will:

1. Print a URL and code to enter in your browser
2. You authorize the application
3. Tokens are stored in `~/.ai-sdk-copilot/auth.json`

### Option 2: Use Existing OpenCode Auth

If you already use [OpenCode](https://opencode.ai), the provider automatically reads your existing authentication from `~/.opencode/auth.json`. No additional setup needed.

### Option 3: Custom Token Storage

For production apps, you can provide your own token storage:

```typescript
import { createCopilot } from "ai-sdk-provider-github-copilot";

const copilot = createCopilot({
  getTokens: async () => {
    const tokens = await db.getTokens(userId);
    return {
      githubToken: tokens.githubToken,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
    };
  },
  onTokenRefresh: async (tokens) => {
    await db.saveTokens(userId, tokens);
  },
});
```

## Usage

### Basic

```typescript
import { copilot } from "ai-sdk-provider-github-copilot";
import { generateText } from "ai";

const result = await generateText({
  model: copilot("gpt-5.2"),
  prompt: "Explain quantum computing",
});

console.log(result.text);
```

### Streaming

```typescript
import { copilot } from "ai-sdk-provider-github-copilot";
import { streamText } from "ai";

const result = await streamText({
  model: copilot("claude-sonnet-4-5"),
  prompt: "Write a poem about coding",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### GitHub Enterprise

```typescript
import { createCopilot } from "ai-sdk-provider-github-copilot";

const copilot = createCopilot({
  enterpriseUrl: "https://github.mycompany.com",
});
```

## Available Models

### OpenAI

| Model             | Description     |
| ----------------- | --------------- |
| `gpt-5.2`         | GPT-5.2         |
| `gpt-5.2-pro`     | GPT-5.2 Pro     |
| `gpt-5.1`         | GPT-5.1         |
| `gpt-5`           | GPT-5           |
| `gpt-5-mini`      | GPT-5 Mini      |
| `gpt-5-nano`      | GPT-5 Nano      |
| `gpt-4.5-preview` | GPT-4.5 Preview |
| `gpt-4.1`         | GPT-4.1         |
| `gpt-4.1-mini`    | GPT-4.1 Mini    |
| `gpt-4.1-nano`    | GPT-4.1 Nano    |
| `gpt-4o`          | GPT-4o          |
| `gpt-4o-mini`     | GPT-4o Mini     |
| `o3`              | o3              |
| `o3-mini`         | o3 Mini         |
| `o1`              | o1              |

### Anthropic

| Model                      | Description       |
| -------------------------- | ----------------- |
| `claude-sonnet-4-5`        | Claude Sonnet 4.5 |
| `claude-opus-4-5`          | Claude Opus 4.5   |
| `claude-opus-4-1`          | Claude Opus 4.1   |
| `claude-opus-4-0`          | Claude Opus 4.0   |
| `claude-sonnet-4-0`        | Claude Sonnet 4.0 |
| `claude-haiku-4-5`         | Claude Haiku 4.5  |
| `claude-3-7-sonnet-latest` | Claude 3.7 Sonnet |
| `claude-3-5-haiku-latest`  | Claude 3.5 Haiku  |

### Google

| Model                    | Description           |
| ------------------------ | --------------------- |
| `gemini-3-pro-preview`   | Gemini 3 Pro          |
| `gemini-3-flash-preview` | Gemini 3 Flash        |
| `gemini-2.5-pro`         | Gemini 2.5 Pro        |
| `gemini-2.5-flash`       | Gemini 2.5 Flash      |
| `gemini-2.5-flash-lite`  | Gemini 2.5 Flash Lite |
| `gemini-2.0-flash`       | Gemini 2.0 Flash      |
| `gemini-2.0-flash-lite`  | Gemini 2.0 Flash Lite |

Any string model ID is also accepted for new models.

## Token Refresh

GitHub Copilot API tokens expire every ~30 minutes. The provider automatically refreshes them using your long-lived GitHub OAuth token. Use the `onTokenRefresh` callback to persist refreshed tokens.

## API Reference

### `login(enterpriseUrl?: string): Promise<void>`

Starts GitHub OAuth device flow authentication.

### `logout(): void`

Clears stored authentication tokens.

### `isAuthenticated(): boolean`

Returns whether valid tokens exist.

### `createCopilot(settings?: CopilotProviderSettings): CopilotProvider`

Creates a provider instance with custom settings.

#### Settings

| Option           | Type                                               | Description            |
| ---------------- | -------------------------------------------------- | ---------------------- |
| `enterpriseUrl`  | `string`                                           | GitHub Enterprise URL  |
| `headers`        | `Record<string, string>`                           | Custom request headers |
| `getTokens`      | `() => CopilotTokens \| Promise<CopilotTokens>`    | Custom token loader    |
| `onTokenRefresh` | `(tokens: CopilotTokens) => void \| Promise<void>` | Token refresh callback |

### `copilot`

Default provider instance using file-based auth.

## Disclaimer

This is an **unofficial community provider** not affiliated with GitHub or Microsoft.

- Your data is sent to GitHub Copilot's servers
- Comply with [GitHub's Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- Provided "as is" without warranties

## License

MIT
