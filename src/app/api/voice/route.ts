import { NextResponse } from "next/server";
import { appendFileSync } from "fs";
import { join } from "path";
import {
  getSnwolleyCredentials,
  isSnwolleyConfigured,
  snwolleyAuthHeaders,
} from "@/lib/snwolley-auth";

// Snwolley API runs binary (audio) handling, so use the Node.js runtime.
export const runtime = "nodejs";

const STT_URL = "https://v1.snwolley.ai/api/v1/hackathon/stt";
const TTS_URL = "https://v1.snwolley.ai/api/v1/hackathon/tts";
const CHAT_URL = "https://v1.snwolley.ai/v1/chat/completions";
const CHAT_MODEL = process.env.SNWOLLEY_MODEL ?? "snwolley-chat";
const DEBUG_LOG = join(process.cwd(), ".cursor", "debug-bfa856.log");

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  return snwolleyAuthHeaders(extra);
}

// #region agent log
function debugVoiceLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const entry = {
    sessionId: "bfa856",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    appendFileSync(DEBUG_LOG, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    /* ignore */
  }
  fetch("http://127.0.0.1:7511/ingest/ebbb6bca-986c-454c-8843-d0ab41f45d96", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bfa856" },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
// #endregion

export async function POST(request: Request) {
  if (!isSnwolleyConfigured()) {
    return NextResponse.json(
      {
        error:
          "Voice mode needs a Snwolley API key. Add SNWOLLEY_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  const action = new URL(request.url).searchParams.get("action");
  const { apiKey, apiSecret } = getSnwolleyCredentials();

  // #region agent log
  const outboundAuth = snwolleyAuthHeaders();
  debugVoiceLog("H1", "voice/route.ts:POST", "voice proxy entry", {
    action,
    keyPresent: Boolean(apiKey),
    keyLen: apiKey?.length ?? 0,
    secretPresent: Boolean(apiSecret),
    authHeaderNames: Object.keys(outboundAuth),
  });
  // #endregion

  try {
    switch (action) {
      case "stt":
        return await handleStt(request);
      case "tts":
        return await handleTts(request);
      case "chat":
        return await handleChat(request);
      case "probe":
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Not available." }, { status: 404 });
        }
        return await handleAuthProbe();
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

  // #region agent log
  debugVoiceLog("H2", "voice/route.ts:handleStt", "stt upstream response", {
    status: res.status,
    ok: res.ok,
    audioSize: audio.size,
    audioType: audio.type,
    error: extractError(data) ?? raw.slice(0, 120),
    authHeaderNames: Object.keys(snwolleyAuthHeaders()),
  });
  // #endregion

  if (!res.ok) {
    console.error("[voice/stt] upstream", res.status, extractError(data) ?? raw.slice(0, 200));
    return NextResponse.json(
      { error: formatUpstreamError(res.status, extractError(data) ?? raw ?? null) },
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
    // #region agent log
    debugVoiceLog("H3", "voice/route.ts:handleTts", "tts upstream response", {
      status: res.status,
      ok: res.ok,
      error: extractError(safeJson(raw)) ?? raw.slice(0, 120),
      authHeaderNames: Object.keys(snwolleyAuthHeaders()),
    });
    // #endregion
    console.error("[voice/tts] upstream", res.status, extractError(safeJson(raw)) ?? raw.slice(0, 200));
    return NextResponse.json(
      {
        error: formatUpstreamError(
          res.status,
          extractError(safeJson(raw)) ?? raw ?? null,
        ),
      },
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
      {
        error: formatUpstreamError(res.status, extractError(data) ?? raw ?? null),
      },
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

/** Dev-only: try auth variants against TTS to learn what Snwolley accepts. */
async function handleAuthProbe() {
  const { apiKey, apiSecret } = getSnwolleyCredentials();
  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured." }, { status: 503 });
  }

  const payload = JSON.stringify({ text: "hello" });
  const variants: Array<{ name: string; url: string; init: RequestInit }> = [
    {
      name: "x-api-key-header",
      url: TTS_URL,
      init: {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: payload,
      },
    },
    {
      name: "bearer-header",
      url: TTS_URL,
      init: {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: payload,
      },
    },
    {
      name: "key-plus-secret-headers",
      url: TTS_URL,
      init: {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          ...(apiSecret ? { "X-API-Secret": apiSecret } : {}),
          "Content-Type": "application/json",
        },
        body: payload,
      },
    },
    {
      name: "secret-only-header",
      url: TTS_URL,
      init: {
        method: "POST",
        headers: {
          "X-API-Secret": apiSecret ?? apiKey,
          "Content-Type": "application/json",
        },
        body: payload,
      },
    },
    {
      name: "query-api-key",
      url: `${TTS_URL}?api_key=${encodeURIComponent(apiKey)}`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      },
    },
    {
      name: "body-api-key-no-header",
      url: TTS_URL,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello", api_key: apiKey }),
      },
    },
  ];

  const results: Array<{ name: string; status: number; error: string | null }> = [];

  for (const variant of variants) {
    const res = await fetch(variant.url, variant.init);
    const raw = await res.text();
    const err = extractError(safeJson(raw)) ?? raw.slice(0, 80);
    results.push({ name: variant.name, status: res.status, error: err || null });
    debugVoiceLog("H5", "voice/route.ts:probe", "auth variant result", {
      variant: variant.name,
      status: res.status,
      ok: res.ok,
      error: err,
      secretPresent: Boolean(apiSecret),
    });
  }

  return NextResponse.json({ results });
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

function formatUpstreamError(status: number, upstream: string | null): string {
  if (status !== 401) return upstream ?? "Request failed.";
  const { apiSecret } = getSnwolleyCredentials();
  if (!apiSecret) {
    return (
      "Snwolley rejected the API key. Generate credentials at v1.snwolley.ai → your organization → key icon, " +
      "then set both SNWOLLEY_API_KEY and SNWOLLEY_API_SECRET in .env.local and restart the dev server."
    );
  }
  return (
    "Snwolley rejected your API credentials. Regenerate the key pair at v1.snwolley.ai → organization → key icon, " +
    "update SNWOLLEY_API_KEY and SNWOLLEY_API_SECRET in .env.local, and restart the dev server."
  );
}

function stripDataUri(value: string): string {
  const comma = value.indexOf(",");
  return value.startsWith("data:") && comma !== -1 ? value.slice(comma + 1) : value;
}
