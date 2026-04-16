import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#faf7f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          fontStyle: "italic",
          fontWeight: 500,
          color: "#1a1613",
          fontSize: 128,
          letterSpacing: "-0.04em",
        }}
      >
        L.
      </div>
    ),
    size,
  );
}
