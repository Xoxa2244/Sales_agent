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
    let personaVoice = "sage"; // default for Ilona

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
    console.log("Instructions preview (first 200 chars):", finalInstructions.substring(0, 200));
    console.log("Instructions contains 'Ilona':", finalInstructions.includes("Ilona"));
    console.log("Instructions contains 'greet first':", finalInstructions.includes("greet first") || finalInstructions.includes("Always greet"));

    // 2. Берём ephemeral clientSecret с бэкенда, передавая instructions и voice
    // Voice передаем в API route для sage (поддерживается), для других голосов это вызывает 500
    const res = await fetch("/api/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructions: finalInstructions,
        voice: personaVoice, // Передаем voice для sage (работает через API route)
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

    // 3. Создаём голосового агента
    // ВАЖНО: instructions должны быть установлены и в RealtimeAgent, и переданы в API route
    // Используем имя персоны как есть (Ilona), не lowercase
    console.log("Creating RealtimeAgent with instructions length:", finalInstructions.length);
    const agent = new RealtimeAgent({
      name: persona.name, // Используем "Ilona" вместо "ilona"
      model: "gpt-4o-realtime-preview",
      instructions: finalInstructions, // КРИТИЧНО: инструкции должны быть здесь
      inputModalities: ["audio"],
      outputModalities: ["audio"],
      voice: personaVoice,
    } as any);
    
    console.log("RealtimeAgent created, checking if instructions are set:", !!agent);

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
      // Подписываемся на различные события для получения текста ответа
      try {
        // Пробуем разные варианты событий
        const eventHandlers = [
          "response.completed",
          "response_done",
          "response.finished",
          "message.completed",
          "output.completed",
          "response_text.delta",
          "response_text.done",
        ];

        eventHandlers.forEach((eventName) => {
          try {
            (session as any).on(eventName, (event: any) => {
              console.log(`[TRAINING] Event ${eventName} received:`, event);
              
              // Пробуем разные пути к тексту
              const text: string =
                event?.response?.output_text ??
                event?.response?.message?.content ??
                event?.response?.text ??
                event?.output_text ??
                event?.message?.content ??
                event?.content ??
                event?.text ??
                event?.data?.text ??
                (typeof event === "string" ? event : "");

              if (!text || typeof text !== "string") {
                console.log(`[TRAINING] No text found in event ${eventName}`);
                return;
              }

              console.log(`[TRAINING] Text from ${eventName}:`, text.substring(0, 200));

              const startTag = "###TRAINING_SUMMARY_START";
              const endTag = "###TRAINING_SUMMARY_END";

              const start = text.indexOf(startTag);
              const end = text.indexOf(endTag);

              if (start !== -1 && end !== -1 && end > start) {
                const raw = text.substring(start + startTag.length, end).trim();
                console.log("[TRAINING] Found training summary:", raw.substring(0, 100));
                options.onTrainingSummary?.(raw);
              } else {
                console.log(`[TRAINING] Tags not found in text. Start: ${start}, End: ${end}`);
              }
            });
          } catch (e) {
            // Игнорируем ошибки для несуществующих событий
          }
        });

        // Также пробуем через agent события
        try {
          (agent as any).on?.("response", (event: any) => {
            console.log("[TRAINING] Agent response event:", event);
            const text = event?.text ?? event?.content ?? "";
            if (text) {
              const startTag = "###TRAINING_SUMMARY_START";
              const endTag = "###TRAINING_SUMMARY_END";
              const start = text.indexOf(startTag);
              const end = text.indexOf(endTag);
              if (start !== -1 && end !== -1 && end > start) {
                const raw = text.substring(start + startTag.length, end).trim();
                console.log("[TRAINING] Found training summary from agent:", raw.substring(0, 100));
                options.onTrainingSummary?.(raw);
              }
            }
          });
        } catch (e) {
          console.warn("[TRAINING] Could not subscribe to agent events:", e);
        }
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
