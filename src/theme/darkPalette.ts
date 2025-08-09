"use client";

import {
  createTheme,
  PaletteOptions,
  responsiveFontSizes,
} from "@mui/material/styles";
import palette from "./colors";
import shadows from "./shadow";
import typography from "./typography";

const darkPalette: PaletteOptions = {
  mode: "dark",
  ...palette,
  background: {
    default: "#141A21",
    paper: "#1C252E",
  },
  text: {
    primary: "#ffffff",
    secondary: palette.grey[500],
  },
};

export default darkPalette;
