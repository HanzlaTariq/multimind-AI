import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0B0E14",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#4DE0C0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
              color: "#0B0E14",
            }}
          >
            M
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#E7E9EE" }}>MultiMind</div>
        </div>
        <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.15, color: "#E7E9EE", maxWidth: 950 }}>
          One clean workspace for every leading AI.
        </div>
        <div style={{ fontSize: 26, marginTop: 24, color: "#8B93A3", maxWidth: 850 }}>
          ChatGPT · Claude · Gemini · Groq · DeepSeek — ask once, get the strongest answer.
        </div>
      </div>
    ),
    { ...size }
  );
}