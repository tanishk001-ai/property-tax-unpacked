// Reference numbers for simulated receipts and disputes.
// Format: <PREFIX>-<last 4 of property id>-<YYMMDD>-<4 random A-Z0-9>
// Call this from an event handler (never during render) so the value is created
// once per payment / dispute and can be kept in state while its modal is open.

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

export function makeReference(prefix: "RCT" | "DPT", propertyId: string, now: Date = new Date()): string {
  const yy = String(now.getFullYear() % 100).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${prefix}-${propertyId.slice(-4)}-${yy}${mm}${dd}-${randomSuffix(4)}`;
}
