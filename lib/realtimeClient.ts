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

    console.log("Received client secret:", clientSecret ? "present" : "missing");
    console.log("Session ID:", sessionId);

    if (!clientSecret) {
      throw new Error("Invalid client secret from backend");
    }

    // 2. Create WebRTC client
    const client = new OpenAIRealtimeWebRTC();

    // 3. Connect to Realtime API
    // The client secret from session API should be used as apiKey
    // Note: According to OpenAI docs, when using session-based auth,
    // the client_secret.value should be used directly as the apiKey
    try {
      console.log("Attempting to connect with client secret...");
      await client.connect({
        apiKey: clientSecret,
        model: "gpt-4o-mini-realtime-preview",
        initialSessionConfig: {
          instructions: options.instructions,
          voice: "alloy",
          modalities: ["text", "audio"],
        },
      });
      console.log("Successfully connected to Realtime API");
    } catch (error) {
      console.error("Connection error details:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
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

