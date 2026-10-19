import { ImageResponse } from "next/og";

export const alt = "Sourced AI: support answers from your own docs, with the source attached";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Spec 004: the link preview on Upwork, LinkedIn and chat apps.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "radial-gradient(circle at 25% 0%, #0f3b36 0%, #07090b 55%)",
          color: "#ecebe6",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "58%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 600 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#2dd4bf",
                color: "#03201d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* The renderer's default font has no sparkle glyph, so it's drawn. */}
              <svg width="30" height="30" viewBox="0 0 24 24">
                <path
                  fill="#03201d"
                  d="M12 3.5l1.9 5.2 5.2 1.9-5.2 1.9L12 17.7l-1.9-5.2-5.2-1.9 5.2-1.9zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"
                />
              </svg>
            </div>
            Sourced AI
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
              Support answers from your own docs.
            </div>
            <div style={{ fontSize: 28, color: "#9ba3ac", lineHeight: 1.35 }}>
              Every answer links its source. It says when it doesn&apos;t know, and hands off to your team.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, width: "42%", paddingLeft: 40 }}>
          <div
            style={{
              alignSelf: "flex-end",
              background: "#2dd4bf",
              color: "#03201d",
              borderRadius: 22,
              padding: "16px 22px",
              fontSize: 24,
            }}
          >
            Can I return a used kettle?
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              background: "#0e1215",
              border: "1px solid #2b343b",
              borderRadius: 22,
              padding: "18px 22px",
              fontSize: 22,
              lineHeight: 1.4,
            }}
          >
            Yes, within 30 days if it&apos;s undamaged. A 10% restocking fee applies.
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: "#2c210e",
                color: "#f5b454",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 18,
              }}
            >
              Source: Returns and refunds §2
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
