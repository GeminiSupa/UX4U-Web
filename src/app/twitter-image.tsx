import { ImageResponse } from "next/og";

export const alt = "UX4U: software and growth studio in Islamabad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#efeae1",
          color: "#161815"
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.7 }}>UX4U · Software and growth studio · Islamabad</div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
          From a concept to a business that runs.
        </div>
      </div>
    ),
    size
  );
}
