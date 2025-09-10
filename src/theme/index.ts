import { createTheme } from "@mui/material/styles";
import typography from "./typography";
import { lightShadows, darkShadows } from "./shadow";
import darkPalette from "./darkPalette";
import lightPalette from "./lightPalette";

const buildPalette = (
  basePalette: any,
  mode: "light" | "dark",
  colorState: keyof typeof basePalette
) => ({
  mode,
  primary: basePalette[colorState] ?? basePalette.primary,
  secondary:
    colorState === "secondary" ? basePalette.primary : basePalette.secondary,
  error: colorState === "error" ? basePalette.primary : basePalette.error,
  warning: colorState === "warning" ? basePalette.primary : basePalette.warning,
  info: colorState === "info" ? basePalette.primary : basePalette.info,
  success: colorState === "success" ? basePalette.primary : basePalette.success,
  grey: basePalette.grey,
  background: basePalette.background,
  text: basePalette.text,
});

export const buildAppTheme = (
  mode: "light" | "dark",
  colorState: keyof typeof lightPalette
) =>
  createTheme({
    palette: buildPalette(
      mode === "light" ? lightPalette : darkPalette,
      mode,
      colorState
    ),
    typography,
    shape: { borderRadius: 12 },
    shadows: mode === "light" ? lightShadows : darkShadows,
    components: {
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: "6px",
          },
        },
      },
    },
  });
