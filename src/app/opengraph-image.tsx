import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Okeyo Travel — Trouvez votre destination selon votre humeur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#08090d",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#a78bfa",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Okeyo Travel
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 28,
          }}
        >
          Trouvez votre destination selon votre humeur
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#9ca3af",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          En 2 minutes, notre IA vous recommande la destination idéale.
        </div>
      </div>
    ),
    { ...size },
  );
}
