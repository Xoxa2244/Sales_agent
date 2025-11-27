import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { instructions } = await req.json().catch(() => ({}));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set in environment variables");
    return NextResponse.json(
      { 
        error: "Missing OPENAI_API_KEY. Please set OPENAI_API_KEY in Vercel environment variables.",
        details: "The OPENAI_API_KEY environment variable is required on the server side."
      },
      { status: 500 }
    );
  }

  try {
    // Build session config with instructions only
    // Note: voice should be set on client side in RealtimeAgent, not in session creation
    const sessionConfig: any = {
      model: "gpt-4o-realtime-preview",
    };

    if (instructions && typeof instructions === "string") {
      sessionConfig.instructions = instructions;
    }

    // Voice is NOT set here - it should be set in RealtimeAgent on client side
    // Some voices may not be supported in /v1/realtime/sessions endpoint

    console.log("SERVER creating realtime session with:", {
      hasInstructions: !!sessionConfig.instructions,
      instructionsLength: sessionConfig.instructions?.length || 0,
      note: "voice will be set in RealtimeAgent on client",
    });

    // 1. Создаём realtime-сессию в OpenAI
    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify(sessionConfig),
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error("Realtime /sessions error:", resp.status, text);
      return NextResponse.json(
        {
          error: "Failed to create realtime session",
          details: text,
        },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);

    // ожидаемый формат:
    // { id: "sess_...", client_secret: { value: "rtm_...", ... }, ... }
    const clientSecret =
      data.client_secret?.value ?? data.client_secret ?? null;

    console.log("SERVER realtime session created:", {
      id: data.id,
      model: data.model,
      voice: data.voice || "not set in response",
      clientSecretPrefix:
        typeof clientSecret === "string" ? clientSecret.slice(0, 4) : null,
    });

    if (!clientSecret || typeof clientSecret !== "string") {
      console.error("Invalid client_secret payload:", data);
      return NextResponse.json(
        { error: "Invalid client_secret from OpenAI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret });
  } catch (e) {
    console.error("Error creating realtime session:", e);
    return NextResponse.json(
      { error: "Unexpected error creating realtime session" },
      { status: 500 }
    );
  }
}

