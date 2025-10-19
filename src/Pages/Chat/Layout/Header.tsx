import {
   Stack,
   Avatar,
   Typography,
   IconButton,
   useTheme,
   FormControl,
   FormControlLabel,
   FormLabel,
   Radio,
   RadioGroup,
   Button,
} from "@mui/material";
import AnimatedAvatar from "@src/components/AnimateAvatar";
import Icon from "@src/components/Icon";
import SidebarRightIcon from "@src/SvgIcon/SidebarRightIcon";
import React, { useState } from "react";
import { getLastActiveTime, toRelativeTime } from "../handler/handler";
import { User } from "../handler/chatData";
import CustomModal from "@src/components/Modal";

interface HeaderProps {
   user: User;
   open?: Boolean;
   mobileMode?: Boolean;
   onClose?: (open: boolean) => void;
}

const Header = ({ user, onClose, open }: HeaderProps) => {
   const theme = useTheme();
   const [openModal, setOpenModal] = useState(false);

   return (
      <Stack
         direction={"row"}
         alignItems={"center"}
         justifyContent={"space-between"}
         py={1}
         px={2}
         borderBottom={1}
         borderColor={"divider"}
      >
         <Stack spacing={1} direction="row" alignItems="center">
            {Array.isArray(user.avatar) ? (
               <Stack
                  position={"relative"}
                  height={40}
                  width={40}
                  borderRadius={"50%"}
                  sx={{
                     "& .MuiAvatar-root": {
                        width: 29,
                        height: 29,
                     },
                  }}
               >
                  <Avatar
                     src={user.avatar[0]}
                     sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        zIndex: 2,
                        border: 2,
                        borderColor: theme.palette.background.paper,
                     }}
                  />
                  <Avatar
                     src={user.avatar[1]}
                     sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        zIndex: 1,
                     }}
                  />
               </Stack>
            ) : (
               <AnimatedAvatar src={user.avatar} />
            )}
            <Stack>
               <Typography
                  variant="body1"
                  fontSize={14}
                  fontWeight={600}
                  color="textPrimary"
               >
                  {user ? user.name : "Select a user to chat"}
               </Typography>
               <Typography variant="body2" fontSize={12} color="textSecondary">
                  {user
                     ? user.isOnline
                        ? "Online"
                        : getLastActiveTime(user.id)
                        ? toRelativeTime(
                             new Date(getLastActiveTime(user.id)!).getTime()
                          )
                        : "No recent activity"
                     : "No user selected"}
               </Typography>
            </Stack>
         </Stack>

         {user && (
            <Stack spacing={1} direction="row" alignItems="center">
               <IconButton size="small" onClick={() => onClose?.(!open)}>
                  <SidebarRightIcon
                     fontSize="small"
                     style={{ color: theme.palette.text.secondary }}
                  />
               </IconButton>

               <CustomModal
                  open={openModal}
                  onClose={() => setOpenModal(false)}
                  title="Mute this chat?"
                  sx={{
                     width: 350,
                  }}
               >
                  <RadioGroup
                     aria-labelledby="demo-radio-buttons-group-label"
                     defaultValue="female"
                     name="radio-buttons-group"
                     sx={{
                        ml: 4,
                     }}
                  >
                     <FormControlLabel
                        value="For 15 minutes"
                        control={<Radio />}
                        label="For 15 minutes"
                     />
                     <FormControlLabel
                        value="For 1 hour"
                        control={<Radio />}
                        label="For 1 hour"
                     />
                     <FormControlLabel
                        value="For 8 hour"
                        control={<Radio />}
                        label="For 8 hour"
                     />
                     <FormControlLabel
                        value="For 24 hour"
                        control={<Radio />}
                        label="For 24 hour"
                     />
                     <FormControlLabel
                        value="Until I change it"
                        control={<Radio />}
                        label="Until I change it"
                     />
                  </RadioGroup>
                  <Stack
                     spacing={2}
                     direction={"row"}
                     justifyContent={"flex-end"}
                     width={"100%"}
                     mt={2}
                  >
                     <Button
                        variant="text"
                        color="inherit"
                        onClick={() => setOpenModal(false)}
                     >
                        Cancel
                     </Button>

                     <Button variant="text" color="primary">
                        Ok
                     </Button>
                  </Stack>
               </CustomModal>
               <IconButton size="small" onClick={() => setOpenModal(true)}>
                  <Icon
                     size="small"
                     icon="solar:muted-line-duotone" //"eva:more-vertical-fill"
                     style={{ color: theme.palette.text.secondary }}
                  />
               </IconButton>
            </Stack>
         )}
      </Stack>
   );
};

export default Header;
