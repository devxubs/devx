"use client";

import {
   Stack,
   TextField,
   Button,
   Alert,
   CircularProgress,
   Avatar,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import React, { useState, useEffect } from "react";
import Icon from "@src/components/Icon";

interface EditGroupModalProps {
   open: boolean;
   conversation: any;
   onClose: () => void;
   onUpdated?: (updatedConv: any) => void;
}

const EditGroupModal = ({
   open,
   conversation,
   onClose,
   onUpdated,
}: EditGroupModalProps) => {
   const [groupName, setGroupName] = useState("");
   const [description, setDescription] = useState("");
   const [avatarUrl, setAvatarUrl] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (conversation) {
         setGroupName(conversation.name || conversation.displayName || "");
         setDescription(conversation.description || "");
         setAvatarUrl(conversation.avatar || "");
      }
   }, [conversation, open]);

   const handleSave = async () => {
      if (!groupName.trim()) {
         setError("Group name is required");
         return;
      }

      setLoading(true);
      setError(null);
      try {
         const res = await fetch("/api/chat/conversations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               conversationId: conversation.id,
               action: "edit_profile",
               name: groupName.trim(),
               description: description.trim(),
               avatar: avatarUrl.trim() || undefined,
            }),
         });

         if (res.ok) {
            const data = await res.json();
            if (onUpdated) onUpdated(data.conversation || { ...conversation, name: groupName.trim(), description: description.trim(), avatar: avatarUrl });
            onClose();
         } else {
            const errData = await res.json();
            setError(errData.error || "Failed to update group profile");
         }
      } catch {
         setError("Network error updating group profile");
      } finally {
         setLoading(false);
      }
   };

   return (
      <CustomModal
         title="Edit Group Profile"
         open={open}
         onClose={onClose}
         sx={{
            width: {
               xs: 320,
               sm: 450,
               md: 520,
            },
         }}
      >
         {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
               {error}
            </Alert>
         )}

         <Stack spacing={2.5} py={1}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
               <Avatar
                  src={avatarUrl || "/images/avatar-25.webp"}
                  sx={{ width: 68, height: 68, boxShadow: 3 }}
               />
            </Stack>

            <TextField
               fullWidth
               label="Group Name *"
               value={groupName}
               onChange={(e) => setGroupName(e.target.value)}
               placeholder="Enter group name"
            />

            <TextField
               fullWidth
               multiline
               rows={2}
               label="Group Description"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Brief description of the group's purpose..."
            />

            <TextField
               fullWidth
               label="Avatar Image URL (Optional)"
               value={avatarUrl}
               onChange={(e) => setAvatarUrl(e.target.value)}
               placeholder="https://example.com/avatar.png"
            />

            <Stack direction="row" justifyContent="flex-end" spacing={2} pt={1}>
               <Button variant="text" color="inherit" onClick={onClose} disabled={loading}>
                  Cancel
               </Button>
               <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} /> : <Icon icon="solar:check-circle-bold" />}
               >
                  Save Changes
               </Button>
            </Stack>
         </Stack>
      </CustomModal>
   );
};

export default EditGroupModal;