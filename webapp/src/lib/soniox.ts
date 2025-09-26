const DEFAULT_SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

interface SonioxTokenResponse {
  apiKey: string;
  expiresAt: string;
  websocketUrl: string;
}

export async function issueSonioxToken(): Promise<SonioxTokenResponse> {
  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) {
    throw new Error("Server missing SONIOX_API_KEY environment variable.");
  }

  const response = await fetch("https://api.soniox.com/v1/auth/temporary-api-key", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      usage_type: "transcribe_websocket",
      expires_in_seconds: 3600,
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Soniox token error (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as { api_key: string; expires_at: string };

  return {
    apiKey: data.api_key,
    expiresAt: data.expires_at,
    websocketUrl: process.env.SONIOX_WEBSOCKET_URL ?? DEFAULT_SONIOX_WEBSOCKET_URL,
  };
}
