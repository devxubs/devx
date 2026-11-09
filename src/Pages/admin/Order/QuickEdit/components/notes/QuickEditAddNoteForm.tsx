import React, { useState } from "react";
import {
   Box,
   Button,
   Chip,
   Collapse,
   Grid,
   Paper,
   Stack,
   TextField,
   Tooltip,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import Icon from "@src/components/Icon";
import { OrderNoteItem } from "../../types";
import {
   NoteTypeConfig,
   NOTE_TYPE_OPTIONS,
   NOTE_TYPE_CONFIGS,
} from "./noteConfig";

interface QuickEditAddNoteFormProps {
   onAddNote: (note: {
      type: OrderNoteItem["type"];
      title: string;
      content: string;
      author?: string;
   }) => void;
   disabled?: boolean;
}

export const QuickEditAddNoteForm: React.FC<QuickEditAddNoteFormProps> = ({
   onAddNote,
   disabled = false,
}) => {
   const theme = useTheme();

   const [selectedConfig, setSelectedConfig] = useState<NoteTypeConfig>(
      NOTE_TYPE_CONFIGS.customer,
   );
   const [customTitle, setCustomTitle] = useState("");
   const [content, setContent] = useState("");
   const [errorText, setErrorText] = useState<string | null>(null);
   const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

   const handleAdd = () => {
      const cleanContent = content.trim();
      if (!cleanContent) {
         setErrorText("Please enter note content before adding.");
         return;
      }

      const finalTitle = customTitle.trim() || selectedConfig.label;

      onAddNote({
         type: selectedConfig.type,
         title: finalTitle,
         content: cleanContent,
         author: "Staff",
      });

      // Clear draft inputs
      setContent("");
      setCustomTitle("");
      setErrorText(null);

      // Trigger temporary visual feedback
      setFeedbackMsg(`Added ${selectedConfig.label}`);
      setTimeout(() => {
         setFeedbackMsg(null);
      }, 2500);
   };

   const accentColor =
      selectedConfig.color === "default"
         ? theme.palette.text.secondary
         : (theme.palette[selectedConfig.color] as any)?.main ||
           theme.palette.primary.main;

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 1,
            borderColor: "divider",
            borderTop: "1px solid",
            borderTopColor: "divider",
         }}
      >
         <Stack spacing={1.5}>
            {/* Form Header */}
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
            >
               <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                     sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                     }}
                  >
                     <Icon icon="solar:pen-new-square-bold" size="14px" />
                  </Box>
                  <Typography
                     variant="subtitle2"
                     sx={{ fontWeight: 700, fontSize: "0.825rem" }}
                  >
                     Record New Note or Instruction
                  </Typography>
               </Stack>

               {/* Feedback Toast Chip */}
               <Collapse in={Boolean(feedbackMsg)} orientation="horizontal">
                  <Chip
                     size="small"
                     color="success"
                     icon={<Icon icon="solar:check-circle-bold" size="13px" />}
                     label={feedbackMsg}
                     sx={{
                        height: 22,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                     }}
                  />
               </Collapse>
            </Stack>

            {/* Form Fields Grid */}
            <Grid container spacing={1.5}>
               {/* 1. Category Selector using CustomAutocomplete */}
               <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                  <CustomAutocomplete
                     size="small"
                     arrow
                     label="Note Category"
                     placeholder="Select note type..."
                     options={NOTE_TYPE_OPTIONS}
                     disabled={disabled}
                     value={selectedConfig}
                     onChange={(val: any) => {
                        if (val && typeof val === "object" && val.type) {
                           setSelectedConfig(val);
                        }
                     }}
                     getOptionLabel={(opt: any) =>
                        typeof opt === "string" ? opt : opt?.label || ""
                     }
                     isOptionEqualToValue={(opt: any, val: any) =>
                        opt?.type === val?.type
                     }
                     renderOption={(props, option: NoteTypeConfig) => (
                        <li {...props} key={option.type}>
                           <Stack
                              direction="row"
                              spacing={1.25}
                              alignItems="center"
                              sx={{ py: 0.5, width: "100%" }}
                           >
                              <Box
                                 sx={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 0.75,
                                    bgcolor: alpha(
                                       option.color === "default"
                                          ? theme.palette.text.secondary
                                          : (theme.palette[option.color] as any)
                                               ?.main ||
                                               theme.palette.primary.main,
                                       0.12,
                                    ),
                                    color:
                                       option.color === "default"
                                          ? theme.palette.text.secondary
                                          : `${option.color}.main`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                 }}
                              >
                                 <Icon icon={option.icon} size="14px" />
                              </Box>

                              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                 <Stack
                                    direction="row"
                                    spacing={0.75}
                                    alignItems="center"
                                 >
                                    <Typography
                                       variant="body2"
                                       sx={{
                                          fontSize: "0.825rem",
                                          fontWeight: 600,
                                       }}
                                    >
                                       {option.label}
                                    </Typography>
                                    {option.internal && (
                                       <Chip
                                          label="Internal"
                                          size="small"
                                          sx={{
                                             height: 16,
                                             fontSize: "0.6rem",
                                             fontWeight: 700,
                                             bgcolor: alpha(
                                                theme.palette.warning.main,
                                                0.12,
                                             ),
                                             color: "warning.dark",
                                          }}
                                       />
                                    )}
                                 </Stack>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                       fontSize: "0.7rem",
                                       lineHeight: 1.2,
                                       display: "block",
                                    }}
                                 >
                                    {option.description}
                                 </Typography>
                              </Box>
                           </Stack>
                        </li>
                     )}
                  />
               </Grid>

               {/* 2. Optional Title / Subject Field */}
               <Grid
                  size={{ xs: 12, sm: 6, md: 7 }}
                  sx={{
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "flex-end",
                  }}
               >
                  {/* Right: Submit Button */}
                  <Button
                     variant="contained"
                     color="primary"
                     size="small"
                     disabled={disabled || !content.trim()}
                     onClick={handleAdd}
                     startIcon={
                        <Icon
                           icon="solar:add-circle-bold"
                           size="16px"
                           style={{ color: theme.palette.text.primary }}
                        />
                     }
                     sx={{
                        fontWeight: 700,
                        height: 36,
                        px: 2.25,
                        alignSelf: { xs: "flex-end", sm: "center" },
                     }}
                  >
                     Add Note
                  </Button>
               </Grid>

               {/* 3. Note Content Textarea */}
               <Grid size={{ xs: 12 }}>
                  <TextField
                     fullWidth
                     multiline
                     rows={2.5}
                     size="small"
                     disabled={disabled}
                     label="Note Content"
                     placeholder={selectedConfig.placeholder}
                     value={content}
                     onChange={(e) => {
                        setContent(e.target.value);
                        if (errorText) setErrorText(null);
                     }}
                     error={Boolean(errorText)}
                     helperText={errorText}
                     sx={{
                        "& .MuiOutlinedInput-root": {
                           fontSize: "0.85rem",
                        },
                     }}
                  />
               </Grid>
            </Grid>

            {/* Form Footer Bar */}
            <Stack
               direction={{ xs: "column", sm: "row" }}
               justifyContent="space-between"
               alignItems={{ xs: "stretch", sm: "center" }}
               spacing={1.25}
            >
               {/* Left: Contextual Hint */}
               <Stack direction="row" spacing={0.75} alignItems="center">
                  <Icon
                     icon={
                        selectedConfig.internal
                           ? "solar:lock-keyhole-minimalistic-bold"
                           : "solar:info-circle-linear"
                     }
                     size="14px"
                     style={{
                        color: selectedConfig.internal
                           ? theme.palette.warning.main
                           : theme.palette.text.secondary,
                     }}
                  />
                  <Typography
                     variant="caption"
                     sx={{
                        fontSize: "0.72rem",
                        color: selectedConfig.internal
                           ? "warning.dark"
                           : "text.secondary",
                        fontWeight: selectedConfig.internal ? 600 : 400,
                     }}
                  >
                     {selectedConfig.internal
                        ? "Confidential: Visible only to internal staff. Hidden on client documents."
                        : `Category: ${selectedConfig.label}. Recorded chronologically.`}
                  </Typography>
               </Stack>
            </Stack>
         </Stack>
      </Paper>
   );
};

export default QuickEditAddNoteForm;
