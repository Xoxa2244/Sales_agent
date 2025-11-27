"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AGENT_PERSONAS, AgentPersonaId, type AgentPersona } from "@/lib/agentPersonas";

interface SalesAgentConfig {
  goal: string;
  allowedTopics: string;
  forbiddenTopics: string;
  baseSystemPrompt: string;
  personaId?: AgentPersonaId;
  personaSystemPrompt?: string;
  trainingSummary?: string | null;
}

const defaultConfig: SalesAgentConfig = {
  goal: "Schedule a demo meeting with potential clients interested in our product.",
  allowedTopics: "Product features, pricing, benefits, use cases, scheduling availability, company background.",
  forbiddenTopics: "Personal information requests, financial details beyond pricing, competitor comparisons.",
  baseSystemPrompt: "You are a professional sales agent. Your goal is to qualify leads and schedule demo meetings. Be friendly, professional, and goal-oriented.",
  personaId: "ilona",
  personaSystemPrompt: AGENT_PERSONAS.find(p => p.id === "ilona")?.defaultSystemPrompt || "",
  trainingSummary: null,
};

export default function AdminPage() {
  const [config, setConfig] = useState<SalesAgentConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // Load config from localStorage on mount
    const stored = localStorage.getItem("salesAgentConfig");
    const trainingSummary = localStorage.getItem("salesAgentTrainingSummary");
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SalesAgentConfig;
        // If persona is set but no personaSystemPrompt, use default
        if (parsed.personaId && !parsed.personaSystemPrompt) {
          const persona = AGENT_PERSONAS.find(p => p.id === parsed.personaId);
          if (persona) {
            parsed.personaSystemPrompt = persona.defaultSystemPrompt;
          }
        }
        setConfig({
          ...parsed,
          trainingSummary: parsed.trainingSummary || trainingSummary || null,
        });
      } catch (error) {
        console.error("Failed to parse stored config:", error);
      }
    } else {
      // Initialize with default persona
      const defaultPersona = AGENT_PERSONAS.find(p => p.id === defaultConfig.personaId) || AGENT_PERSONAS[0];
      setConfig({
        ...defaultConfig,
        personaSystemPrompt: defaultPersona.defaultSystemPrompt,
        trainingSummary: trainingSummary || null,
      });
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("salesAgentConfig", JSON.stringify(config));
      if (config.trainingSummary) {
        localStorage.setItem("salesAgentTrainingSummary", config.trainingSummary);
      }
      setSaved(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Failed to save configuration");
    }
  };

  const handlePersonaChange = (personaId: AgentPersonaId) => {
    // Only allow changing to active personas
    if (personaId !== "ilona") return;
    
    const persona = AGENT_PERSONAS.find(p => p.id === personaId);
    if (!persona) return;

    // Check if current system prompt differs from default
    const currentPrompt = config.personaSystemPrompt || 
      (config.personaId ? AGENT_PERSONAS.find(p => p.id === config.personaId)?.defaultSystemPrompt : "");
    const newDefaultPrompt = persona.defaultSystemPrompt;

    if (hasUnsavedChanges && currentPrompt !== newDefaultPrompt && currentPrompt !== config.personaSystemPrompt) {
      const confirmed = window.confirm(
        "Switching persona will reset the system prompt to the default for the new persona. Your custom text will be lost. Continue?"
      );
      if (!confirmed) return;
    }

    setConfig((prev) => ({
      ...prev,
      personaId,
      personaSystemPrompt: persona.defaultSystemPrompt,
    }));
    setHasUnsavedChanges(false);
  };

  const handleSystemPromptChange = (value: string) => {
    setConfig((prev) => ({
      ...prev,
      personaSystemPrompt: value,
    }));
    setHasUnsavedChanges(true);
  };

  const selectedPersona = AGENT_PERSONAS.find(p => p.id === (config.personaId || "ilona")) || AGENT_PERSONAS[0];

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "600" }}>
        Sales Agent Configuration
      </h1>

      {/* Voice Persona Selector */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
          Voice Persona
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          {AGENT_PERSONAS.map((persona) => {
            const isSelected = config.personaId === persona.id;
            const isActive = persona.id === "ilona"; // Only Ilona is active for now
            return (
              <div
                key={persona.id}
                onClick={isActive ? () => handlePersonaChange(persona.id) : undefined}
                style={{
                  padding: "1.5rem",
                  border: isSelected ? "2px solid #0070f3" : "2px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: isSelected ? "#f0f7ff" : isActive ? "#fff" : "#f5f5f5",
                  cursor: isActive ? "pointer" : "not-allowed",
                  opacity: isActive ? 1 : 0.5,
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: isActive ? "#333" : "#999" }}>
                    {persona.name}
                  </h3>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {!isActive && (
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#999",
                          color: "white",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "500",
                        }}
                      >
                        Coming soon
                      </span>
                    )}
                    {isSelected && isActive && (
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#0070f3",
                          color: "white",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        Selected
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "14px", color: isActive ? "#666" : "#999", marginBottom: "0.5rem" }}>
                  {persona.label}
                </div>
                <div style={{ fontSize: "13px", color: isActive ? "#888" : "#bbb" }}>
                  {persona.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Prompt Editor */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
          Base system prompt for {selectedPersona.name}
        </h2>
        <textarea
          value={config.personaSystemPrompt || selectedPersona.defaultSystemPrompt}
          onChange={(e) => handleSystemPromptChange(e.target.value)}
          rows={12}
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

      {/* Legacy fields (can be hidden or kept) */}
      <div style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
        <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: "600" }}>
          Additional Settings
        </h3>
        
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="goal"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Goal
          </label>
          <textarea
            id="goal"
            value={config.goal}
            onChange={(e) => setConfig((prev) => ({ ...prev, goal: e.target.value }))}
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="allowedTopics"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Allowed Topics
          </label>
          <textarea
            id="allowedTopics"
            value={config.allowedTopics}
            onChange={(e) => setConfig((prev) => ({ ...prev, allowedTopics: e.target.value }))}
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="forbiddenTopics"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Forbidden Topics
          </label>
          <textarea
            id="forbiddenTopics"
            value={config.forbiddenTopics}
            onChange={(e) => setConfig((prev) => ({ ...prev, forbiddenTopics: e.target.value }))}
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
        </div>
      </div>

      {/* Training Summary Display */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
          Training notes from voice session
        </h2>
        <textarea
          value={config.trainingSummary || ""}
          readOnly
          rows={8}
          placeholder="No training data yet — run a Training session and let the agent summarize your product and ICP."
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "monospace",
            backgroundColor: "#f9f9f9",
            color: config.trainingSummary ? "#333" : "#999",
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
