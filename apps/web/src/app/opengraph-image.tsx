import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Pass — Study smarter. Pass faster.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Subtle dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)",
            backgroundSize: "32px 32px",
            opacity: 0.4,
          }}
        />

        {/* Top: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "white",
              color: "#312e81",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            P
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: -0.5,
              color: "white",
            }}
          >
            Pass
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "#c7d2fe",
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            Built for ZIMSEC
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -3.5,
              color: "white",
              maxWidth: 1000,
            }}
          >
            Study smarter.
            <br />
            Pass faster.
          </div>
        </div>

        {/* Bottom: stats */}
        <div
          style={{
            display: "flex",
            gap: 60,
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.18)",
            color: "#e0e7ff",
          }}
        >
          {[
            { value: "140+", label: "Past papers" },
            { value: "2,000+", label: "Marked questions" },
            { value: "55+", label: "Subjects" },
            { value: "3", label: "Levels" },
          ].map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  letterSpacing: -1.5,
                  color: "white",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#a5b4fc",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
