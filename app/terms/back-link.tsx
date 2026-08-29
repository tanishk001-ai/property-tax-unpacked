"use client";

export function BackLink() {
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else window.location.href = "/";
  }
  return (
    <button type="button" className="terms-back" onClick={goBack}>&larr; Back</button>
  );
}
