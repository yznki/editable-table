module.exports = {
  theme: {
    colors: {
      inherit: "inherit",
      transparent: "transparent",
      white: "#ffffff",
      black: "#212529",
      primary: {
        DEFAULT: "rgba(var(--color-primary-100), <alpha-value>)",
        100: "rgba(var(--color-primary-100), <alpha-value>)",
        200: "rgba(var(--color-primary-200), <alpha-value>)",
        300: "rgba(var(--color-primary-300), <alpha-value>)"
      },
      secondary: {
        DEFAULT: "rgba(var(--color-secondary-100), <alpha-value>)",
        100: "rgba(var(--color-secondary-100), <alpha-value>)",
        200: "rgba(var(--color-secondary-200), <alpha-value>)",
        300: "rgba(var(--color-secondary-300), <alpha-value>)"
      },
      tertiary: {
        DEFAULT: "rgba(var(--color-tertiary-100), <alpha-value>)",
        100: "rgba(var(--color-tertiary-100), <alpha-value>)",
        200: "rgba(var(--color-tertiary-200), <alpha-value>)",
        300: "rgba(var(--color-tertiary-300), <alpha-value>)"
      },
      accent: {
        DEFAULT: "rgba(var(--color-accent-100), <alpha-value>)",
        50: "rgba(var(--color-accent-50), <alpha-value>)",
        100: "rgba(var(--color-accent-100), <alpha-value>)",
        200: "rgba(var(--color-accent-200), <alpha-value>)"
      },
      grey: {
        50: "#f1f1f1",
        100: "#dcdddd",
        150: "#d2d3d3",
        200: "#C7C9C9",
        300: "#b2b5b5",
        400: "#9da1a1",
        500: "#888c8d",
        600: "#747879",
        700: "#5f6365",
        800: "#4a4e51",
        900: "#363a3d"
      },
      success: {
        50: "#B5DDBE",
        100: "#4CA460",
        200: "#418E52"
      },
      error: {
        50: "#FF85A1",
        100: "#CD002F",
        200: "#B20027"
      },
      warning: {
        50: "#F3C4A8",
        100: "#E16B25",
        200: "#C45C1F"
      },
      info: {
        50: "#A9DED9",
        100: "#3B9B91",
        200: "#32867D"
      }
    },
    fontFamily: {
      "source-sans": ["\"Source Sans 3\"", "sans-serif"]
    },
    extend: {
      backgroundColor: {
        backdrop: "rgba(0, 0, 0, 0.7)",
        "data-grid-header": "rgba(var(--background-color-data-grid-header), <alpha-value>)",
        "data-grid-header-separator":
          "rgba(var(--background-color-data-grid-header-separator), <alpha-value>)"
      }
    }
  }
};
