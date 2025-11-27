"use client";

import { OpenAIRealtimeWebRTC } from "@openai/agents/realtime";

export type VoiceAgentMode = "training" | "call";

export interface StartSessionOptions {
  instructions: string;
  mode: VoiceAgentMode;
}

export class VoiceAgentSession {
  private client: OpenAIRealtimeWebRTC | null = null;

  async start(options: StartSessionOptions): Promise<void> {
    // 1. Get ephemeral client secret from our API
    const res = await fetch("/api/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions: options.instructions }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.error || "Failed to get realtime session token"
      );
    }

    const data = await res.json();
    const clientSecret = data.clientSecret;
    const sessionId = data.sessionId;
    const apiKey = data.apiKey; // Direct API key as fallback

    console.log("Received client secret:", clientSecret ? "present" : "missing");
    console.log("Session ID:", sessionId);

    // WebRTC in browser requires ephemeral client key
    // Use client secret from session, or fall back to API key with useInsecureApiKey
    const keyToUse = clientSecret || apiKey;

    if (!keyToUse) {
      throw new Error("Invalid credentials from backend");
    }

    // 2. Create WebRTC client
    const client = new OpenAIRealtimeWebRTC();

    // 3. Connect to Realtime API
    // Use ephemeral client secret if available, otherwise use API key with useInsecureApiKey flag
    try {
      console.log("Attempting to connect...");
      console.log("Using:", clientSecret ? "ephemeral client secret" : "API key with useInsecureApiKey");
      
      const connectOptions: any = {
        apiKey: keyToUse,
        model: "gpt-4o-mini-realtime-preview",
        initialSessionConfig: {
          instructions: options.instructions,
          voice: "alloy",
          modalities: ["text", "audio"],
        },
      };

      // If using regular API key (not ephemeral), set useInsecureApiKey flag
      if (!clientSecret && apiKey) {
        connectOptions.useInsecureApiKey = true;
        console.log("Using insecure API key option (for development only)");
      }

      await client.connect(connectOptions);
      console.log("Successfully connected to Realtime API");
    } catch (error) {
      console.error("Connection error details:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      // Re-throw with more context
      throw new Error(
        `Failed to connect to Realtime API: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    this.client = client;
    // WebRTC transport will automatically enable microphone and audio output
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// Helper function to create a new session
export function createVoiceAgentSession(): VoiceAgentSession {
  return new VoiceAgentSession();
}

