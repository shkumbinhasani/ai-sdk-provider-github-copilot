# AI SDK Provider for GitHub Copilot

[![npm version](https://img.shields.io/npm/v/ai-sdk-provider-github-copilot?color=00A79E)](https://www.npmjs.com/package/ai-sdk-provider-github-copilot)
[![License: MIT](https://img.shields.io/npm/l/ai-sdk-provider-github-copilot?color=00A79E)](https://www.npmjs.com/package/ai-sdk-provider-github-copilot)

Use your GitHub Copilot subscription with the [Vercel AI SDK](https://sdk.vercel.ai/docs).

This provider allows you to access models available through GitHub Copilot (GPT-4o, Claude, Gemini, etc.) using the standard AI SDK interface.

## Installation

```bash
npm install ai-sdk-provider-github-copilot ai
```

## Authentication

Before using the provider, you need to authenticate with GitHub Copilot using the OAuth device flow:

```typescript
import { login } from "ai-sdk-provider-github-copilot";

// This will print a URL and code to enter in your browser
await login();
```

The authentication flow:

1. Opens a device code flow with GitHub
2. You visit the URL and enter the code
3. Authorize the application
4. Tokens are stored in `~/.ai-sdk-copilot/auth.json`

### Token Refresh

The provider automatically handles token refresh. GitHub Copilot tokens expire frequently (~30 minutes), but the provider will transparently refresh them using your stored GitHub OAuth token.

## Usage

### Basic Usage

```typescript
import { copilot } from "ai-sdk-provider-github-copilot";
import { generateText } from "ai";

const result = await generateText({
  model: copilot("gpt-4o"),
  prompt: "Explain quantum computing in simple terms",
});

console.log(result.text);
```

### Streaming

```typescript
import { copilot } from "ai-sdk-provider-github-copilot";
import { streamText } from "ai";

const result = await streamText({
  model: copilot("claude-sonnet-4"),
  prompt: "Write a poem about coding",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Custom Provider Instance

```typescript
import { createCopilot } from "ai-sdk-provider-github-copilot";

const copilot = createCopilot({
  // Optional: GitHub Enterprise URL
  enterpriseUrl: "https://github.mycompany.com",
  // Optional: Custom headers
  headers: {
    "X-Custom-Header": "value",
  },
});

const result = await generateText({
  model: copilot("gpt-4o"),
  prompt: "Hello!",
});
```

## Available Models

GitHub Copilot provides access to various models. The available models may change based on your subscription:

| Model ID            | Description                 |
| ------------------- | --------------------------- |
| `gpt-4o`            | OpenAI GPT-4o               |
| `gpt-4o-mini`       | OpenAI GPT-4o Mini          |
| `gpt-4.1`           | OpenAI GPT-4.1              |
| `gpt-4.1-mini`      | OpenAI GPT-4.1 Mini         |
| `gpt-4.1-nano`      | OpenAI GPT-4.1 Nano         |
| `claude-sonnet-4`   | Anthropic Claude Sonnet 4   |
| `claude-3.5-sonnet` | Anthropic Claude 3.5 Sonnet |
| `gemini-2.0-flash`  | Google Gemini 2.0 Flash     |
| `gemini-2.5-pro`    | Google Gemini 2.5 Pro       |
| `o1`                | OpenAI o1                   |
| `o1-mini`           | OpenAI o1 Mini              |
| `o3-mini`           | OpenAI o3 Mini              |

You can also use any model ID string that GitHub Copilot supports.

## API Reference

### `login(enterpriseUrl?: string): Promise<void>`

Initiates the GitHub OAuth device flow for authentication.

### `logout(): void`

Clears stored authentication tokens.

### `isAuthenticated(): boolean`

Returns whether the user has stored authentication tokens.

### `createCopilot(settings?: CopilotProviderSettings): CopilotProvider`

Creates a new Copilot provider instance with custom settings.

### `copilot`

Default provider instance (requires prior authentication via `login()`).

## Disclaimer

**This is an unofficial community provider** and is not affiliated with or endorsed by GitHub or Microsoft. By using this provider:

- You understand that your data will be sent to GitHub Copilot's servers
- You agree to comply with [GitHub's Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- You acknowledge this software is provided "as is" without warranties of any kind

## License

MIT
