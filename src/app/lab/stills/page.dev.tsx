import { StillsLab } from "./StillsLab";

/** Dev-only (see pageExtensions in next.config.ts): renders stills for scripts/render-stills.mjs. */
export default function StillsPage() {
  return <StillsLab />;
}

export const metadata = { robots: { index: false, follow: false } };
