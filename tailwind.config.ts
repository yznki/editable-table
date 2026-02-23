import type { Config } from "tailwindcss";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const preset = require("./assets/tailwind/tailwind.preset.cjs");

export default <Partial<Config>>{
  content: [
    "./src/runtime/**/*.{vue,ts}",
    "./dist/runtime/**/*.{vue,js,ts,mjs}",
    "./playground/app.vue",
    "./playground/pages/**/*.{vue,ts}",
    "./playground/layouts/**/*.{vue,ts}",
    "./playground/components/**/*.{vue,ts}"
  ],
  presets: [preset],
  plugins: []
};
