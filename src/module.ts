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
    nuxt.options.alias ||= {};
    nuxt.options.alias["#editable-table"] = resolver.resolve("./runtime");

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

  }
});
