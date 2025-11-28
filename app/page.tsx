"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VoiceAgentSession } from "@/lib/realtimeClient";
import { patchRealtimeFetch } from "@/lib/patchRealtimeFetch";
import { AGENT_PERSONAS, AgentPersonaId } from "@/lib/agentPersonas";

interface SalesAgentConfig {
  guardrails?: string;
  agents?: {
    [key in AgentPersonaId]?: {
      shortDescription?: string;
      systemPrompt?: string;
    };
  };
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export default function HomePage() {
  const router = useRouter();
  const [selectedAgentId, setSelectedAgentId] = useState<AgentPersonaId>("ilona");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const sessionRef = useRef<VoiceAgentSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("isAuthenticated");
      if (auth === "true") {
        setIsAuthenticated(true);
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  // Patch fetch to add OpenAI-Beta header for realtime calls
  useEffect(() => {
    patchRealtimeFetch();
  }, []);

  const buildFinalInstructions = async (): Promise<string> => {
    const selectedAgent = AGENT_PERSONAS.find(p => p.id === selectedAgentId) || AGENT_PERSONAS[0];
    
    let agentSystemPrompt = selectedAgent.defaultSystemPrompt;
    let guardrails: string | undefined;

    try {
      // Try to load from server API first
      const res = await fetch("/api/config");
      if (res.ok) {
        const config: SalesAgentConfig = await res.json();
        guardrails = config.guardrails;
        
        // Get agent-specific prompt if exists
        if (config.agents?.[selectedAgentId]?.systemPrompt) {
          agentSystemPrompt = config.agents[selectedAgentId]!.systemPrompt!;
          console.log(`Using custom systemPrompt for ${selectedAgent.name}, length: ${agentSystemPrompt.length}`);
        } else {
          agentSystemPrompt = selectedAgent.defaultSystemPrompt;
          console.log(`Using default systemPrompt for ${selectedAgent.name}, length: ${agentSystemPrompt.length}`);
        }
      } else {
        throw new Error("Server config not available");
      }
    } catch (error) {
      // Fallback to localStorage
      console.warn("Failed to load config from server, using localStorage:", error);
      const stored = localStorage.getItem("salesAgentConfig");
      if (stored) {
        try {
          const config: SalesAgentConfig = JSON.parse(stored);
          guardrails = config.guardrails;
          
          if (config.agents?.[selectedAgentId]?.systemPrompt) {
            agentSystemPrompt = config.agents[selectedAgentId]!.systemPrompt!;
          }
        } catch (parseError) {
          console.error("Failed to parse stored config:", parseError);
        }
      }
    }

    let instructions = agentSystemPrompt;

    // Add guardrails if they exist
    if (guardrails && guardrails.trim()) {
      instructions = `${instructions}

# Guardrails

${guardrails}`;
      console.log("Added guardrails to instructions");
    }

    return instructions;
  };

  const handleStart = async () => {
    if (isRunning) return;

    try {
      setStatus("connecting");
      setIsRunning(true);

      const session = new VoiceAgentSession();
      const finalInstructions = await buildFinalInstructions();

      await session.start({
        instructions: finalInstructions,
        mode: "call",
        agentId: selectedAgentId,
      });

      sessionRef.current = session;
      setStatus("connected");
    } catch (error) {
      console.error("Failed to start session:", error);
              setStatus("disconnected");
              setIsRunning(false);
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
            } catch (error) {
              console.error("Failed to stop session:", error);
            }
  };

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  // Redirect if not authenticated (handled by useEffect, but just in case)
  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "3rem", fontSize: "2rem", fontWeight: "600", textAlign: "center" }}>
        Voice Sales Agent Demo
      </h1>

      {/* Agent Selection */}
      <div style={{ marginBottom: "3rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {AGENT_PERSONAS.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => !isRunning && setSelectedAgentId(agent.id)}
                style={{
                  width: "280px",
                  height: "200px",
                  padding: "1.5rem",
                  border: isSelected ? "3px solid #0070f3" : "2px solid #ddd",
                  borderRadius: "12px",
                  backgroundColor: isSelected ? "#f0f7ff" : "#fff",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  opacity: isRunning ? 0.6 : 1,
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: isSelected ? "0 4px 12px rgba(0, 112, 243, 0.15)" : "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <h3 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "0.75rem", color: "#333", flexShrink: 0 }}>
                  {agent.name}
                </h3>
                <div
                  className="agent-card-scroll"
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    paddingRight: "4px",
                  }}
                >
                  <p style={{ fontSize: "14px", color: "#666", margin: 0, lineHeight: "1.5" }}>
                    {agent.shortDescription}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Session Button */}
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
