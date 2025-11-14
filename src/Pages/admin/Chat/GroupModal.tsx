import {
   Stack,
   TextField,
   Badge,
   IconButton,
   Button,
   Typography,
   useMediaQuery,
   useTheme,
} from "@mui/material";
import AnimatedAvatar from "@src/components/AnimateAvatar";
import CustomModal from "@src/components/Modal";
import React, { useState } from "react";
import UploadPhoto from "./Layout/imageUploader";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { User } from "./handler/chatData";
import Switch from "./Switch";

interface ModalProps {
   open: boolean;
   users: User[];
   onClose: () => void;
}

const Modal = ({ users, open, onClose }: ModalProps) => {
   const theme = useTheme();
   const user = users.map((u) => u.name);
   const [selectUser, setSelectUser] = useState();
   const [selected, setSelected] = useState<User[]>([]);
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

   return (
      <CustomModal
         title="Create Group"
         open={open}
         onClose={function (): void {
            onClose();
         }}
         sx={{
            width: {
               xs: 300,
               sm: 450,
               md: 600,
            },
         }}
      >
         <Stack
            spacing={2}
            direction={{
               xs: "column",
               sm: "row",
            }}
            alignItems={{
               xs: "normal",
               sm: "center",
            }}
            width={"100%"}
         >
            <UploadPhoto />
            <Stack width={{ xs: "100%", sm: "70%" }} justifyContent={"center"}>
               <Switch />
               <TextField
                  placeholder="Group name"
                  label="Group name"
                  sx={{
                     mt: 2,
                     mb: !selected.length ? 2 : 0,
                  }}
               />
               {!!selected.length && (
                  <Stack
                     spacing={2}
                     direction={"row"}
                     alignItems={"center"}
                     overflow={"auto"}
                     px={1}
                     py={2.5}
                     sx={{
                        scrollbarWidth: "none!important", // Firefox
                        "&::-webkit-scrollbar": {
                           display: "none!important", // Chrome, Safari, Edge
                        },
                     }}
                  >
                     {selected.map((su, idx) => {
                        return (
                           <Badge
                              key={idx}
                              badgeContent={
                                 <IconButton
                                    size="small"
                                    onClick={() => {
                                       setSelected(
                                          selected.filter((s) => s.id !== su.id)
                                       );
                                    }}
                                 >
                                    <Icon
                                       icon="solar:close-circle-bold-duotone"
                                       size="small"
                                    />
                                 </IconButton>
                              }
                           >
                              <Stack spacing={0.5} alignItems={"center"}>
                                 <AnimatedAvatar />
                                 <Typography variant="body2" fontSize={10}>
                                    {su.name}
                                 </Typography>
                              </Stack>
                           </Badge>
                        );
                     })}
                  </Stack>
               )}
            </Stack>
         </Stack>
         <Stack
            mt={{
               xs: 0,
               sm: !selected.length ? 2 : 0,
               md: !selected.length ? 3 : 0,
            }}
         >
            <CustomAutocomplete
               arrow
               label="Users"
               multiple
               limitTags={isSmDown ? 1 : 2}
               option={users || []}
               getOptionLabel={(option) => option.name || ""}
               value={selected as any}
               onChange={(va) => {
                  setSelectUser(va);
                  setSelected(va);
               }}
            />
         </Stack>
         <Stack
            spacing={2}
            direction={"row"}
            justifyContent={"flex-end"}
            width={"100%"}
            mt={2}
         >
            <Button variant="text" color="inherit" onClick={onClose}>
               Cancel
            </Button>

            <Button variant="contained" color="primary">
               {"Add user"}
            </Button>
         </Stack>
      </CustomModal>
   );
};

export default Modal;
