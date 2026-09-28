"use client";

/**
 * Inline script that runs during HTML parsing (before first paint) on hard loads.
 * The type switch keeps React from warning about script tags during client renders.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
