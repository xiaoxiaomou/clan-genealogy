// Tailwind CSS 4 uses CSS-based configuration (@theme in index.css)
// This file is kept for reference and IDE support only.
// Actual customization: src/index.css → @theme / @layer
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: "",
}

export default config
