import { ImageResponse } from "next/og";

// The picture LinkedIn, Slack and others show when the link is shared.
export const alt = "Unpacked: know what your property tax bill is made of";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f6f4ef", color: "#17231e", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#0d5946", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800 }}>U</div>
          <div style={{ marginLeft: 20, fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Unpacked</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3, maxWidth: 980 }}>Know what your property tax bill is made of.</div>
          <div style={{ marginTop: 28, fontSize: 34, color: "#5b665f", maxWidth: 940 }}>Every input, rule, rebate and penalty, line by line, in English and Hindi.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#5b665f" }}>
          <div style={{ display: "flex" }}>Independent hackathon prototype · synthetic data</div>
          <div style={{ display: "flex", background: "#0d5946", color: "#ffffff", padding: "12px 26px", borderRadius: 999, fontWeight: 700, whiteSpace: "nowrap" }}>Three demo bills</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
