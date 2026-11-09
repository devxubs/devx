import React, { useState, useMemo } from "react";
import {
   Box,
   Chip,
   CircularProgress,
   Paper,
   Stack,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { OrderNoteItem } from "../types";
import {
   QuickEditNoteCard,
   QuickEditAddNoteForm,
   NoteTypeKey,
} from "./notes";

interface QuickEditNotesSectionProps {
   notes: OrderNoteItem[];
   onAddNote: (note: {
      type: OrderNoteItem["type"];
      title: string;
      content: string;
      author?: string;
   }) => void;
   isLoading?: boolean;
   disabled?: boolean;
}

export const QuickEditNotesSection: React.FC<QuickEditNotesSectionProps> = ({
   notes = [],
   onAddNote,
   isLoading = false,
   disabled = false,
}) => {
   const theme = useTheme();
   const [activeFilter, setActiveFilter] = useState<string>("all");

   // Filter notes if activeFilter is set
   const filteredNotes = useMemo(() => {
      if (activeFilter === "all") return notes;
      return notes.filter((n) => n.type === activeFilter);
   }, [notes, activeFilter]);

   // Compute counts per category for filter pills
   const counts = useMemo(() => {
      const map: Record<string, number> = {
         customer: 0,
         courier: 0,
         packing: 0,
         employee: 0,
         instruction: 0,
      };
      for (const n of notes) {
         if (map[n.type] !== undefined) {
            map[n.type]++;
         } else if (n.type === "general") {
            map.instruction = (map.instruction || 0) + 1;
         }
      }
      return map;
   }, [notes]);

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 1,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2}>
            {/* Section Header */}
            <Stack
               direction={{ xs: "column", sm: "row" }}
               justifyContent="space-between"
               alignItems={{ xs: "flex-start", sm: "center" }}
               spacing={1}
            >
               <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                     sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 0.75,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                     }}
                  >
                     <Icon icon="solar:notes-bold" size="16px" />
                  </Box>
                  <Box>
                     <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ fontSize: "0.9rem" }}
                     >
                        Order Notes & Instructions
                     </Typography>
                     <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.72rem", display: "block" }}
                     >
                        Historical communication, courier alerts, packing rules & internal staff notes
                     </Typography>
                  </Box>
               </Stack>

               {/* Right side Total Count Badge */}
               <Chip
                  label={
                     isLoading
                        ? "Loading notes..."
                        : `${notes.length} Note${notes.length === 1 ? "" : "s"}`
                  }
                  size="small"
                  variant="outlined"
                  sx={{
                     height: 24,
                     fontSize: "0.72rem",
                     fontWeight: 700,
                     alignSelf: { xs: "flex-start", sm: "center" },
                  }}
               />
            </Stack>

            {/* Category Filter Pills (displayed when notes exist) */}
            {!isLoading && notes.length > 0 && (
               <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{
                     pb: 0.5,
                  }}
               >
                  <Chip
                     label={`All (${notes.length})`}
                     size="small"
                     clickable
                     color={activeFilter === "all" ? "primary" : "default"}
                     variant={activeFilter === "all" ? "filled" : "outlined"}
                     onClick={() => setActiveFilter("all")}
                     sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 600,
                     }}
                  />
                  {counts.customer > 0 && (
                     <Chip
                        icon={<Icon icon="solar:user-bold" size="12px" />}
                        label={`Customer (${counts.customer})`}
                        size="small"
                        clickable
                        color={activeFilter === "customer" ? "info" : "default"}
                        variant={activeFilter === "customer" ? "filled" : "outlined"}
                        onClick={() =>
                           setActiveFilter(
                              activeFilter === "customer" ? "all" : "customer",
                           )
                        }
                        sx={{
                           height: 22,
                           fontSize: "0.7rem",
                           fontWeight: 600,
                        }}
                     />
                  )}
                  {counts.courier > 0 && (
                     <Chip
                        icon={<Icon icon="solar:delivery-bold" size="12px" />}
                        label={`Courier (${counts.courier})`}
                        size="small"
                        clickable
                        color={activeFilter === "courier" ? "warning" : "default"}
                        variant={activeFilter === "courier" ? "filled" : "outlined"}
                        onClick={() =>
                           setActiveFilter(
                              activeFilter === "courier" ? "all" : "courier",
                           )
                        }
                        sx={{
                           height: 22,
                           fontSize: "0.7rem",
                           fontWeight: 600,
                        }}
                     />
                  )}
                  {counts.packing > 0 && (
                     <Chip
                        icon={<Icon icon="solar:box-bold" size="12px" />}
                        label={`Packing (${counts.packing})`}
                        size="small"
                        clickable
                        color={activeFilter === "packing" ? "secondary" : "default"}
                        variant={activeFilter === "packing" ? "filled" : "outlined"}
                        onClick={() =>
                           setActiveFilter(
                              activeFilter === "packing" ? "all" : "packing",
                           )
                        }
                        sx={{
                           height: 22,
                           fontSize: "0.7rem",
                           fontWeight: 600,
                        }}
                     />
                  )}
                  {counts.employee > 0 && (
                     <Chip
                        icon={<Icon icon="solar:shield-user-bold" size="12px" />}
                        label={`Internal (${counts.employee})`}
                        size="small"
                        clickable
                        color={activeFilter === "employee" ? "primary" : "default"}
                        variant={activeFilter === "employee" ? "filled" : "outlined"}
                        onClick={() =>
                           setActiveFilter(
                              activeFilter === "employee" ? "all" : "employee",
                           )
                        }
                        sx={{
                           height: 22,
                           fontSize: "0.7rem",
                           fontWeight: 600,
                        }}
                     />
                  )}
                  {counts.instruction > 0 && (
                     <Chip
                        icon={<Icon icon="solar:document-text-bold" size="12px" />}
                        label={`Instructions (${counts.instruction})`}
                        size="small"
                        clickable
                        color={activeFilter === "instruction" ? "default" : "default"}
                        variant={activeFilter === "instruction" ? "filled" : "outlined"}
                        onClick={() =>
                           setActiveFilter(
                              activeFilter === "instruction" ? "all" : "instruction",
                           )
                        }
                        sx={{
                           height: 22,
                           fontSize: "0.7rem",
                           fontWeight: 600,
                        }}
                     />
                  )}
               </Stack>
            )}

            {/* Notes History List */}
            {isLoading ? (
               <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ py: 3 }}
               >
                  <CircularProgress size={18} color="inherit" />
                  <Typography variant="body2" color="text.secondary">
                     Loading all existing order notes...
                  </Typography>
               </Stack>
            ) : filteredNotes.length === 0 ? (
               <Box
                  sx={{
                     py: 3,
                     px: 2,
                     textAlign: "center",
                     bgcolor: alpha(theme.palette.action.hover, 0.5),
                     borderRadius: 1,
                     border: "1px dashed",
                     borderColor: "divider",
                  }}
               >
                  <Box
                     sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        bgcolor: alpha(theme.palette.text.secondary, 0.08),
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 1,
                     }}
                  >
                     <Icon
                        icon="solar:notes-linear"
                        size="20px"
                        style={{ color: theme.palette.text.secondary }}
                     />
                  </Box>
                  <Typography
                     variant="body2"
                     fontWeight={600}
                     color="text.primary"
                     sx={{ mb: 0.5 }}
                  >
                     {activeFilter === "all"
                        ? "No notes or instructions recorded yet"
                        : `No ${activeFilter} notes found`}
                  </Typography>
                  <Typography
                     variant="caption"
                     color="text.secondary"
                     sx={{ maxWidth: 420, display: "block", mx: "auto" }}
                  >
                     {activeFilter === "all"
                        ? "Record delivery instructions, packaging rules, customer requests or confidential staff comments below."
                        : "Switch category filter back to 'All' or record a new note below."}
                  </Typography>
               </Box>
            ) : (
               <Box
                  sx={{
                     maxHeight: 280,
                     overflowY: "auto",
                     overflowX: "hidden",
                     display: "flex",
                     flexDirection: "column",
                     gap: 1.25,
                     pr: 0.5,
                     scrollbarWidth: "none !important",
                     msOverflowStyle: "none !important",
                     "&::-webkit-scrollbar": {
                        display: "none !important",
                     },
                  }}
               >
                  {filteredNotes.map((note) => (
                     <QuickEditNoteCard key={note.id} note={note} />
                  ))}
               </Box>
            )}

            {/* Add Note Form */}
            <QuickEditAddNoteForm
               onAddNote={onAddNote}
               disabled={disabled || isLoading}
            />
         </Stack>
      </Paper>
   );
};

export default QuickEditNotesSection;
