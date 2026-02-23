import { defineNuxtModule, createResolver, addImportsDir, addComponentsDir, installModule } from "@nuxt/kit";
import { createRequire } from "node:module";

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
    configKey: "editableTable",
    compatibility: {
      nuxt: ">=4.0.0"
    }
  },

  defaults: {},

  moduleDependencies: {},

  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const require = createRequire(import.meta.url);
    const tailwindPreset = require(resolver.resolve("../assets/tailwind/tailwind.preset.cjs"));

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
    const tailwindCssPath = resolver.resolve("../assets/tailwind/tailwind.css");
    const tailwindContentGlobs = [
      resolver.resolve("./runtime/**/*.{vue,js,ts,mjs}"),
      resolver.resolve("../dist/runtime/**/*.{vue,js,ts,mjs}")
    ];

    if (shouldInstallTailwind) {
      nuxt.options.css ||= [];

      if (!nuxt.options.css.includes(tailwindCssPath)) {
        nuxt.options.css.unshift(tailwindCssPath);
      }

      const tailwindOptions = ((nuxt.options as Record<string, any>).tailwindcss ??= {});
      const tailwindConfig = (tailwindOptions.config ??= {});

      const mergedContent = Array.isArray(tailwindConfig.content) ? [...tailwindConfig.content] : [];
      tailwindContentGlobs.forEach((contentGlob) => {
        if (!mergedContent.includes(contentGlob)) {
          mergedContent.push(contentGlob);
        }
      });
      tailwindConfig.content = mergedContent;

      const mergedPresets = Array.isArray(tailwindConfig.presets) ? [...tailwindConfig.presets] : [];
      if (!mergedPresets.includes(tailwindPreset)) {
        mergedPresets.push(tailwindPreset);
      }
      tailwindConfig.presets = mergedPresets;

      await installModule("@nuxtjs/tailwindcss", {
        configPath: resolver.resolve("../tailwind.config.ts"),
        cssPath: [tailwindCssPath, { injectPosition: "first" }],
        config: tailwindConfig,
        exposeConfig: true
      });
    }
  }
});
