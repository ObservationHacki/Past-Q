import { NextResponse } from "next/server";

// Snwolley API runs binary (audio) handling, so use the Node.js runtime.
export const runtime = "nodejs";

const STT_URL = "https://v1.snwolley.ai/api/v1/hackathon/stt";
const TTS_URL = "https://v1.snwolley.ai/api/v1/hackathon/tts";
const CHAT_URL = "https://v1.snwolley.ai/v1/chat/completions";

const RAW_API_KEY = process.env.SNWOLLEY_API_KEY?.trim();
// Treat the template placeholder as "not configured" so the UI shows a clear
// message instead of sending an invalid token upstream.
const API_KEY =
  RAW_API_KEY && RAW_API_KEY !== "your-snwolley-api-key" ? RAW_API_KEY : undefined;
const CHAT_MODEL = process.env.SNWOLLEY_MODEL ?? "snwolley-chat";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  return { Authorization: `Bearer ${API_KEY}`, ...extra };
}

export async function POST(request: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      {
        error:
          "Voice mode needs a Snwolley API key. Add SNWOLLEY_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  const action = new URL(request.url).searchParams.get("action");

  try {
    switch (action) {
      case "stt":
        return await handleStt(request);
      case "tts":
        return await handleTts(request);
      case "chat":
        return await handleChat(request);
      default:
        return NextResponse.json(
          { error: "Unknown action. Use ?action=stt|tts|chat." },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error(`voice proxy (${action}) failed:`, err);
    return NextResponse.json(
      { error: "The voice service is unavailable right now." },
      { status: 502 },
    );
  }
}

/** Speech-to-text: accepts multipart form-data with an `audio` blob. */
async function handleStt(request: Request) {
  const form = await request.formData();
  const audio = form.get("audio");

  if (!(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing `audio` file in form data." },
      { status: 400 },
    );
  }

  const upstreamForm = new FormData();
  upstreamForm.append("audio", audio, "answer.webm");

  const res = await fetch(STT_URL, {
    method: "POST",
    headers: authHeaders(),
    body: upstreamForm,
  });

  const raw = await res.text();
  const data = safeJson(raw);

  if (!res.ok) {
    return NextResponse.json(
      { error: extractError(data) ?? raw ?? "Transcription failed." },
      { status: res.status },
    );
  }

  // Normalize across likely response shapes (Snwolley / bridge APIs vary).
  const text =
    data?.text ??
    data?.transcript ??
    data?.transcription ??
    data?.result ??
    data?.data?.text ??
    data?.results?.[0]?.alternatives?.[0]?.transcript ??
    data?.alternatives?.[0]?.transcript ??
    (typeof data === "string" ? data : "");

  return NextResponse.json({ text: typeof text === "string" ? text.trim() : "" });
}

/** Text-to-speech: accepts JSON `{ text, voice? }`, returns audio bytes. */
async function handleTts(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    voice?: string;
  };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Missing `text`." }, { status: 400 });
  }

  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text: body.text, voice: body.voice }),
  });

  if (!res.ok) {
    const raw = await res.text();
    return NextResponse.json(
      { error: extractError(safeJson(raw)) ?? raw ?? "Speech synthesis failed." },
      { status: res.status },
    );
  }

  const contentType = res.headers.get("content-type") ?? "";

  // Case 1: upstream already returns audio bytes.
  if (contentType.includes("audio") || contentType.includes("octet-stream")) {
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType || "audio/mpeg" },
    });
  }

  // Case 2: JSON wrapper with base64 audio or a URL.
  const data = safeJson(await res.text());
  const base64 =
    data?.audio ?? data?.audio_base64 ?? data?.audioContent ?? data?.data?.audio;

  if (typeof base64 === "string") {
    const buffer = Buffer.from(stripDataUri(base64), "base64");
    return new NextResponse(buffer, { headers: { "Content-Type": "audio/mpeg" } });
  }

  const audioUrl = data?.url ?? data?.audio_url ?? data?.data?.url;
  if (typeof audioUrl === "string") {
    const audioRes = await fetch(audioUrl);
    const buffer = await audioRes.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": audioRes.headers.get("content-type") ?? "audio/mpeg",
      },
    });
  }

  return NextResponse.json(
    { error: "TTS response did not contain audio." },
    { status: 502 },
  );
}

/** AI agent: accepts JSON `{ messages, model? }`, returns `{ content }`. */
async function handleChat(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    model?: string;
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Missing `messages`." }, { status: 400 });
  }

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: body.model ?? CHAT_MODEL,
      messages: body.messages,
      temperature: 0.3,
    }),
  });

  const raw = await res.text();
  const data = safeJson(raw);

  if (!res.ok) {
    return NextResponse.json(
      { error: extractError(data) ?? raw ?? "AI evaluation failed." },
      { status: res.status },
    );
  }

  const content =
    data?.choices?.[0]?.message?.content ??
    data?.message?.content ??
    data?.content ??
    "";

  return NextResponse.json({ content: typeof content === "string" ? content.trim() : "" });
}

function safeJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractError(data: any): string | null {
  if (!data) return null;
  if (typeof data.error === "string") return data.error;
  if (typeof data.error?.message === "string") return data.error.message;
  if (typeof data.message === "string") return data.message;
  return null;
}

function stripDataUri(value: string): string {
  const comma = value.indexOf(",");
  return value.startsWith("data:") && comma !== -1 ? value.slice(comma + 1) : value;
}
