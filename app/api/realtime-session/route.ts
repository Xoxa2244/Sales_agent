import { NextRequest, NextResponse } from "next/server";

interface RealtimeSessionResponse {
  client_secret: {
    value: string;
  };
  id: string;
}

export async function POST(req: NextRequest) {
  try {
    const { instructions } = await req.json();

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
        // Additional session options can be added here if needed
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

    const data: RealtimeSessionResponse = await openaiResp.json();

    // Extract client secret and session ID from response
    const clientSecret = data.client_secret?.value;
    const sessionId = data.id;

    if (!clientSecret) {
      return NextResponse.json(
        { error: "Invalid client secret from OpenAI API" },
        { status: 500 }
      );
    }

    // Return both client secret and direct API key option
    // Note: For testing, we can also return the API key directly
    // In production, you should only use client secret
    return NextResponse.json(
      { 
        clientSecret, 
        sessionId,
        // Also return API key for direct connection (less secure but may work better)
        apiKey: apiKey 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

