module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)"
        },
        secondary: {
          100: "rgb(var(--color-secondary-100) / <alpha-value>)",
          200: "rgb(var(--color-secondary-200) / <alpha-value>)",
          300: "rgb(var(--color-secondary-300) / <alpha-value>)"
        },
        tertiary: {
          100: "rgb(var(--color-tertiary-100) / <alpha-value>)",
          200: "rgb(var(--color-tertiary-200) / <alpha-value>)",
          300: "rgb(var(--color-tertiary-300) / <alpha-value>)"
        },
        accent: {
          50: "rgb(var(--color-accent-50) / <alpha-value>)",
          100: "rgb(var(--color-accent-100) / <alpha-value>)",
          200: "rgb(var(--color-accent-200) / <alpha-value>)"
        },
        error: {
          50: "rgb(var(--color-error-50) / <alpha-value>)",
          100: "rgb(var(--color-error-100) / <alpha-value>)",
          200: "rgb(var(--color-error-200) / <alpha-value>)"
        }
      },
      backgroundColor: {
        backdrop: "rgba(0, 0, 0, 0.7)",
        "data-grid-header": "rgba(var(--background-color-data-grid-header), <alpha-value>)",
        "data-grid-header-separator": "rgba(var(--background-color-data-grid-header-separator), <alpha-value>)"
      }
    }
  }
};
