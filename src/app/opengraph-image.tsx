import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

// Day 10: a CODE-GENERATED Open Graph image (the social-share card). This file
// convention auto-adds the og:image/twitter:image meta tags site-wide. It's
// statically generated at build (no request-time data), so it's just a cached PNG.
export const alt = `${siteConfig.name} — ${siteConfig.description}`;
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
          padding: "80px",
          background: "linear-gradient(135deg, #1f4fae 0%, #16306b 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, opacity: 0.85 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 16, lineHeight: 1.1 }}>
          {siteConfig.description}
        </div>
      </div>
    ),
    { ...size },
  );
}
