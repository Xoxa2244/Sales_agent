"use client";

import {
  RealtimeAgent,
  RealtimeSession,
} from "@openai/agents/realtime";
import { AGENT_PERSONAS, AgentPersonaId } from "@/lib/agentPersonas";

export interface StartSessionOptions {
  instructions: string;
  mode?: "call"; // Only call mode is supported now
  agentId?: AgentPersonaId;
}

export class VoiceAgentSession {
  private session: RealtimeSession | null = null;

  async start(options: StartSessionOptions): Promise<void> {
    // 1. Load persona configuration first to get voice
    const stored = typeof window !== "undefined" ? localStorage.getItem("salesAgentConfig") : null;
    let personaId: AgentPersonaId = options.agentId || "ilona";
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

    // Use agentId from options if provided
    if (options.agentId) {
      personaId = options.agentId;
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
    // Устанавливаем голос через initialSessionConfig, чтобы он применился к уже созданной сессии
    await session.connect({
      apiKey: clientSecret,
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

