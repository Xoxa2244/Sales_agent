"use client";

import { OpenAIRealtimeWebRTC } from "@openai/agents/realtime";

export type VoiceAgentMode = "training" | "call";

export interface StartSessionOptions {
  instructions: string;
  mode: VoiceAgentMode;
}

export class VoiceAgentSession {
  private client: OpenAIRealtimeWebRTC | null = null;
  private microphoneStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;

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
    const clientSecret: string = data.clientSecret;

    console.log("Received client secret:", !!clientSecret);
    console.log("Client secret length:", clientSecret?.length);

    if (!clientSecret || typeof clientSecret !== "string") {
      throw new Error("Invalid client secret from backend");
    }

    // 2. Get microphone stream
    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("Microphone stream obtained");
    } catch (error) {
      throw new Error(
        `Failed to access microphone: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // 3. Create audio element for output
    this.audioElement = new Audio();
    this.audioElement.autoplay = true;
    console.log("Audio element created");

    // 4. Create WebRTC client
    const client = new OpenAIRealtimeWebRTC();

    // 5. Connect to Realtime API using clientSecret (not apiKey)
    try {
      console.log("Attempting to connect to Realtime API...");
      
      await client.connect({
        apiKey: clientSecret, // Pass clientSecret as apiKey parameter
        model: "gpt-4o-mini-realtime-preview",
        initialSessionConfig: {
          instructions: options.instructions,
          voice: "alloy",
          modalities: ["audio", "text"],
          // turn_detection removed - not available in current type definitions
        },
      });
      console.log("Realtime connected OK");

      // 6. Set microphone stream and audio element if methods exist
      // Note: These methods may not exist in all versions - library may handle automatically
      try {
        if (this.microphoneStream && typeof (client as any).setMicrophoneStream === 'function') {
          (client as any).setMicrophoneStream(this.microphoneStream);
          console.log("Microphone stream set");
        }
      } catch (e) {
        console.warn("setMicrophoneStream not available, library may handle automatically");
      }

      try {
        if (this.audioElement && typeof (client as any).setAudioElement === 'function') {
          (client as any).setAudioElement(this.audioElement);
          console.log("Audio element set");
        }
      } catch (e) {
        console.warn("setAudioElement not available, library may handle automatically");
      }

      this.client = client;
    } catch (error) {
      console.error("Failed to connect to Realtime API:", error);
      
      // Cleanup on error
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach((track) => track.stop());
        this.microphoneStream = null;
      }
      
      throw new Error(
        `Failed to connect to Realtime API: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async stop(): Promise<void> {
    // Stop microphone stream
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }

    // Close client
    if (this.client) {
      this.client.close();
      this.client = null;
    }

    // Cleanup audio element
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
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

