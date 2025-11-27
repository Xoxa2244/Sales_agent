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
    // 1. Берём ephemeral clientSecret с бэкенда
    const res = await fetch("/api/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // пока без доп. параметров
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

    // 2. Создаём голосового агента
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

    // 3. Создаём сессию на базе агента
    const session = new RealtimeSession(agent);

    // 4. Подключаемся, используя ephemeral clientSecret как apiKey
    await session.connect({
      apiKey: clientSecret,
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
