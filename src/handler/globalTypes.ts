export interface GlobalStateProps {
  // Cleanup Phase 3: "system" follows the device colour scheme;
  // ThemeProviderClient resolves it to light/dark at runtime.
  theme: "dark" | "light" | "system";
  // A palette preset key ("primary" | "secondary" | "info" |
  // "success" | "warning" | "error") or a custom "#RRGGBB" hex
  // (Cleanup Phase 3 custom accent colour).
  color: string;
  // Cleanup Phase 3: a key from FONT_OPTIONS in lib/appearance.
  font: string;
  layoutFull: boolean;
}
