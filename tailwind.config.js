const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        panel: token("panel"),
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        teal: { DEFAULT: token("teal"), 2: token("teal-2"), 3: token("teal-3") },
        green: { DEFAULT: token("green"), d: token("green-d"), l: token("green-l") },
        blue: { DEFAULT: token("blue"), l: token("blue-l") },
        orange: { DEFAULT: token("orange"), l: token("orange-l"), d: token("orange-d") },
        red: { DEFAULT: token("red"), l: token("red-l") },
        yellow: token("yellow"),
        slate: { DEFAULT: token("slate"), l: token("slate-l") },
        // Accents used only on the dark-teal hero surfaces.
        onDark: {
          label: token("on-dark-label"),
          sub: token("on-dark-sub"),
          green: token("on-dark-green"),
          blue: token("on-dark-blue"),
          orange: token("on-dark-orange"),
          purple: token("on-dark-purple"),
        },
      },
      fontFamily: {
        // Montserrat (lib/fonts)
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", '"Liberation Mono"', '"Courier New"', "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "2xs": "0 1px 0 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [
    // `touch:` - touch screens only (phones, tablets): bigger tap targets without changing the mouse/desktop layout.
    ({ addVariant }) => addVariant("touch", "@media (pointer: coarse)"),
  ],
};
