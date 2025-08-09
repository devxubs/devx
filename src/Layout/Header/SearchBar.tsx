import React from "react";
import {
  Autocomplete,
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Popper,
  autocompleteClasses,
  useTheme,
  alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CustomPopover from "@src/components/CustomPopover";

const suggestions = [
  "Apple",
  "Banana",
  "Cherry",
  "Date",
  "Grapes",
  "Mango",
  "Orange",
  "Watermelon",
];

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

const SearchBar = () => {
  return (
    <Box sx={{ maxWidth: 400, width: "100%" }}>
      <Autocomplete
        freeSolo
        options={suggestions}
        PopperComponent={StyledPopper}
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            variant="outlined"
            placeholder="Search..."
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                paddingRight: "16px!important",
              },
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}
      />
    </Box>
  );
};

export default SearchBar;
