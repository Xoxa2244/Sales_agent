"use client";

import { OpenAIRealtimeWebRTC, RealtimeSession } from "@openai/agents/realtime";

export type VoiceAgentMode = "training" | "call";

export interface StartSessionOptions {
  instructions: string;
  mode: VoiceAgentMode;
}

export class VoiceAgentSession {
  private session: RealtimeSession | null = null;
  private transport: OpenAIRealtimeWebRTC | null = null;
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

    // 4. Create WebRTC transport with correct baseUrl
    try {
      console.log("Attempting to connect to Realtime API...");
      
      // Create transport with ephemeral key and correct baseUrl
      const transport = new OpenAIRealtimeWebRTC({
        apiKey: clientSecret,
        debug: true,
        // ВАЖНО: принудительно используем /v1/realtime вместо /v1/realtime/calls
        baseUrl: "https://api.openai.com/v1/realtime",
      } as any);

      // Create session with transport
      const session = new RealtimeSession({ transport });

      // Connect session (clientSecret уже используется в транспорте через apiKey)
      await session.connect({
        model: "gpt-4o-mini-realtime-preview",
        initialSessionConfig: {
          instructions: options.instructions,
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          modalities: ["audio", "text"],
        },
      } as any);

      console.log("Realtime connected OK");

      // 6. Set microphone stream and audio element if methods exist
      // Note: These methods may not exist in all versions - library may handle automatically
      try {
        if (this.microphoneStream && typeof (transport as any).setMicrophoneStream === 'function') {
          (transport as any).setMicrophoneStream(this.microphoneStream);
          console.log("Microphone stream set");
        }
      } catch (e) {
        console.warn("setMicrophoneStream not available, library may handle automatically");
      }

      try {
        if (this.audioElement && typeof (transport as any).setAudioElement === 'function') {
          (transport as any).setAudioElement(this.audioElement);
          console.log("Audio element set");
        }
      } catch (e) {
        console.warn("setAudioElement not available, library may handle automatically");
      }

      this.transport = transport;
      this.session = session;
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

    // Close session
    if (this.session) {
      try {
        await this.session.disconnect();
      } catch (e) {
        console.warn("Error disconnecting session:", e);
      }
      this.session = null;
    }

    // Close transport
    if (this.transport) {
      try {
        this.transport.close();
      } catch (e) {
        console.warn("Error closing transport:", e);
      }
      this.transport = null;
    }

    // Cleanup audio element
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  isConnected(): boolean {
    return this.session !== null;
  }
}

// Helper function to create a new session
export function createVoiceAgentSession(): VoiceAgentSession {
  return new VoiceAgentSession();
}

