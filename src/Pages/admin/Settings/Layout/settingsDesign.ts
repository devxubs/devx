import { alpha, type Theme } from "@mui/material/styles";

// Settings UI design layer (visual redesign, UI ONLY).
//
// Applied once, as `sx` on the Settings Layout root, so every
// rule is scoped to the Settings interface — both the
// /admin/settings page and the full-screen Settings modal,
// which share this Layout. Nothing here can leak into the rest
// of the POS: the selectors only match descendants of the
// Settings root.
//
// Design language (from the GitHub Settings reference and the
// SaaS settings pattern research — Untitled UI, shadcn
// settings blocks, MiniDev/Knowns settings layouts):
// - One field treatment everywhere: 8px radius, subtle filled
//   surface, hairline border that strengthens on hover, and a
//   soft primary focus ring instead of a heavy 2px outline.
// - Compact field height (~40px) and 14px input text, so long
//   forms scan like a premium SaaS settings page, not a CRUD
//   form.
// - Flat surfaces: cards and papers lose their shadows and
//   elevation tint; a 1px divider border does the separating
//   (sections were already outlined — this makes it uniform).
// - Controls align to the content edge: MUI's FormControlLabel
//   carries a -11px left margin designed for bare forms, which
//   pushed card switches onto the card border; zeroed here.
// - Buttons and chips share the 8px radius and a 600 weight.
//
// MUI popups (select menus, autocomplete poppers, dialogs)
// render in portals OUTSIDE this subtree, so they keep the app
// theme — restyling them would mean changing shared global
// components, which this redesign deliberately does not do.
export const settingsDesignSx = (theme: Theme) => ({
   // ---- Text fields, selects, autocompletes -------------------
   "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      backgroundColor: theme.palette.background.paper,
      fontSize: "0.875rem",
      // The app theme forces 10px vertical root padding on every
      // outlined input; 8px lands the Settings field height at
      // ~40px. !important is required to beat the theme's own
      // !important — scoped to Settings, the rest of the POS
      // keeps the theme value.
      paddingTop: "8px !important",
      paddingBottom: "8px !important",
      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      "&:hover .MuiOutlinedInput-notchedOutline": {
         borderColor: theme.palette.text.secondary,
      },
      "&.Mui-focused": {
         boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`,
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
         borderColor: theme.palette.primary.main,
         borderWidth: "1px",
      },
      "&.Mui-error": {
         boxShadow: "none",
      },
      "&.Mui-error.Mui-focused": {
         boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.14)}`,
      },
      "&.Mui-disabled": {
         backgroundColor: alpha(
            theme.palette.action.disabledBackground,
            0.35,
         ),
      },
   },
   // Floating labels: one size and weight everywhere, muted
   // until the field is focused.
   "& .MuiInputLabel-outlined": {
      fontSize: "0.875rem",
      fontWeight: 500,
      color: theme.palette.text.secondary,
   },
   "& .MuiInputLabel-outlined.Mui-focused": {
      color: theme.palette.primary.main,
   },
   "& .MuiInputLabel-outlined.Mui-error": {
      color: theme.palette.error.main,
   },
   // Helper / description text under fields: small, muted,
   // comfortable line height.
   "& .MuiFormHelperText-root": {
      fontSize: "0.75rem",
      lineHeight: 1.45,
      marginTop: "4px",
   },

   // ---- Surfaces ----------------------------------------------
   "& .MuiPaper-root": {
      boxShadow: "none",
      backgroundImage: "none",
   },
   "& .MuiCard-root": {
      boxShadow: "none",
   },

   // ---- Buttons, chips, icon buttons ---------------------------
   "& .MuiButton-root": {
      borderRadius: "8px",
      fontWeight: 600,
      boxShadow: "none",
      "&:hover": {
         boxShadow: "none",
      },
   },
   "& .MuiChip-root": {
      borderRadius: "8px",
      fontWeight: 500,
   },
   "& .MuiIconButton-root": {
      borderRadius: "8px",
   },
   "& .MuiToggleButton-root": {
      borderRadius: "8px",
      fontWeight: 600,
      textTransform: "none",
   },

   // ---- Switch / checkbox rows ---------------------------------
   // Align controls to the content edge inside cards and rows
   // (see the header note about MUI's -11px default).
   "& .MuiFormControlLabel-root": {
      marginLeft: 0,
      marginRight: 0,
   },

   // ---- Settings navigation (the Layout sidebar) ----------------
   "& .settings-nav .MuiListItemButton-root": {
      borderRadius: "8px",
   },
});
