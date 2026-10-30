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
}

// Styled Popper component
const StyledPopper = (props: any) => {
   const theme = useTheme();

   return (
      <Popper
         {...props}
         placement="bottom-start"
         sx={{
            position: "relative",
            zIndex: 1300,
            boxShadow: theme.shadows[8],

            [`& .${autocompleteClasses.listbox}`]: {
               padding: 0.5,
               fontSize: 14,
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
   ...rest
}: CustomAutocompleteProps) => {
   const rawOptions = options ?? option ?? [];
   const safeOptions = Array.isArray(rawOptions) ? rawOptions : [];

   return (
      <Autocomplete
         {...rest}
         PopperComponent={StyledPopper}
         sx={{ ...rest.sx, p: 0 }}
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
               if (opt && typeof opt === "object" && "label" in opt) return String(opt.label);
               if (opt && typeof opt === "object" && "name" in opt) return String(opt.name);
               return String(opt ?? "");
            })
         }
         renderInput={(params) => (
            <TextField
               {...params}
               {...validField}
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
                                rest.size === "small"
                                   ? "9px !important"
                                   : "16px !important",
                             paddingBottom:
                                rest.size === "small"
                                   ? "9px !important"
                                   : "16px !important",
                             paddingLeft:
                                rest.size === "small"
                                   ? "8px!important"
                                   : "10px !important",
                             paddingRight:
                                arrow
                                   ? rest.size === "small"
                                      ? "36px !important"
                                      : "44px !important"
                                   : rest.size === "small"
                                      ? "10px !important"
                                      : "16px !important",
                          },
               }}
            />
         )}
      />
   );
};

export default CustomAutocomplete;
