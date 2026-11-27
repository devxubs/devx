import { darken, getContrastRatio, lighten } from "@mui/material/styles";

/**
 * Cleanup Phase 3 — Appearance & Theme.
 *
 * Appearance is a PERSONAL, per-device preference in this app:
 * it lives in the global state bucket and persists to the
 * localStorage "customize" key — the same store the header
 * appearance drawer has always used (Phase 2 decision 2.11 made
 * that store the single source of truth). The Settings →
 * Appearance tab now edits the SAME store, so the tab and the
 * drawer can never drift apart. It is deliberately NOT part of
 * the business Settings form: one user's dark mode must not
 * become every terminal's dark mode, and display preferences
 * need no settings permission.
 *
 * This module is the pure, testable core: option catalogues,
 * font stacks, and the custom-colour ramp/contrast maths. The
 * writes themselves follow the drawer's established pattern
 * (globalState.set + merged localStorage write) in the tab.
 */

export const APPEARANCE_STORAGE_KEY = "customize";

export type ThemeModeSetting = "light" | "dark" | "system";

export const THEME_MODE_OPTIONS: { key: ThemeModeSetting; name: string }[] = [
   { key: "light", name: "Light" },
   { key: "dark", name: "Dark" },
   { key: "system", name: "System" },
];

/** The six palette presets the theme builder already supports
 * (the same keys the header drawer offers). `main` is the
 * swatch colour from src/theme/colors.ts. */
export const COLOR_PRESETS: { key: string; name: string; main: string }[] = [
   { key: "primary", name: "Green", main: "#00A76F" },
   { key: "secondary", name: "Purple", main: "#8E33FF" },
   { key: "info", name: "Cyan", main: "#00B8D9" },
   { key: "success", name: "Emerald", main: "#22C55E" },
   { key: "warning", name: "Amber", main: "#FFA800" },
   { key: "error", name: "Red", main: "#FF5630" },
];

export interface FontOption {
   key: string;
   name: string;
   stack: string;
   note: string;
}

/**
 * Curated fonts — only what is actually available:
 * - Inter is bundled with the app (next/font/local), so it
 *   always loads, offline included.
 * - The system stack needs no loading at all.
 * - The Bengali-first stack names the Bengali faces the invoice
 *   renderer already uses; they resolve from the DEVICE's fonts
 *   when installed and fall back to Inter when not — the UI
 *   says exactly that instead of claiming the fonts are bundled.
 * No webfont is fetched from a CDN: a POS must work offline.
 */
export const FONT_OPTIONS: FontOption[] = [
   {
      key: "inter",
      name: "Inter (Default)",
      stack: "var(--font-inter), 'Public Sans', sans-serif",
      note: "Bundled with the app — always available.",
   },
   {
      key: "system",
      name: "System UI",
      stack:
         "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      note: "Your device's built-in font — nothing to load.",
   },
   {
      key: "bengali",
      name: "Bengali First",
      stack:
         "'Hind Siliguri', 'Noto Sans Bengali', var(--font-inter), 'Public Sans', sans-serif",
      note: "Uses your device's Bengali font when available; Inter otherwise.",
   },
];

export const DEFAULT_FONT_KEY = "inter";

export function resolveFontStack(key: unknown): string {
   const found = FONT_OPTIONS.find((f) => f.key === key);
   return (found ?? FONT_OPTIONS[0]).stack;
}

/** Factory appearance — mirrors the globalState initial state. */
export const APPEARANCE_DEFAULTS = {
   theme: "dark",
   color: "primary",
   font: DEFAULT_FONT_KEY,
   layoutFull: true,
} as const;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: unknown): value is string {
   return typeof value === "string" && HEX_COLOR.test(value);
}

/**
 * Build a full primary ramp from one custom colour. Only the
 * PRIMARY changes: error/warning/success keep their palette
 * values, so a custom accent can never recolour destructive
 * actions or status indicators. contrastText picks whichever
 * of white/black reads better on the colour — for any colour
 * the better of the two is at least ~4.5:1.
 */
export function buildCustomPrimary(hex: string) {
   const onWhite = getContrastRatio(hex, "#FFFFFF");
   const onBlack = getContrastRatio(hex, "#000000");
   return {
      lighter: lighten(hex, 0.85),
      light: lighten(hex, 0.35),
      main: hex,
      dark: darken(hex, 0.25),
      darker: darken(hex, 0.45),
      contrastText: onWhite >= onBlack ? "#FFFFFF" : "#000000",
   };
}

/**
 * Advisory contrast check for using the colour as TEXT (links,
 * outlined buttons) on a white background — filled buttons are
 * covered by buildCustomPrimary's contrastText. Returns a
 * warning string, or null when the colour reads fine.
 */
export function customColorTextWarning(hex: string): string | null {
   if (!isHexColor(hex)) return null;
   if (getContrastRatio(hex, "#FFFFFF") < 3) {
      return "This colour is light — text and links in it may be hard to read on white backgrounds.";
   }
   return null;
}
