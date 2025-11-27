"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { VoiceAgentSession, VoiceAgentMode } from "@/lib/realtimeClient";

interface LogEntry {
  type: "system" | "info" | "error";
  text: string;
  timestamp: Date;
}

interface AgentConfig {
  goal: string;
  allowedTopics: string;
  forbiddenTopics: string;
  baseSystemPrompt: string;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export default function HomePage() {
  const [mode, setMode] = useState<VoiceAgentMode>("training");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sessionRef = useRef<VoiceAgentSession | null>(null);

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

            console.log("[DEBUG] Realtime call response:", {
              status: response.status,
              statusText: response.statusText,
              body: text,
            });

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

  // Load config from localStorage and build default system prompt
  useEffect(() => {
    const stored = localStorage.getItem("salesAgentConfig");
    let defaultPrompt = "";

    if (stored) {
      try {
        const config: AgentConfig = JSON.parse(stored);
        defaultPrompt = `${config.baseSystemPrompt}\n\nGoal: ${config.goal}\n\nAllowed topics: ${config.allowedTopics}\n\nForbidden topics: ${config.forbiddenTopics}`;
      } catch (error) {
        console.error("Failed to parse stored config:", error);
        defaultPrompt = "You are a professional sales agent. Be friendly and helpful.";
      }
    } else {
      defaultPrompt = "You are a professional sales agent. Be friendly and helpful.";
    }

    setSystemPrompt(defaultPrompt);
  }, []);

  const addLog = (type: LogEntry["type"], text: string) => {
    setLogs((prev) => [...prev, { type, text, timestamp: new Date() }]);
  };

  const buildFinalInstructions = (prompt: string, mode: VoiceAgentMode): string => {
    const modeInstruction =
      mode === "training"
        ? "\n\nСейчас человек обучает тебя и рассказывает правила. Отвечай кратко, подтверждай, что понял, можно задавать уточняющие вопросы."
        : "\n\nСейчас человек играет роль клиента, а ты — сейлз-агент. Веди себя как в реальном звонке: уточняй потребности, квалифицируй лида, старайся привести к назначению демо-встречи.";

    return `${prompt}${modeInstruction}`;
  };

  const handleStart = async () => {
    if (isRunning) return;

    try {
      setStatus("connecting");
      setIsRunning(true);
      addLog("system", "Starting session...");

      const session = new VoiceAgentSession();
      const finalInstructions = buildFinalInstructions(systemPrompt, mode);

      await session.start({
        instructions: finalInstructions,
        mode,
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
      <h1 style={{ marginBottom: "2rem" }}>Voice Sales Agent Demo</h1>

      {/* Mode Toggle */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
          Mode
        </label>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => setMode("training")}
            disabled={isRunning}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: mode === "training" ? "#0070f3" : "#e0e0e0",
              color: mode === "training" ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: isRunning ? "not-allowed" : "pointer",
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            Training
          </button>
          <button
            onClick={() => setMode("call")}
            disabled={isRunning}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: mode === "call" ? "#0070f3" : "#e0e0e0",
              color: mode === "call" ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: isRunning ? "not-allowed" : "pointer",
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            Call simulation
          </button>
        </div>
      </div>

      {/* System Prompt */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          htmlFor="systemPrompt"
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
        >
          System prompt
        </label>
        <textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={isRunning}
          rows={8}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "monospace",
            opacity: isRunning ? 0.6 : 1,
          }}
        />
      </div>

      {/* Start/Stop Button */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={status === "connecting"}
          style={{
            padding: "0.75rem 2rem",
            backgroundColor: isRunning ? "#dc3545" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: status === "connecting" ? "wait" : "pointer",
            opacity: status === "connecting" ? 0.6 : 1,
          }}
        >
          {isRunning ? "Stop session" : "Start session"}
        </button>

        <span
          style={{
            marginLeft: "1rem",
            fontSize: "14px",
            color: status === "connected" ? "#28a745" : status === "connecting" ? "#ffc107" : "#6c757d",
            fontWeight: "500",
          }}
        >
          {status === "disconnected" && "Disconnected"}
          {status === "connecting" && "Connecting..."}
          {status === "connected" && "Connected"}
        </span>
      </div>

      {/* Logs */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Session Logs</h2>
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "1rem",
            maxHeight: "400px",
            overflowY: "auto",
            fontSize: "14px",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "#999" }}>No logs yet. Start a session to see activity.</div>
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

      {/* Admin Link */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          href="/admin"
          style={{
            color: "#0070f3",
            textDecoration: "underline",
          }}
        >
          → Configure Agent Settings
        </Link>
      </div>
    </div>
  );
}

