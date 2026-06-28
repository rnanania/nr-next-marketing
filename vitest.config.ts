import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Day 13: vitest config. Unit tests cover pure utils (cn, schema validation, UTM,
// image transforms, flags) — no React rendering, so node env is enough and fast.
// The `@` alias mirrors tsconfig so tests import the same paths the app does.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
