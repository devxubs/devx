"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   Chip,
   Grid,
   Paper,
   Stack,
   TextField,
   Typography,
   IconButton,
   Tooltip,
   CircularProgress,
   Alert,
   alpha,
   useTheme,
   Divider,
} from "@mui/material";
import Icon from "@src/components/Icon";

interface OrderNotesCardProps {
   orderId: string;
   initialCourierNote?: string | null;
   initialCustomerNote?: string | null;
   initialPackingNote?: string | null;
   initialEmployeeNote?: string | null;
   onNotesUpdated?: (updatedOrder?: any) => void;
}

type NoteType = "courier" | "customer" | "packing" | "employee";

export default function OrderNotesCard({
   orderId,
   initialCourierNote = "",
   initialCustomerNote = "",
   initialPackingNote = "",
   initialEmployeeNote = "",
   onNotesUpdated,
}: OrderNotesCardProps) {
   const theme = useTheme();

   // Note values
   const [courierNote, setCourierNote] = useState(initialCourierNote || "");
   const [customerNote, setCustomerNote] = useState(initialCustomerNote || "");
   const [packingNote, setPackingNote] = useState(initialPackingNote || "");
   const [employeeNote, setEmployeeNote] = useState(initialEmployeeNote || "");

   // Active editing states
   const [editingNote, setEditingNote] = useState<NoteType | null>(null);
   const [draftText, setDraftText] = useState("");
   const [savingNote, setSavingNote] = useState<NoteType | null>(null);
   const [successMsg, setSuccessMsg] = useState<string | null>(null);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   const handleStartEdit = (type: NoteType, currentVal: string) => {
      setEditingNote(type);
      setDraftText(currentVal);
      setSuccessMsg(null);
      setErrorMsg(null);
   };

   const handleCancelEdit = () => {
      setEditingNote(null);
      setDraftText("");
   };

   const handleSaveNote = async (type: NoteType) => {
      setSavingNote(type);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload: Record<string, string> = {};
      if (type === "courier") payload.courierNote = draftText.trim();
      if (type === "customer") payload.customerNote = draftText.trim();
      if (type === "packing") payload.packingNote = draftText.trim();
      if (type === "employee") payload.employeeNote = draftText.trim();

      try {
         const res = await fetch(`/api/orders/${orderId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (!res.ok) {
            throw new Error(`Failed to save ${type} note`);
         }

         const updatedOrder = await res.json();

         if (type === "courier") setCourierNote(draftText.trim());
         if (type === "customer") setCustomerNote(draftText.trim());
         if (type === "packing") setPackingNote(draftText.trim());
         if (type === "employee") setEmployeeNote(draftText.trim());

         setEditingNote(null);
         const titleMap: Record<NoteType, string> = {
            courier: "Courier Note",
            customer: "Customer Note",
            packing: "Packing Note",
            employee: "Employee Note",
         };
         setSuccessMsg(`${titleMap[type]} saved successfully!`);
         setTimeout(() => setSuccessMsg(null), 3000);
         if (onNotesUpdated) onNotesUpdated(updatedOrder);
      } catch (err: any) {
         setErrorMsg(err.message || "Failed to save note");
      } finally {
         setSavingNote(null);
      }
   };

   const noteConfigs: {
      type: NoteType;
      title: string;
      value: string;
      icon: string;
      color: "primary" | "info" | "warning" | "secondary";
      placeholder: string;
      badge?: string;
   }[] = [
      {
         type: "courier",
         title: "Courier Note",
         value: courierNote,
         icon: "solar:delivery-bold",
         color: "primary",
         placeholder: "Write specific instructions for courier rider or dispatch...",
      },
      {
         type: "customer",
         title: "Customer Note",
         value: customerNote,
         icon: "solar:user-speak-rounded-bold",
         color: "info",
         placeholder: "Special delivery or product instructions requested by customer...",
      },
      {
         type: "packing",
         title: "Packing Note",
         value: packingNote,
         icon: "solar:box-bold",
         color: "warning",
         placeholder: "Warehouse packaging, fragile handling, or inclusion remarks...",
      },
      {
         type: "employee",
         title: "Employee Note",
         value: employeeNote,
         icon: "solar:shield-user-bold",
         color: "secondary",
         placeholder: "Internal staff notes, VIP handling, manager remarks...",
         badge: "Internal Only",
      },
   ];

   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1,
            overflow: "hidden",
            borderColor: "divider",
            bgcolor: "background.paper",
         }}
      >
         {/* Card Header */}
         <Box
            sx={{
               px: 2.5,
               py: 1.75,
               bgcolor: alpha(theme.palette.text.primary, 0.02),
               borderBottom: `1px solid ${theme.palette.divider}`,
               display: "flex",
               alignItems: "center",
               justifyContent: "space-between",
               flexWrap: "wrap",
               gap: 1,
            }}
         >
            <Stack direction="row" spacing={1.25} alignItems="center">
               <Box
                  sx={{
                     width: 30,
                     height: 30,
                     borderRadius: 0.75,
                     bgcolor: alpha(theme.palette.info.main, 0.1),
                     color: "info.main",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                  }}
               >
                  <Icon icon="solar:notes-bold" size="17px" />
               </Box>
               <Box>
                  <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                     Order Notes
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     Customer requests, courier instructions, packing details, and internal staff notes
                  </Typography>
               </Box>
            </Stack>
         </Box>

         {/* Feedback Alerts */}
         {successMsg && (
            <Alert severity="success" sx={{ m: 2.5, mb: 0, py: 0.5, borderRadius: 1 }}>
               {successMsg}
            </Alert>
         )}
         {errorMsg && (
            <Alert severity="error" sx={{ m: 2.5, mb: 0, py: 0.5, borderRadius: 1 }}>
               {errorMsg}
            </Alert>
         )}

         {/* Spacious 2-Column × 2-Row Note Panels */}
         <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2.5}>
               {noteConfigs.map((cfg) => {
                  const isEditing = editingNote === cfg.type;
                  const isSaving = savingNote === cfg.type;

                  return (
                     <Grid size={{ xs: 12, sm: 6 }} key={cfg.type}>
                        <Paper
                           variant="outlined"
                           sx={{
                              p: 2.25,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.text.primary, 0.015),
                              borderColor: isEditing ? `${cfg.color}.main` : "divider",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                              "&:hover": {
                                 borderColor: isEditing
                                    ? `${cfg.color}.main`
                                    : alpha(theme.palette.text.primary, 0.2),
                              },
                           }}
                        >
                           <Box>
                              {/* Panel Header */}
                              <Stack
                                 direction="row"
                                 justifyContent="space-between"
                                 alignItems="center"
                                 mb={1.75}
                              >
                                 <Stack direction="row" spacing={1.25} alignItems="center">
                                    <Box
                                       sx={{
                                          width: 30,
                                          height: 30,
                                          borderRadius: 0.75,
                                          bgcolor: alpha(theme.palette[cfg.color].main, 0.1),
                                          color: `${cfg.color}.main`,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                       }}
                                    >
                                       <Icon icon={cfg.icon} size="16px" />
                                    </Box>
                                    <Typography
                                       variant="subtitle2"
                                       fontWeight={700}
                                       sx={{ fontSize: "0.925rem" }}
                                    >
                                       {cfg.title}
                                    </Typography>
                                    {cfg.badge && (
                                       <Chip
                                          label={cfg.badge}
                                          size="small"
                                          sx={{
                                             height: 20,
                                             fontSize: "0.68rem",
                                             fontWeight: 700,
                                             bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                             color: "secondary.main",
                                             borderRadius: 0.75,
                                          }}
                                       />
                                    )}
                                 </Stack>

                                 {!isEditing && (
                                    <Tooltip title={`Edit ${cfg.title}`} arrow>
                                       <IconButton
                                          size="small"
                                          onClick={() => handleStartEdit(cfg.type, cfg.value)}
                                          aria-label={`Edit ${cfg.title}`}
                                          sx={{
                                             p: 0.6,
                                             borderRadius: 1,
                                             border: `1px solid ${theme.palette.divider}`,
                                             color: "text.secondary",
                                             "&:hover": {
                                                color: "text.primary",
                                                bgcolor: "action.hover",
                                                borderColor: "text.secondary",
                                             },
                                          }}
                                       >
                                          <Icon icon="solar:pen-bold" size="13px" />
                                       </IconButton>
                                    </Tooltip>
                                 )}
                              </Stack>

                              {/* Panel Content or Edit Form */}
                              {isEditing ? (
                                 <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    size="small"
                                    autoFocus
                                    placeholder={cfg.placeholder}
                                    value={draftText}
                                    onChange={(e) => setDraftText(e.target.value)}
                                    sx={{
                                       "& .MuiInputBase-root": {
                                          fontSize: "0.875rem",
                                          lineHeight: 1.6,
                                          bgcolor: "background.paper",
                                          borderRadius: 1,
                                          p: 1.5,
                                       },
                                    }}
                                 />
                              ) : (
                                 <Box
                                    sx={{
                                       minHeight: 84,
                                       display: "flex",
                                       flexDirection: "column",
                                       justifyContent: cfg.value ? "flex-start" : "center",
                                       p: cfg.value ? 1.75 : 1.5,
                                       borderRadius: 1,
                                       bgcolor: cfg.value
                                          ? "background.paper"
                                          : alpha(theme.palette.text.primary, 0.012),
                                       border: cfg.value
                                          ? `1px solid ${theme.palette.divider}`
                                          : `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
                                    }}
                                 >
                                    {cfg.value ? (
                                       <Typography
                                          variant="body2"
                                          sx={{
                                             whiteSpace: "pre-wrap",
                                             wordBreak: "break-word",
                                             fontSize: "0.875rem",
                                             lineHeight: 1.6,
                                             color: "text.primary",
                                          }}
                                       >
                                          {cfg.value}
                                       </Typography>
                                    ) : (
                                       <Stack
                                          direction="row"
                                          spacing={1}
                                          alignItems="center"
                                          justifyContent="center"
                                       >
                                          <Icon
                                             icon="solar:notes-minimalistic-linear"
                                             size="15px"
                                             style={{ opacity: 0.4 }}
                                          />
                                          <Typography
                                             variant="caption"
                                             sx={{
                                                color: "text.disabled",
                                                fontStyle: "italic",
                                                fontSize: "0.8rem",
                                             }}
                                          >
                                             No note recorded. Click edit to add instructions.
                                          </Typography>
                                       </Stack>
                                    )}
                                 </Box>
                              )}
                           </Box>

                           {/* Save / Cancel buttons when editing */}
                           {isEditing && (
                              <Stack
                                 direction="row"
                                 spacing={1}
                                 justifyContent="flex-end"
                                 mt={2}
                              >
                                 <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    disabled={isSaving}
                                    onClick={handleCancelEdit}
                                    sx={{
                                       textTransform: "none",
                                       fontSize: "0.8rem",
                                       borderRadius: 1,
                                       px: 1.75,
                                    }}
                                 >
                                    Cancel
                                 </Button>
                                 <Button
                                    size="small"
                                    variant="contained"
                                    color={cfg.color}
                                    disabled={isSaving}
                                    onClick={() => handleSaveNote(cfg.type)}
                                    startIcon={
                                       isSaving ? (
                                          <CircularProgress size={13} color="inherit" />
                                       ) : (
                                          <Icon icon="solar:check-circle-bold" size="14px" />
                                       )
                                    }
                                    sx={{
                                       textTransform: "none",
                                       fontSize: "0.8rem",
                                       fontWeight: 600,
                                       borderRadius: 1,
                                       px: 2,
                                    }}
                                 >
                                    {isSaving ? "Saving..." : "Save Note"}
                                 </Button>
                              </Stack>
                           )}
                        </Paper>
                     </Grid>
                  );
               })}
            </Grid>
         </Box>
      </Paper>
   );
}
