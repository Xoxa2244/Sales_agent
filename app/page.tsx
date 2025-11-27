"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { VoiceAgentSession, VoiceAgentMode } from "@/lib/realtimeClient";
import { patchRealtimeFetch } from "@/lib/patchRealtimeFetch";
import {
  BASE_SALES_AGENT_PROMPT,
  TRAINING_MODE_PROMPT,
} from "@/lib/prompts";

interface LogEntry {
  type: "system" | "info" | "error";
  text: string;
  timestamp: Date;
}

interface SalesAgentConfig {
  guardrails?: string;
  baseSystemPrompt: string;
  personaId?: string;
  personaSystemPrompt?: string;
  trainingSummary?: string | null;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export default function HomePage() {
  const [mode, setMode] = useState<VoiceAgentMode>("training");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sessionRef = useRef<VoiceAgentSession | null>(null);
  const [trainingSummary, setTrainingSummary] = useState<string | null>(null);

  // Patch fetch to add OpenAI-Beta header for realtime calls
  useEffect(() => {
    patchRealtimeFetch();
  }, []);

  // Setup fetch interceptor for debugging Realtime API calls
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;

      window.fetch = async (...args) => {
        const [input, init] = args;
        const url = typeof input === "string" 
          ? input 
          : input instanceof URL 
          ? input.toString()
          : input instanceof Request
          ? input.url
          : String(input);

        if (url.includes("/v1/realtime/calls")) {
          console.log("[DEBUG] Realtime call request:", url, init);

          try {
            const response = await originalFetch(...args);
            const clone = response.clone();

            let text: string | undefined;
            try {
              text = await clone.text();
            } catch (e) {
              console.error("[DEBUG] Failed to read response text:", e);
            }

            console.log("[DEBUG] Realtime call response status:", response.status, response.statusText);
            console.log("[DEBUG] Realtime call response body:", text);
            if (text) {
              try {
                const jsonBody = JSON.parse(text);
                console.log("[DEBUG] Realtime call response body (parsed):", jsonBody);
              } catch (e) {
                // Not JSON, that's OK
              }
            }

            return response;
          } catch (e) {
            console.error("[DEBUG] Realtime call fetch error:", e);
            throw e;
          }
        }

        return originalFetch(...args);
      };

      // Cleanup on unmount
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, []);

  // Load training summary from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("salesAgentTrainingSummary");
    if (saved) setTrainingSummary(saved);
  }, []);

  const addLog = (type: LogEntry["type"], text: string) => {
    setLogs((prev) => [...prev, { type, text, timestamp: new Date() }]);
  };

  const buildFinalInstructions = (mode: VoiceAgentMode): string => {
    // Load config from localStorage
    const stored = localStorage.getItem("salesAgentConfig");
    let personaSystemPrompt: string | null = null;
    let personaId: string | undefined;

    if (stored) {
      try {
        const config: SalesAgentConfig = JSON.parse(stored);
        personaId = config.personaId;
        if (config.personaSystemPrompt) {
          personaSystemPrompt = config.personaSystemPrompt;
          console.log("Using personaSystemPrompt from config, length:", personaSystemPrompt.length);
        } else {
          console.log("No personaSystemPrompt in config, will use default from persona");
        }
      } catch (error) {
        console.error("Failed to parse stored config:", error);
      }
    } else {
      console.log("No config found in localStorage, will use default from persona");
    }
    
    // Если нет personaSystemPrompt в конфиге, используем дефолтный промпт персоны
    if (!personaSystemPrompt) {
      // Импортируем персоны для получения дефолтного промпта
      const { AGENT_PERSONAS } = require("@/lib/agentPersonas");
      const defaultPersonaId = personaId || "ilona";
      const defaultPersona = AGENT_PERSONAS.find((p: any) => p.id === defaultPersonaId) || AGENT_PERSONAS[0];
      personaSystemPrompt = defaultPersona.defaultSystemPrompt;
      console.log("Using default personaSystemPrompt for:", defaultPersona.name);
    }

    let instructions = personaSystemPrompt;

    if (mode === "training") {
      instructions = `${personaSystemPrompt}\n\n${TRAINING_MODE_PROMPT}`;
    } else {
      if (trainingSummary) {
        instructions = `${personaSystemPrompt}

### Product & Customer Profile (from training)

${trainingSummary}

Use this configuration as ground truth about the offer, target customers, lead source and temperature, objections and call goal. Do not repeat the training, speak as a normal sales agent to the caller.`;
      } else {
        instructions = `${personaSystemPrompt}

No product-specific training data is available. Start the call by quickly clarifying what we sell, who the caller is and what they are looking for, then proceed as a generic sales agent.`;
      }
    }

    return instructions;
  };

  const handleStart = async () => {
    if (isRunning) return;

    try {
      setStatus("connecting");
      setIsRunning(true);
      addLog("system", "Starting session...");

      const session = new VoiceAgentSession();
      const finalInstructions = buildFinalInstructions(mode);

      await session.start({
        instructions: finalInstructions,
        mode,
        onTrainingSummary:
          mode === "training"
            ? (summary) => {
                setTrainingSummary(summary);
                if (typeof window !== "undefined") {
                  // Save to both places for compatibility
                  window.localStorage.setItem(
                    "salesAgentTrainingSummary",
                    summary
                  );
                  // Also update the config
                  const stored = localStorage.getItem("salesAgentConfig");
                  if (stored) {
                    try {
                      const config: SalesAgentConfig = JSON.parse(stored);
                      config.trainingSummary = summary;
                      localStorage.setItem("salesAgentConfig", JSON.stringify(config));
                    } catch (e) {
                      console.warn("Failed to update config with training summary:", e);
                    }
                  }
                }
                addLog(
                  "system",
                  "Training profile saved. You can now switch to Call simulation mode."
                );
              }
            : undefined,
      });

      sessionRef.current = session;
      setStatus("connected");
      addLog("system", `Session started in ${mode} mode`);
    } catch (error) {
      console.error("Failed to start session:", error);
      setStatus("disconnected");
      setIsRunning(false);
      addLog(
        "error",
        `Failed to start session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleStop = async () => {
    if (!isRunning) return;

    try {
      if (sessionRef.current) {
        await sessionRef.current.stop();
        sessionRef.current = null;
      }
      setStatus("disconnected");
      setIsRunning(false);
      addLog("system", "Session stopped");
    } catch (error) {
      console.error("Failed to stop session:", error);
      addLog(
        "error",
        `Failed to stop session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "600" }}>
        Voice Sales Agent Demo
      </h1>

      {/* Mode Selector - Large Toggle */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => setMode("training")}
            disabled={isRunning}
            style={{
              flex: 1,
              padding: "1rem 2rem",
              fontSize: "18px",
              fontWeight: "600",
              backgroundColor: mode === "training" ? "#0070f3" : "#f5f5f5",
              color: mode === "training" ? "white" : "#333",
              border: mode === "training" ? "none" : "2px solid #ddd",
              borderRadius: "8px",
              cursor: isRunning ? "not-allowed" : "pointer",
              opacity: isRunning ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            Training
          </button>
          <button
            onClick={() => setMode("call")}
            disabled={isRunning}
            style={{
              flex: 1,
              padding: "1rem 2rem",
              fontSize: "18px",
              fontWeight: "600",
              backgroundColor: mode === "call" ? "#0070f3" : "#f5f5f5",
              color: mode === "call" ? "white" : "#333",
              border: mode === "call" ? "none" : "2px solid #ddd",
              borderRadius: "8px",
              cursor: isRunning ? "not-allowed" : "pointer",
              opacity: isRunning ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            Call simulation
          </button>
        </div>
      </div>

      {/* Start/Stop Button */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={status === "connecting"}
          style={{
            padding: "1rem 3rem",
            fontSize: "18px",
            fontWeight: "600",
            backgroundColor: isRunning ? "#dc3545" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: status === "connecting" ? "wait" : "pointer",
            opacity: status === "connecting" ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {isRunning ? "Stop session" : "Start session"}
        </button>

        <div
          style={{
            marginTop: "0.75rem",
            fontSize: "14px",
            color: status === "connected" ? "#28a745" : status === "connecting" ? "#ffc107" : "#6c757d",
            fontWeight: "500",
          }}
        >
          {status === "disconnected" && "Disconnected"}
          {status === "connecting" && "Connecting..."}
          {status === "connected" && "Connected"}
        </div>
      </div>

      {/* Session Logs */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: "600" }}>
          Session Logs
        </h2>
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "1rem",
            maxHeight: "400px",
            overflowY: "auto",
            fontSize: "14px",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "#999", textAlign: "center", padding: "2rem" }}>
              No logs yet. Start a session to see activity.
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor:
                    log.type === "error"
                      ? "#fee"
                      : log.type === "system"
                      ? "#eef"
                      : "#f9f9f9",
                  borderRadius: "4px",
                }}
              >
                <span style={{ color: "#999", fontSize: "12px" }}>
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontWeight: log.type === "error" ? "500" : "normal",
                    color: log.type === "error" ? "#dc3545" : "#333",
                  }}
                >
                  [{log.type.toUpperCase()}] {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Link to Admin */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <Link
          href="/admin"
          style={{
            color: "#0070f3",
            textDecoration: "underline",
            fontSize: "14px",
          }}
        >
          → Configure Agent Settings
        </Link>
      </div>
    </div>
  );
}
