"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AgentConfig {
  goal: string;
  allowedTopics: string;
  forbiddenTopics: string;
  baseSystemPrompt: string;
}

const defaultConfig: AgentConfig = {
  goal: "Schedule a demo meeting with potential clients interested in our product.",
  allowedTopics: "Product features, pricing, benefits, use cases, scheduling availability, company background.",
  forbiddenTopics: "Personal information requests, financial details beyond pricing, competitor comparisons.",
  baseSystemPrompt: "You are a professional sales agent. Your goal is to qualify leads and schedule demo meetings. Be friendly, professional, and goal-oriented.",
};

export default function AdminPage() {
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load config from localStorage on mount
    const stored = localStorage.getItem("salesAgentConfig");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AgentConfig;
        setConfig(parsed);
      } catch (error) {
        console.error("Failed to parse stored config:", error);
      }
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("salesAgentConfig", JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Failed to save configuration");
    }
  };

  const handleChange = (field: keyof AgentConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "2rem" }}>Sales Agent Configuration</h1>

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
          onChange={(e) => handleChange("goal", e.target.value)}
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
          onChange={(e) => handleChange("allowedTopics", e.target.value)}
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
          onChange={(e) => handleChange("forbiddenTopics", e.target.value)}
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
          htmlFor="baseSystemPrompt"
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
        >
          Base System Prompt
        </label>
        <textarea
          id="baseSystemPrompt"
          value={config.baseSystemPrompt}
          onChange={(e) => handleChange("baseSystemPrompt", e.target.value)}
          rows={5}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>

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
        }}
      >
        Save
      </button>

      {saved && (
        <span
          style={{
            marginLeft: "1rem",
            color: "#0070f3",
            fontWeight: "500",
          }}
        >
          Saved!
        </span>
      )}

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

