module.exports = {
  theme: {
    extend: {
      backgroundColor: {
        backdrop: "rgba(0, 0, 0, 0.7)",
        "data-grid-header": "rgba(var(--background-color-data-grid-header), <alpha-value>)",
        "data-grid-header-separator": "rgba(var(--background-color-data-grid-header-separator), <alpha-value>)"
      }
    }
  }
};
