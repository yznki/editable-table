import { defineNuxtModule, createResolver } from "@nuxt/kit";

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "editable-table",
    configKey: "editableTable"
  },
  defaults: {},
  async setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url);

    _nuxt.options.vite ||= {};
    _nuxt.options.vite.plugins ||= [];

    const tailwindcss = (await import("@tailwindcss/vite")).default;
    _nuxt.options.vite.plugins.push(tailwindcss());

    _nuxt.options.css ||= [];
    _nuxt.options.css.push(resolve("./runtime/tailwind.css"));
  }
});
