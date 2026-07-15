// Thin wrapper around the ElevenLabs API for voice cloning and text-to-speech.
// Requires ELEVENLABS_API_KEY in the environment — sign up at
// https://elevenlabs.io, grab an API key from your profile settings.
//
// NOTE: field names/response shape can change between API versions — if this
// starts failing, check https://elevenlabs.io/docs/api-reference for the
// current schema.

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = "https://api.elevenlabs.io/v1";

function requireKey() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Text-to-speech isn't configured yet — ELEVENLABS_API_KEY is missing on the server.");
  }
}

export async function listAllVoices() {
  requireKey();
  const res = await fetch(`${BASE_URL}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail?.message || "Couldn't fetch voices");
  return data.voices || [];
}

export async function cloneVoice({ name, fileBuffer, filename, mimeType }) {
  requireKey();
  const form = new FormData();
  form.append("name", name);
  form.append("files", new Blob([fileBuffer], { type: mimeType }), filename);

  const res = await fetch(`${BASE_URL}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail?.message || "Voice cloning failed");
  return data.voice_id;
}

export async function deleteVoice(voiceId) {
  requireKey();
  const res = await fetch(`${BASE_URL}/voices/${voiceId}`, {
    method: "DELETE",
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail?.message || "Couldn't delete voice");
  }
}

export async function generateSpeech({ text, voiceId }) {
  requireKey();
  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail?.message || "Speech generation failed");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}