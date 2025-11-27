"use client";

import {
  RealtimeAgent,
  RealtimeSession,
} from "@openai/agents/realtime";
import { AGENT_PERSONAS, AgentPersonaId } from "@/lib/agentPersonas";

export type VoiceAgentMode = "training" | "call";

export interface StartSessionOptions {
  instructions: string;
  mode: VoiceAgentMode;
  onTrainingSummary?: (summary: string) => void;
}

export class VoiceAgentSession {
  private session: RealtimeSession | null = null;

  async start(options: StartSessionOptions): Promise<void> {
    // 1. Load persona configuration first to get voice
    const stored = typeof window !== "undefined" ? localStorage.getItem("salesAgentConfig") : null;
    let personaId: AgentPersonaId = "ilona";
    let personaVoice = "mira"; // default for Ilona

    if (stored) {
      try {
        const config = JSON.parse(stored) as { personaId?: AgentPersonaId };
        if (config.personaId) {
          personaId = config.personaId;
        }
      } catch (e) {
        console.warn("Failed to parse config for persona:", e);
      }
    }

    const persona = AGENT_PERSONAS.find(p => p.id === personaId) || AGENT_PERSONAS[0];
    personaVoice = persona.voice;

    // Use the instructions passed from the page (which includes personaSystemPrompt)
    const finalInstructions = options.instructions || persona.defaultSystemPrompt;

    console.log("Creating session with persona:", persona.name, "voice:", personaVoice);
    console.log("Instructions length:", finalInstructions.length);

    // 2. Берём ephemeral clientSecret с бэкенда, передавая только instructions
    // Voice НЕ передаем в API route - вызывает 500 для некоторых голосов (mira, ember, copper)
    // Voice устанавливается только на клиенте через RealtimeAgent и session.connect()
    const res = await fetch("/api/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructions: finalInstructions,
        // voice не передаем - устанавливается на клиенте
      }),
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

    // 3. Создаём голосового агента (параметры уже переданы в API route, но нужны для RealtimeAgent)
    // Используем имя персоны как есть (Ilona), не lowercase
    const agent = new RealtimeAgent({
      name: persona.name, // Используем "Ilona" вместо "ilona"
      model: "gpt-4o-realtime-preview",
      instructions: finalInstructions,
      inputModalities: ["audio"],
      outputModalities: ["audio"],
      voice: personaVoice,
    } as any);

    // 4. Создаём сессию на базе агента
    const session = new RealtimeSession(agent);

    // 5. Подключаемся, используя ephemeral clientSecret как apiKey
    // Голос уже установлен в RealtimeAgent, но также пробуем через connect
    await session.connect({
      apiKey: clientSecret,
      // Пробуем установить голос через initialSessionConfig
      initialSessionConfig: {
        voice: personaVoice,
      },
    } as any);

    console.log("Realtime session connected with voice:", personaVoice);
    
    // Дополнительно пробуем установить голос через session.update() если доступно
    try {
      if (typeof (session as any).update === "function") {
        await (session as any).update({
          voice: personaVoice,
        });
        console.log("Voice updated via session.update()");
      }
    } catch (e) {
      console.warn("Could not update voice via session.update():", e);
    }

    // 5. Подписываемся на события для извлечения training summary (только в training режиме)
    if (options.mode === "training" && options.onTrainingSummary) {
      // Подписываемся на событие завершения ответа ассистента
      try {
        (session as any).on("response.completed", (event: any) => {
          const text: string =
            event?.response?.output_text ??
            event?.response?.message?.content ??
            event?.text ??
            "";

          if (!text) return;

          const startTag = "###TRAINING_SUMMARY_START";
          const endTag = "###TRAINING_SUMMARY_END";

          const start = text.indexOf(startTag);
          const end = text.indexOf(endTag);

          if (start !== -1 && end !== -1 && end > start) {
            const raw = text.substring(start + startTag.length, end).trim();
            options.onTrainingSummary?.(raw);
          }
        });
      } catch (e) {
        console.warn("Failed to subscribe to training summary events:", e);
      }
    }

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
