import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set" },
        { status: 500 }
      );
    }

    // Create Realtime session and get ephemeral client secret
    const openaiResp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview",
      }),
    });

    if (!openaiResp.ok) {
      const text = await openaiResp.text();
      console.error("OpenAI API error:", text);
      return NextResponse.json(
        { error: "Failed to create session", details: text },
        { status: openaiResp.status }
      );
    }

    const data = await openaiResp.json();

    // Extract client secret from response - handle different possible structures
    const clientSecret =
      data.client_secret?.value ?? data.client_secret ?? null;

    if (!clientSecret || typeof clientSecret !== "string") {
      return NextResponse.json(
        { error: "Invalid client secret from OpenAI", raw: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret });
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

