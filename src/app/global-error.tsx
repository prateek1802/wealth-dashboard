"use client";
import { useEffect } from "react";

/**
 * Only fires if the ROOT layout itself throws (not a page — that's
 * error.tsx above, or (app)/error.tsx). Because this replaces the entire
 * root layout, it must render its own <html>/<body> per Next.js's
 * documented requirement. Kept deliberately plain, inline-styled, with no
 * dependency on this app's design-system components, Tailwind, or
 * globals.css — if the root layout crashed, those may be exactly what's
 * broken, so this fallback can't assume any of them still work.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#faf9f6", color: "#1a1a1a" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ maxWidth: "28rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>Something went wrong</p>
            <p style={{ fontSize: "0.875rem", color: "#666" }}>
              {error.message || "An unexpected error occurred."}
              {error.digest && <span style={{ display: "block", marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.75rem" }}>Ref: {error.digest}</span>}
            </p>
            <button
              onClick={reset}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", border: "none", background: "#1a1a1a", color: "#fff", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
