import { PaletteOptions } from "@mui/material";
import palette from "./colors";

const lightPalette: PaletteOptions = {
   mode: "light",
   ...palette,
   background: {
      default: "#ffffff",
      paper: "#F4F6F8",
   },
   text: {
      primary: palette.grey[800],
      secondary: palette.grey[600],
   },
};

export default lightPalette;
