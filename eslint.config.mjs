import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The WebGL scene owns three.js objects (materials, meshes, cameras) that are mutated
    // every frame by design — they are not React state.
    files: ["src/scene/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".qa/**"]),
]);

export default eslintConfig;
