"use client";

import { useEffect } from "react";
import { productById } from "@/content/menu";

type RenderStill = (id: string, width: number, height: number) => Promise<string>;

/** Exposes `window.__renderStill(id, w, h)` → PNG data URL of a product on a transparent background. */
export function StillsLab() {
  useEffect(() => {
    const render: RenderStill = async (id, width, height) => {
      const { getStudio } = await import("@/scene/products/ProductStudio");
      const studio = await getStudio();
      const canvas = document.createElement("canvas");
      canvas.style.cssText = `width:${width}px;height:${height}px;display:block`;
      document.body.appendChild(canvas);
      const view = studio.attach(canvas, productById(id));
      await new Promise((r) => setTimeout(r, 1400));
      const url = canvas.toDataURL("image/png");
      view.dispose();
      canvas.remove();
      return url;
    };
    (window as unknown as { __renderStill: RenderStill }).__renderStill = render;
    document.documentElement.dataset.lab = "ready";
  }, []);
  return <main id="main" style={{ padding: "2rem" }} />;
}
