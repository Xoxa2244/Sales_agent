"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { VoiceAgentSession } from "@/lib/realtimeClient";
import { patchRealtimeFetch } from "@/lib/patchRealtimeFetch";

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
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export default function HomePage() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sessionRef = useRef<VoiceAgentSession | null>(null);

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


  const addLog = (type: LogEntry["type"], text: string) => {
    setLogs((prev) => [...prev, { type, text, timestamp: new Date() }]);
  };

  const buildFinalInstructions = (): string => {
    // Load config from localStorage
    const stored = localStorage.getItem("salesAgentConfig");
    let personaSystemPrompt: string = "";
    let personaId: string | undefined;
    let guardrails: string | undefined;

    if (stored) {
      try {
        const config: SalesAgentConfig = JSON.parse(stored);
        personaId = config.personaId;
        guardrails = config.guardrails;
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

    // Добавляем guardrails если они есть
    if (guardrails && guardrails.trim()) {
      instructions = `${instructions}

# Guardrails

${guardrails}`;
      console.log("Added guardrails to instructions, length:", guardrails.length);
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
      const finalInstructions = buildFinalInstructions();

      await session.start({
        instructions: finalInstructions,
        mode: "call",
      });

      sessionRef.current = session;
      setStatus("connected");
      addLog("system", "Session started");
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
      <h1 style={{ marginBottom: "3rem", fontSize: "2rem", fontWeight: "600", textAlign: "center" }}>
        Voice Sales Agent Demo
      </h1>

      {/* Start Session Button - Large Square with Gradient */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "center" }}>
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={status === "connecting"}
          style={{
            width: "280px",
            height: "280px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontSize: "20px",
            fontWeight: "600",
            color: "white",
            border: "none",
            borderRadius: "16px",
            cursor: status === "connecting" ? "wait" : "pointer",
            opacity: status === "connecting" ? 0.6 : 1,
            transition: "all 0.3s",
            boxShadow: isRunning 
              ? "0 4px 20px rgba(220, 53, 69, 0.4)" 
              : "0 4px 20px rgba(0, 112, 243, 0.4)",
            background: isRunning
              ? "linear-gradient(135deg, #dc3545 0%, #c82333 100%)"
              : "linear-gradient(135deg, #0070f3 0%, #0051cc 100%)",
          }}
        >
          {isRunning ? (
            <>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>Stop Session</span>
            </>
          ) : (
            <>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span>Start Session</span>
            </>
          )}
        </button>
      </div>

      {/* Status Indicator */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <div
          style={{
            fontSize: "16px",
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
