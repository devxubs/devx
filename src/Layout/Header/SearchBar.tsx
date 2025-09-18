"use client";
import {
  Box,
  TextField,
  ListItemText,
  ListItemButton,
  ClickAwayListener,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CustomBox from "@src/components/CustomBox";
import { useState, useRef } from "react";

const fruits = ["Apple", "Banana", "Cherry", "Date", "Grapes"];

export default function FullWidthSuggestions() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // ✅ detect mobile

  const filtered = fruits.filter((f) =>
    f.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)} disableReactTree>
      <Box sx={{ position: "relative", width: "100%" }}>
        {/* Search Field */}
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search..."
          value={query}
          inputRef={inputRef}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(Boolean(e.target.value));
          }}
          onFocus={() => query && setOpen(true)}
          sx={{ width: 300 }}
        />

        {/* Suggestions Box */}
        {open && (
          <Box
            sx={{
              position: isMobile ? "fixed" : "absolute",
              top: isMobile
                ? inputRef.current?.getBoundingClientRect().bottom ?? 56
                : "100%",
              left: 0,
              width: isMobile ? "100vw" : "100%",
              bgcolor: "background.paper",
              boxShadow: 3,
              borderRadius: isMobile ? 0 : 1,
              zIndex: 1200,
              mt: isMobile ? 0 : 1,
              maxHeight: "50vh",
              overflowY: "auto",
            }}
          >
            <CustomBox>
              {filtered.map((item) => (
                <ListItemButton
                  key={item}
                  onMouseDown={() => {
                    setQuery(item);
                    setOpen(false);
                  }}
                  sx={{ px: 2 }}
                >
                  <ListItemText primary={item} />
                </ListItemButton>
              ))}
            </CustomBox>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
