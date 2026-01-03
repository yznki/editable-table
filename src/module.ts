import { defineNuxtModule, createResolver, addImportsDir, addComponentsDir } from "@nuxt/kit";

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "editable-table",
    configKey: "editableTable"
  },

  defaults: {},

  async setup(_, nuxt) {
    const resolver = createResolver(import.meta.url);

    /**
     * Runtime alias (for explicit imports & types)
     */
    const runtimeDir = resolver.resolve("./runtime");

    nuxt.options.alias ||= {};
    nuxt.options.alias["#editable-table"] = runtimeDir;
    nuxt.options.alias["#editable-table/components"] = resolver.resolve("./runtime/components");
    nuxt.options.alias["#editable-table/composables"] = resolver.resolve("./runtime/composables");
    nuxt.options.alias["#editable-table/types"] = resolver.resolve("./runtime/types");

    /**
     * Auto-import composables
     * Example:
     *   const { startEditing } = useEditableTableEditing()
     */
    addImportsDir(resolver.resolve("./runtime/composables"));

    /**
     * Auto-register components
     * Example:
     *   <EditableTable />
     */
    addComponentsDir({
      path: resolver.resolve("./runtime/components"),
      pathPrefix: false
    });

    /**
     * Tailwind (Vite plugin)
     */
    const tailwindcss = (await import("@tailwindcss/vite")).default;

    nuxt.options.vite ||= {};
    nuxt.options.vite.plugins ||= [];
    nuxt.options.vite.plugins.push(tailwindcss());

    /**
     * Tailwind base styles
     */
    nuxt.options.css ||= [];
    nuxt.options.css.push(resolver.resolve("./runtime/tailwind.css"));
  }
});
