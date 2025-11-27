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
    const apiKey = data.apiKey; // Direct API key from server

    console.log("Received client secret:", clientSecret ? "present" : "missing");
    console.log("Session ID:", sessionId);

    // Try using direct API key first (more reliable with current library)
    // If client secret doesn't work, fall back to direct API key
    const keyToUse = apiKey || clientSecret;

    if (!keyToUse) {
      throw new Error("Invalid credentials from backend");
    }

    // 2. Create WebRTC client
    const client = new OpenAIRealtimeWebRTC();

    // 3. Connect to Realtime API
    // Try using direct API key instead of client secret
    // The library may not properly support client secret from sessions
    try {
      console.log("Attempting to connect...");
      console.log("Using:", apiKey ? "direct API key" : "client secret");
      
      await client.connect({
        apiKey: keyToUse,
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

