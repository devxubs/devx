"use client";

import {
   Stack,
   TextField,
   Button,
   CircularProgress,
   Avatar,
   Typography,
   Chip,
   MenuItem,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import React, { useState, useEffect } from "react";
import Icon from "@src/components/Icon";
import { User } from "./handler/chatData";
import { useSnackbar } from "@src/lib/snackbarContext";

interface EditGroupModalProps {
   open: boolean;
   conversation: any;
   onClose: () => void;
   onUpdated?: (updatedConv: any) => void;
   // P2-9: member management (optional — rendered when provided).
   users?: User[];
   currentUserId?: string;
   onMembersChanged?: (updatedConv: any) => void;
}

const EditGroupModal = ({
   open,
   conversation,
   onClose,
   onUpdated,
   users = [],
   currentUserId,
   onMembersChanged,
}: EditGroupModalProps) => {
   const { showSnackbar } = useSnackbar();
   const [groupName, setGroupName] = useState("");
   const [description, setDescription] = useState("");
   const [avatarUrl, setAvatarUrl] = useState("");
   const [loading, setLoading] = useState(false);
   // P2-9: member management state, synced from the conversation.
   const [memberIds, setMemberIds] = useState<string[]>([]);
   const [adminIds, setAdminIds] = useState<string[]>([]);
   const [addUserId, setAddUserId] = useState("");
   const [memberBusy, setMemberBusy] = useState(false);

   useEffect(() => {
      if (conversation) {
         setGroupName(conversation.name || conversation.displayName || "");
         setDescription(conversation.description || "");
         setAvatarUrl(conversation.avatar || "");
         setMemberIds(
            Array.isArray(conversation.members) ? conversation.members : [],
         );
         setAdminIds(
            Array.isArray(conversation.adminIds) ? conversation.adminIds : [],
         );
      }
   }, [conversation, open]);

   // Mirrors the API's adminIds enforcement: when admins are
   // recorded, only they manage members/settings; legacy groups
   // without recorded admins keep any-member management.
   const canManageMembers =
      adminIds.length === 0 ||
      (currentUserId ? adminIds.includes(currentUserId) : false);
   const userById = (id: string) => users.find((u) => u.id === id);
   const addableUsers = users.filter((u) => !memberIds.includes(u.id));

   const changeMembership = async (
      action: "add_member" | "remove_member",
      userId: string,
   ) => {
      setMemberBusy(true);
      try {
         const res = await fetch("/api/chat/conversations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               conversationId: conversation.id,
               action,
               userId,
            }),
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) {
            showSnackbar(data.error || "Failed to update members", "error");
            return;
         }
         const updated = data.conversation || data;
         setMemberIds(Array.isArray(updated.members) ? updated.members : []);
         setAdminIds(Array.isArray(updated.adminIds) ? updated.adminIds : []);
         setAddUserId("");
         showSnackbar(action === "add_member" ? "Member added" : "Member removed", "success");
         onMembersChanged?.(updated);
         // Leaving the group closes the modal — the conversation
         // is no longer the caller's.
         if (action === "remove_member" && userId === currentUserId) {
            onClose();
         }
      } catch {
         showSnackbar("Network error updating members", "error");
      } finally {
         setMemberBusy(false);
      }
   };

   const handleSave = async () => {
      if (!groupName.trim()) {
         showSnackbar("Group name is required", "error");
         return;
      }

      setLoading(true);
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
            showSnackbar("Group profile updated", "success");
            if (onUpdated) onUpdated(data.conversation || { ...conversation, name: groupName.trim(), description: description.trim(), avatar: avatarUrl });
            onClose();
         } else {
            const errData = await res.json();
            showSnackbar(errData.error || "Failed to update group profile", "error");
         }
      } catch {
         showSnackbar("Network error updating group profile", "error");
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

            {/* P2-9: member management — backed by the conversations
                API's add_member / remove_member actions, which
                enforce adminIds server-side. */}
            <Stack spacing={1.5}>
               <Typography variant="subtitle2" fontWeight={700}>
                  Members ({memberIds.length})
               </Typography>
               {memberIds.map((id) => {
                  const u = userById(id);
                  const isAdmin = adminIds.includes(id);
                  const isSelf = id === currentUserId;
                  return (
                     <Stack
                        key={id}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                     >
                        <Avatar
                           src={u?.avatar || "/images/avatar-25.webp"}
                           sx={{ width: 32, height: 32 }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                           {u?.name || "Staff Member"}
                           {isSelf ? " (You)" : ""}
                        </Typography>
                        {isAdmin && (
                           <Chip label="Admin" size="small" color="primary" />
                        )}
                        {(canManageMembers || isSelf) && (
                           <Button
                              size="small"
                              color="error"
                              disabled={memberBusy}
                              onClick={() => changeMembership("remove_member", id)}
                           >
                              {isSelf ? "Leave" : "Remove"}
                           </Button>
                        )}
                     </Stack>
                  );
               })}
               {canManageMembers && addableUsers.length > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                     <TextField
                        select
                        size="small"
                        label="Add member"
                        value={addUserId}
                        onChange={(e) => setAddUserId(e.target.value)}
                        sx={{ flex: 1 }}
                     >
                        {addableUsers.map((u) => (
                           <MenuItem key={u.id} value={u.id}>
                              {u.name}
                           </MenuItem>
                        ))}
                     </TextField>
                     <Button
                        variant="outlined"
                        disabled={!addUserId || memberBusy}
                        onClick={() =>
                           addUserId && changeMembership("add_member", addUserId)
                        }
                     >
                        Add
                     </Button>
                  </Stack>
               )}
               {!canManageMembers && (
                  <Typography variant="caption" color="text.secondary">
                     Only group admins can add or remove members.
                  </Typography>
               )}
            </Stack>

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