import { alpha, createTheme } from "@mui/material/styles";
import typography from "./typography";
import { lightShadows, darkShadows } from "./shadow";
import darkPalette from "./darkPalette";
import lightPalette from "./lightPalette";

const buildPalette = (
   basePalette: any,
   mode: "light" | "dark",
   colorState: keyof typeof basePalette,
) => ({
   mode,
   primary: basePalette[colorState] ?? basePalette.primary,
   secondary:
      colorState === "secondary" ? basePalette.primary : basePalette.secondary,
   error: colorState === "error" ? basePalette.primary : basePalette.error,
   warning:
      colorState === "warning" ? basePalette.primary : basePalette.warning,
   info: colorState === "info" ? basePalette.primary : basePalette.info,
   success:
      colorState === "success" ? basePalette.primary : basePalette.success,
   grey: basePalette.grey,
   background: basePalette.background,
   text: basePalette.text,
});

export const buildAppTheme = (
   mode: "light" | "dark",
   colorState: keyof typeof lightPalette,
) =>
   createTheme({
      palette: buildPalette(
         mode === "light" ? lightPalette : darkPalette,
         mode,
         colorState,
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
         MuiOutlinedInput: {
            styleOverrides: {
               root: {
                  paddingTop: "10px !important",
                  paddingBottom: "10px !important",
               },
               sizeSmall: {
                  input: {
                     paddingTop: "8px !important",
                     paddingBottom: "8px !important",
                  },
               },
            },
         },
         // MuiPaper: {
         //    styleOverrides: {
         //       root: {
         //          overflow: "visible",
         //          backdropFilter: "blur(20px)",
         //          backgroundColor: alpha(
         //             (mode === "light"
         //                ? lightPalette.background?.default
         //                : darkPalette.background?.default) || "",
         //             0.9,
         //          ),
         //          boxShadow:
         //             mode === "light" ? lightShadows[8] : darkShadows[8],
         //          backgroundImage: `
         //                              url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCkiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgMS44MTgxMmUtMDUpIHJvdGF0ZSgtNDUpIHNjYWxlKDEyMy4yNSkiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBCOEQ5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwQjhEOSIgc3RvcC1vcGFjaXR5PSIwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+"),
         //                              url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzNykiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzNyIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEyMCkgcm90YXRlKDEzNSkgc2NhbGUoMTIzLjI1KSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjU2MzAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY1NjMwIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9yYWRpYWxHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4=");`,
         //          backgroundRepeat: "no-repeat",
         //          backgroundSize: "50%, 50%",
         //          backgroundPosition: "right top, left bottom",
         //          padding: "4px",
         //          "& > ul.MuiList-root": {
         //             padding: "0px 0px",
         //          },
         //          "& > ul.MuiList-root > li.MuiButtonBase-root": {
         //             borderRadius: "6px",
         //             padding: "4px 8px",
         //             marginBottom: "4px",
         //             fontSize: "0.875rem",
         //             fontWeight: 600,
         //          },
         //       },
         //    },
         // },
      },
   });
