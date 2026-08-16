import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/**
 * La web vive dentro del repo del bot y `lib/sismo.ts` importa `src/sismos.js`
 * de la raíz. Con dos lockfiles en juego (el del bot y el de acá), Next elige
 * mal la raíz de rastreo y avisa en cada build: se la fijamos a `web/`.
 */
const config: NextConfig = {
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default config;
