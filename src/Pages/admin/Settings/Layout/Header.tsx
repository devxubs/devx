import {
   Stack,
   IconButton,
   TextField,
   Button,
   useMediaQuery,
   keyframes,
   useTheme,
   Slide,
   alpha,
} from "@mui/material";
import CustomBox from "@src/components/CustomBox";
import Icon from "@src/components/Icon";
import React from "react";

interface HeaderProps {
   onShowSidebar: () => void;
}

const Header = ({ onShowSidebar }: HeaderProps) => {
   const theme = useTheme();
   const isSmDown = useMediaQuery((theme: any) => theme.breakpoints.down("sm"));
   const rotate = keyframes`
      0% {
         transform: translateX(-5px) rotate(0deg);
      }

      25% {
         transform: translateX(0px) rotate(90deg);
      }

      50% {
         transform: translateX(5px) rotate(180deg);
      }

      65% {
         transform: translateX(5px) rotate(200deg);
      }

      75% {
         transform: translateX(5px) rotate(180deg);
      }

      100% {
         transform: translateX(-5px) rotate(360deg);
      }
      `;

   const [openSearch, setOpenSearch] = React.useState(false);
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
               placeholder="Search..."
               sx={{
                  width: {
                     sm: 200,
                     md: 300,
                  },
               }}
            />
         )}
         <Button
            variant="contained"
            startIcon={
               <Icon
                  icon="solar:settings-bold-duotone"
                  size={isSmDown ? "small" : "medium"}
               />
            }
            size={isSmDown ? "small" : "medium"}
            sx={{
               "& svg": {
                  color: theme.palette.common.white + "!important",
                  animation: `${rotate} 4s linear infinite`, // ?  Rotate when changing.
               },
            }}
         >
            Save Changes
         </Button>

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
                  placeholder="Search..."
                  sx={{
                     width: "100%",
                  }}
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
