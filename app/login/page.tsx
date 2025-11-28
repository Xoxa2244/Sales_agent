"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const LOGIN = "Demo24";
const PASSWORD = "Qwerty4321!";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    if (typeof window !== "undefined") {
      const isAuth = sessionStorage.getItem("isAuthenticated");
      if (isAuth === "true") {
        router.push("/");
      }
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (login === LOGIN && password === PASSWORD) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("isAuthenticated", "true");
        router.push("/");
      }
    } else {
      setError("Invalid login or password");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h1 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600", textAlign: "center" }}>
          Login
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="login"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}
            >
              Login
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="password"
              style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "14px" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                backgroundColor: "#fee",
                color: "#dc3545",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

