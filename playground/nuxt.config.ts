export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss", "../src/module"],
  editableTable: {},
  css: ["~/assets/css/tailwind.scss"],
  tailwindcss: {
    configPath: "tailwind.config.cjs",
    cssPath: "~/assets/css/tailwind.scss"
  },
  devtools: { enabled: true }
});
