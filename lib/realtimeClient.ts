"use client";

import {
  RealtimeAgent,
  RealtimeSession,
} from "@openai/agents/realtime";

export type VoiceAgentMode = "training" | "call";

export interface StartSessionOptions {
  instructions: string;
  mode: VoiceAgentMode;
}

export class VoiceAgentSession {
  private session: RealtimeSession | null = null;

  async start(options: StartSessionOptions): Promise<void> {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!apiKey || typeof apiKey !== "string") {
      throw new Error(
        "NEXT_PUBLIC_OPENAI_API_KEY is not set. Please configure it in Vercel env."
      );
    }

    console.log("Using OpenAI API key prefix:", apiKey.slice(0, 7)); // ожидаем 'sk-proj'

    const agent = new RealtimeAgent({
      name: "sales-demo-agent",
      model: "gpt-4o-realtime-preview",
      instructions:
        options.instructions ||
        "You are a friendly sales voice agent. Speak clearly and keep answers short.",
      inputModalities: ["audio"],
      outputModalities: ["audio"],
      voice: "alloy",
    } as any);

    const session = new RealtimeSession(agent);

    await session.connect({
      apiKey,
      // Явно просим использовать WebSocket-транспорт вместо WebRTC
      transport: "websocket",
    } as any);

    console.log("Realtime session connected");

    this.session = session;
  }

  async stop(): Promise<void> {
    if (this.session) {
      try {
        if (typeof (this.session as any).disconnect === "function") {
          await (this.session as any).disconnect();
        } else if (typeof (this.session as any).close === "function") {
          (this.session as any).close();
        }
      } catch (e) {
        console.warn("Error closing RealtimeSession:", e);
      }
      this.session = null;
    }
  }

  isConnected(): boolean {
    return this.session !== null;
  }
}

export function createVoiceAgentSession(): VoiceAgentSession {
  return new VoiceAgentSession();
}
