import {
   Box,
   IconButton,
   Stack,
   SwipeableDrawer,
   Tooltip,
   Typography,
   Button,
} from "@mui/material";
import AnimatedAvatar from "@src/components/AnimateAvatar";
import CustomBox from "@src/components/CustomBox";
import Icon from "@src/components/Icon";
import CustomList from "@src/components/List";
import useGlobalState from "@src/handler/globalState";
import React, { useEffect } from "react";
import Scrollbar from "react-browser-scrollbar";

interface ProfileProps {
   open: boolean;
   onClose: () => void;
   onOpen: () => void;
}

const items = [
   {
      icon: "solar:cart-large-bold-duotone",
      label: "Conform order",
   },
   {
      icon: "solar:graph-up-bold-duotone",
      label: "Analyze",
   },
];

const Profile = ({ open, onClose, onOpen }: ProfileProps) => {
   const colorState = useGlobalState.get("color");
   const [user, setUser] = React.useState<any>(null);

   React.useEffect(() => {
      fetch("/api/auth/me")
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => {
            if (d?.user) setUser(d.user);
         })
         .catch(() => {});
   }, []);

   const handleLogout = async () => {
      try {
         await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/auth";
   };

   return (
      <SwipeableDrawer
         anchor="right"
         open={open}
         onClose={onClose}
         onOpen={onOpen}
         PaperProps={{
            sx: {
               width: 300,
               backdropFilter: "blur(6px)",
            },
         }}
      >
         <Scrollbar autoHide darkMode thumbSize={6}>
            <CustomBox
               sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  pb: 4,
               }}
            >
               <Box>
                  <Box
                     sx={{
                        px: 2.5,
                        py: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                     }}
                  >
                     <Typography variant="h6">Profile</Typography>
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Tooltip title="Close">
                           <IconButton onClick={onClose}>
                              <Icon icon="eva:close-fill" />
                           </IconButton>
                        </Tooltip>
                     </Stack>
                  </Box>

                  <Stack
                     spacing={3}
                     px={3}
                     pb={1.5}
                     alignItems="center"
                     justifyContent="center"
                     border={0}
                     borderBottom={1}
                     borderColor="divider"
                     sx={{ borderStyle: "dashed" }}
                  >
                     <AnimatedAvatar size="large" />
                     <Stack spacing={0.1}>
                        <Typography
                           variant="h6"
                           fontSize="15px!important"
                           textAlign="center"
                        >
                           {user?.name || "jubayer"}
                        </Typography>
                        <Typography
                           variant="body2"
                           color="textSecondary"
                           textAlign="center"
                        >
                           {user?.email || "devxub@gmail.com"}
                        </Typography>
                        <Typography
                           variant="subtitle2"
                           color="textDisabled"
                           textAlign="center"
                        >
                           {typeof user?.role === "object" ? user?.role?.name || "System Admin" : user?.role || "System Admin"}
                        </Typography>
                     </Stack>
                  </Stack>
               </Box>
               <Stack py={2} px={2} flex={1} width="100%">
                  <CustomList items={items} fullMenu={true} />
               </Stack>
               <Stack alignItems={"center"} px={2}>
                  <Button
                     variant="text"
                     color={colorState === "error" ? "primary" : "error"}
                     fullWidth
                     onClick={handleLogout}
                  >
                     Log out
                  </Button>
               </Stack>
            </CustomBox>
         </Scrollbar>
      </SwipeableDrawer>
   );
};

export default Profile;
