export default defineNuxtConfig({
  modules: ["../src/module"],
  editableTable: {},
  devtools: { enabled: true },
  app: {
    head: {
      title: "Requirements Manager",
      titleTemplate: "%s",
      meta: [
        {
          name: "description",
          content: "Requirements Manager for project and requirement-set tracking with spreadsheet-style editing."
        },
        {
          property: "og:title",
          content: "Requirements Manager"
        },
        {
          property: "og:description",
          content: "Manage projects and requirement sets with a modern spreadsheet workflow."
        },
        {
          property: "og:type",
          content: "website"
        }
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "shortcut icon", type: "image/svg+xml", href: "/favicon.svg" }
      ]
    }
  }
});
