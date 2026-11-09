import React from "react";
import {
   Autocomplete,
   TextField,
   Popper,
   autocompleteClasses,
   useTheme,
   alpha,
} from "@mui/material";

import { type AutocompleteProps } from "@mui/material/Autocomplete";

export interface OptionType {
   label?: string;
   value?: string;
   [key: string]: any;
}

export interface CustomAutocompleteOptionType {
   label: string;
   value: string;
}

export interface CustomAutocompleteProps extends Omit<
   AutocompleteProps<any, boolean, boolean, boolean>,
   "renderInput" | "options" | "value" | "onChange" | "multiple"
> {
   placeholder?: string;
   arrow?: boolean;
   label?: string;
   options?: any[];
   option?: any[]; // compatibility alias
   value?: any;
   onChange?: (d: any, e?: any) => void;
   multiple?: boolean;
   error?: boolean;
   helperText?: string;
   validField?: any;
   size?: "small" | "medium";
}

// Styled Popper component
const StyledPopper = (props: any) => {
   const theme = useTheme();

   return (
      <Popper
         {...props}
         placement="bottom-start"
         sx={{
            position: "relative", // ✅ Required for arrow positioning
            overflow: "visible",
            backdropFilter: "blur(20px)",
            backgroundColor: alpha(theme.palette.background.default, 0.9),
            borderRadius: 1,
            boxShadow: theme.shadows[8],

            [`& .${autocompleteClasses.listbox}`]: {
               padding: 0.5,
               fontSize: 14,
               backgroundImage: `
            url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCkiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgMS44MTgxMmUtMDUpIHJvdGF0ZSgtNDUpIHNjYWxlKDEyMy4yNSkiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBCOEQ5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwQjhEOSIgc3RvcC1vcGFjaXR5PSIwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+"),
            url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzNykiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzNyIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEyMCkgcm90YXRlKDEzNSkgc2NhbGUoMTIzLjI1KSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjU2MzAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY1NjMwIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9yYWRpYWxHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4=");`,
               backgroundRepeat: "no-repeat",
               backgroundSize: "50%, 50%",
               backgroundPosition: "right top, left bottom",
            },
            [`& .${autocompleteClasses.option}`]: {
               padding: "6px 12px",
               borderRadius: 0.5,
               "&.Mui-focused": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
               },
               "&[aria-selected='true']": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.3),
               },
            },
         }}
      />
   );
};

const CustomAutocomplete = ({
   options,
   option,
   placeholder,
   label,
   arrow = false,
   onChange,
   value,
   multiple = false,
   error,
   helperText,
   validField,
   size = "medium",
   ...rest
}: CustomAutocompleteProps) => {
   const rawOptions = options ?? option ?? [];
   const safeOptions = Array.isArray(rawOptions) ? rawOptions : [];

   return (
      <Autocomplete
         {...rest}
         size={size}
         PopperComponent={StyledPopper}
         sx={{
            ...rest.sx,
            p: 0,
         }}
         disableClearable={arrow}
         multiple={multiple}
         freeSolo={!arrow}
         options={safeOptions}
         value={multiple ? (value ?? []) : (value ?? null)}
         onChange={(event, newValue) => {
            onChange?.(newValue, event as any);
         }}
         getOptionLabel={
            rest.getOptionLabel ||
            ((opt: any) => {
               if (typeof opt === "string") return opt;
               if (opt && typeof opt === "object" && "label" in opt)
                  return String(opt.label);
               if (opt && typeof opt === "object" && "name" in opt)
                  return String(opt.name);
               return String(opt ?? "");
            })
         }
         renderInput={(params) => (
            <TextField
               {...params}
               {...validField}
               size={size}
               fullWidth
               variant="outlined"
               placeholder={placeholder}
               label={label}
               error={error}
               helperText={helperText}
               sx={{
                  "& .MuiOutlinedInput-root":
                     multiple && value?.length
                        ? {}
                        : {
                             paddingTop:
                                size === "small"
                                   ? "11px !important"
                                   : "16px !important",
                             paddingBottom:
                                size === "small"
                                   ? "11px !important"
                                   : "16px !important",
                             paddingLeft:
                                size === "small"
                                   ? "8px!important"
                                   : "10px !important",
                             paddingRight: arrow
                                ? size === "small"
                                   ? "36px !important"
                                   : "44px !important"
                                : size === "small"
                                  ? "10px !important"
                                  : "16px !important",

                             fontSize: size === "small" ? "0.875rem" : "1rem",
                          },
               }}
            />
         )}
      />
   );
};

export default CustomAutocomplete;
