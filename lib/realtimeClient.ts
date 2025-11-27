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

    if (!clientSecret) {
      throw new Error("Invalid client secret from backend");
    }

    // 2. Create WebRTC client
    const client = new OpenAIRealtimeWebRTC();

    // 3. Connect to Realtime API
    await client.connect({
      apiKey: clientSecret,
      model: "gpt-4o-mini-realtime-preview",
      initialSessionConfig: {
        instructions: options.instructions,
        voice: "alloy",
        modalities: ["text", "audio"],
        // VAD and other settings can be added here if needed
      },
    });

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

