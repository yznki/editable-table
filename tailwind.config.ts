import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  content: ["./src/runtime/**/*.{vue,ts}"],
  theme: {
    extend: {
      // design tokens go here later
    }
  },
  plugins: []
};
