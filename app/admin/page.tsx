"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AgentPersonaId>("ilona");
  const [config, setConfig] = useState<SalesAgentConfig>({
    guardrails: "",
    agents: {},
  });
  const [saved, setSaved] = useState(false);
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

  useEffect(() => {
    // Load config from server API
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const serverConfig = await res.json() as SalesAgentConfig;
          setConfig(serverConfig);
        } else {
          // Fallback to localStorage if server fails
          const stored = localStorage.getItem("salesAgentConfig");
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as SalesAgentConfig;
              setConfig(parsed);
            } catch (error) {
              console.error("Failed to parse stored config:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load config from server:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem("salesAgentConfig");
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as SalesAgentConfig;
            setConfig(parsed);
          } catch (error) {
            console.error("Failed to parse stored config:", error);
          }
        }
      }
    };
    
    loadConfig();
  }, []);

  const handleSave = async () => {
    try {
      // Save to server API
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        // Also save to localStorage as backup
        localStorage.setItem("salesAgentConfig", JSON.stringify(config));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        // Fallback to localStorage if server fails
        localStorage.setItem("salesAgentConfig", JSON.stringify(config));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        console.warn("Server save failed, saved to localStorage only");
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      // Fallback to localStorage
      try {
        localStorage.setItem("salesAgentConfig", JSON.stringify(config));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        console.warn("Server save failed, saved to localStorage only");
      } catch (localError) {
        alert("Failed to save configuration");
      }
    }
  };

  const getCurrentAgentConfig = () => {
    return config.agents?.[activeTab] || {};
  };

  const updateAgentConfig = (updates: { shortDescription?: string; systemPrompt?: string }) => {
    setConfig((prev) => ({
      ...prev,
      agents: {
        ...prev.agents,
        [activeTab]: {
          ...getCurrentAgentConfig(),
          ...updates,
        },
      },
    }));
  };

  const currentAgent = AGENT_PERSONAS.find(p => p.id === activeTab) || AGENT_PERSONAS[0];
  const agentConfig = getCurrentAgentConfig();

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
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "600" }}>
        Agent Configuration
      </h1>

      {/* Tabs */}
      <div style={{ marginBottom: "2rem", borderBottom: "2px solid #ddd" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          {AGENT_PERSONAS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setActiveTab(agent.id)}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "16px",
                fontWeight: "600",
                backgroundColor: "transparent",
                color: activeTab === agent.id ? "#0070f3" : "#666",
                border: "none",
                borderBottom: activeTab === agent.id ? "3px solid #0070f3" : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {agent.name}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Configuration */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
          {currentAgent.name}
        </h2>

        {/* Short Description */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="shortDescription"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Short Description
          </label>
          <textarea
            id="shortDescription"
            value={agentConfig.shortDescription || currentAgent.shortDescription}
            onChange={(e) => updateAgentConfig({ shortDescription: e.target.value })}
            rows={2}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
        </div>

        {/* System Prompt */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="systemPrompt"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            System Prompt
          </label>
          <textarea
            id="systemPrompt"
            value={agentConfig.systemPrompt || currentAgent.defaultSystemPrompt}
            onChange={(e) => updateAgentConfig({ systemPrompt: e.target.value })}
            rows={15}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              fontFamily: "monospace",
            }}
          />
        </div>
      </div>

      {/* Guardrails */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
          Guardrails
        </h2>
        <textarea
          value={config.guardrails || ""}
          onChange={(e) => setConfig((prev) => ({ ...prev, guardrails: e.target.value }))}
          rows={8}
          placeholder="Define rules and constraints for all agents. For example:&#10;- Do not discuss pricing without approval&#10;- Never make promises about delivery dates&#10;- Always verify customer information before proceeding"
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "monospace",
          }}
        />
      </div>

      {/* Save Button */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={handleSave}
          style={{
            padding: "0.75rem 2rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Save
        </button>

        {saved && (
          <span
            style={{
              marginLeft: "1rem",
              color: "#28a745",
              fontWeight: "500",
            }}
          >
            Settings saved!
          </span>
        )}
      </div>

      {/* Back Link */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          href="/"
          style={{
            color: "#0070f3",
            textDecoration: "underline",
          }}
        >
          ← Back to Demo
        </Link>
      </div>
    </div>
  );
}
