"use client";

import {
   Stack,
   IconButton,
   TextField,
   Button,
   useMediaQuery,
   useTheme,
   Slide,
   alpha,
   CircularProgress,
} from "@mui/material";
import CustomBox from "@src/components/CustomBox";
import Icon from "@src/components/Icon";
import React, { useState } from "react";

interface HeaderProps {
   onShowSidebar: () => void;
   onSave: () => void;
   isSaving?: boolean;
   // RP-3 (U3): hide the Save action for read-only roles.
   canUpdate?: boolean;
   // RP-4: Save is enabled (prominent) only with unsaved changes.
   isDirty?: boolean;
   searchQuery?: string;
   onSearchChange?: (val: string) => void;
}

const Header = ({
   onShowSidebar,
   onSave,
   isSaving = false,
   canUpdate = true,
   isDirty = false,
   searchQuery = "",
   onSearchChange,
}: HeaderProps) => {
   const theme = useTheme();
   const isSmDown = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));
   const [openSearch, setOpenSearch] = useState(false);

   return (
      <Stack
         px={2}
         py={1.5}
         borderBottom={1}
         borderColor={"divider"}
         direction={"row"}
         alignItems={"center"}
         justifyContent={"space-between"}
         position={"relative"}
         overflow={"hidden"}
      >
         {isSmDown ? (
            <Stack direction={"row"} alignItems={"center"} spacing={1}>
               <IconButton size="small" onClick={onShowSidebar}>
                  <Icon icon="solar:hamburger-menu-broken" />
               </IconButton>
               <IconButton size="small" onClick={() => setOpenSearch(true)}>
                  <Icon icon="eva:search-fill" />
               </IconButton>
            </Stack>
         ) : (
            <TextField
               variant="outlined"
               size="small"
               placeholder="Search settings..."
               value={searchQuery}
               onChange={(e) => onSearchChange?.(e.target.value)}
               sx={{
                  width: {
                     sm: 220,
                     md: 320,
                  },
               }}
            />
         )}

         {canUpdate && (
            <Button
               variant="contained"
               color="primary"
               startIcon={
                  isSaving ? (
                     <CircularProgress size={16} color="inherit" />
                  ) : (
                     <Icon icon="solar:diskette-bold" size={isSmDown ? "small" : "medium"} />
                  )
               }
               size={isSmDown ? "small" : "medium"}
               onClick={onSave}
               disabled={isSaving || !isDirty}
               sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
               {isSaving ? "Saving..." : "Save Changes"}
            </Button>
         )}

         {/* Search Slide Sm screen */}
         <Slide direction="down" in={openSearch} mountOnEnter unmountOnExit>
            <CustomBox
               sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  px: 2,
                  py: 1,
                  bgcolor: "background.paper",
                  borderBottom: (theme) =>
                     `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  borderTopRightRadius: 16,
                  borderTopLeftRadius: 16,
               }}
            >
               <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  sx={{ width: "100%" }}
                  autoFocus
               />
               <IconButton onClick={() => setOpenSearch(false)}>
                  <Icon icon="carbon:close" />
               </IconButton>
            </CustomBox>
         </Slide>
      </Stack>
   );
};

export default Header;
