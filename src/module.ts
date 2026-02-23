import { defineNuxtModule, createResolver, addImportsDir, addComponentsDir, installModule } from "@nuxt/kit";

export interface ModuleOptions {
  /**
   * When true, skip installing Tailwind from this module.
   * Useful if the host app (or CVC) already provides Tailwind.
   */
  disableTailwind?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "editable-table",
    configKey: "editableTable"
  },

  defaults: {},

  moduleDependencies: {},

  async setup(options, nuxt) {
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

    const installedModules = (nuxt.options.modules ?? []).map((entry) => (Array.isArray(entry) ? entry[0] : entry));

    const hasCvcModule = installedModules.some((entry) => {
      if (!entry) return false;
      if (typeof entry === "string") {
        return entry.includes("common-components") || entry.includes("@psvcommon/common-components");
      }
      return false;
    });

    const shouldInstallTailwind = !options.disableTailwind && !hasCvcModule;

    if (shouldInstallTailwind) {
      await installModule("@nuxtjs/tailwindcss", {
        configPath: resolver.resolve("../tailwind.config"),
        cssPath: [resolver.resolve("../assets/tailwind/tailwind.css"), { injectPosition: "first" }],
        exposeConfig: true
      });
    }
  }
});
