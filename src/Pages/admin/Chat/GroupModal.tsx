import {
   Stack,
   TextField,
   Badge,
   IconButton,
   Button,
   Typography,
   useMediaQuery,
   useTheme,
   CircularProgress,
   Alert,
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
   onGroupCreated?: (newConv: any) => void;
}

const Modal = ({ users, open, onClose, onGroupCreated }: ModalProps) => {
   const theme = useTheme();
   const [groupName, setGroupName] = useState("");
   const [selected, setSelected] = useState<User[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

   const handleCreateGroup = async () => {
      if (!groupName.trim()) {
         setError("Group name is required");
         return;
      }

      setLoading(true);
      setError(null);
      try {
         const res = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               type: "group",
               name: groupName.trim(),
               memberIds: selected.map((s) => s.id),
            }),
         });

         if (res.ok) {
            const data = await res.json();
            setGroupName("");
            setSelected([]);
            if (onGroupCreated) onGroupCreated(data);
            onClose();
         } else {
            const errData = await res.json();
            setError(errData.error || "Failed to create group");
         }
      } catch {
         setError("Error creating group conversation");
      } finally {
         setLoading(false);
      }
   };

   return (
      <CustomModal
         title="Create Group"
         open={open}
         onClose={onClose}
         sx={{
            width: {
               xs: 300,
               sm: 450,
               md: 600,
            },
         }}
      >
         {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
               {error}
            </Alert>
         )}
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
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
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
                                 <AnimatedAvatar src={su.avatar} />
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
               options={users || []}
               getOptionLabel={(option) => option.name || ""}
               value={selected}
               onChange={(va) => {
                  setSelected(Array.isArray(va) ? va : []);
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
            <Button variant="text" color="inherit" onClick={onClose} disabled={loading}>
               Cancel
            </Button>

            <Button
               variant="contained"
               color="primary"
               onClick={handleCreateGroup}
               disabled={loading}
            >
               {loading ? <CircularProgress size={20} color="inherit" /> : "Add user"}
            </Button>
         </Stack>
      </CustomModal>
   );
};

export default Modal;
