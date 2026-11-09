"use client";

import React from "react";
import {
   Box,
   Stack,
   Typography,
   Chip,
   Paper,
   useTheme,
   alpha,
   Tooltip,
   IconButton,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { TrackingStep } from "../types/trackingTypes";
import { deriveTrackingSteps } from "../helpers/trackingHelpers";

interface OrderTrackingProps {
   order: any;
   steps?: TrackingStep[];
}

export default function OrderTracking({
   order,
   steps: customSteps,
}: OrderTrackingProps) {
   const theme = useTheme();
   const steps = customSteps || deriveTrackingSteps(order);
   const [copiedId, setCopiedId] = React.useState<string | null>(null);

   const handleCopy = (text: string, id: string) => {
      navigator.clipboard?.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
   };

   // Empty State handling
   if (!steps || steps.length === 0) {
      return (
         <Paper
            variant="outlined"
            sx={{
               p: 4,
               borderRadius: 1,
               textAlign: "center",
               bgcolor: "background.paper",
               borderStyle: "dashed",
               borderColor: "divider",
            }}
         >
            <Stack alignItems="center" spacing={1.5}>
               <Box
                  sx={{
                     width: 48,
                     height: 48,
                     borderRadius: 1,
                     bgcolor: "action.hover",
                     color: "text.secondary",
                     display: "grid",
                     placeItems: "center",
                  }}
               >
                  <Icon icon="solar:route-line-duotone" size="medium" />
               </Box>
               <Typography variant="subtitle2" fontWeight={600}>
                  No Tracking History Available
               </Typography>
               <Typography variant="caption" color="text.secondary" maxWidth={360}>
                  Tracking status timeline will be recorded once the order begins processing and logistics dispatch.
               </Typography>
            </Stack>
         </Paper>
      );
   }

   const currentStep = steps.find((s) => s.state === "current") || steps[steps.length - 1];
   const isOrderCancelled =
      currentStep?.state === "cancelled" ||
      currentStep?.title?.toLowerCase().includes("cancelled") ||
      currentStep?.title?.toLowerCase().includes("failed") ||
      currentStep?.title?.toLowerCase().includes("returned");

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
               py: 1.5,
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
                     width: 28,
                     height: 28,
                     borderRadius: 0.75,
                     bgcolor: alpha(
                        isOrderCancelled ? theme.palette.error.main : theme.palette.primary.main,
                        0.1,
                     ),
                     color: isOrderCancelled ? "error.main" : "primary.main",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                  }}
               >
                  <Icon icon="solar:route-bold-duotone" size="16px" />
               </Box>
               <Box>
                  <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                     Fulfillment & Tracking Lifecycle
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     Stage progression from order intake to recipient delivery
                  </Typography>
               </Box>
            </Stack>

            {currentStep && (
               <Chip
                  size="small"
                  label={`Current: ${currentStep.title}`}
                  color={
                     currentStep.state === "completed"
                        ? "success"
                        : isOrderCancelled
                          ? "error"
                          : "primary"
                  }
                  variant="outlined"
                  sx={{
                     fontWeight: 700,
                     fontSize: "0.72rem",
                     height: 24,
                     bgcolor: alpha(
                        currentStep.state === "completed"
                           ? theme.palette.success.main
                           : isOrderCancelled
                             ? theme.palette.error.main
                             : theme.palette.primary.main,
                        0.06,
                     ),
                  }}
               />
            )}
         </Box>

         {/* Timeline Container */}
         <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack spacing={0}>
               {steps.map((step, idx) => {
                  const isLast = idx === steps.length - 1;
                  const isCompleted = step.state === "completed";
                  const isCurrent = step.state === "current";
                  const isCancelled =
                     step.state === "cancelled" ||
                     step.icon === "solar:close-circle-bold" ||
                     step.title?.toLowerCase().includes("cancelled") ||
                     step.title?.toLowerCase().includes("failed") ||
                     step.title?.toLowerCase().includes("returned");
                  const isSkipped = step.state === "skipped";
                  const isPending = step.state === "pending";

                  // Node color styling
                  let nodeBg = "action.hover";
                  let nodeColor = "text.disabled";
                  let nodeBorder = `1px solid ${theme.palette.divider}`;
                  let boxShadow = "none";

                  if (isCurrent && isCancelled) {
                     nodeBg = alpha(theme.palette.error.main, 0.14);
                     nodeColor = theme.palette.error.main;
                     nodeBorder = `2px solid ${theme.palette.error.main}`;
                     boxShadow = `0 0 0 4px ${alpha(theme.palette.error.main, 0.15)}`;
                  } else if (isCurrent) {
                     nodeBg = alpha(theme.palette.primary.main, 0.14);
                     nodeColor = theme.palette.primary.main;
                     nodeBorder = `2px solid ${theme.palette.primary.main}`;
                     boxShadow = `0 0 0 4px ${alpha(theme.palette.primary.main, 0.15)}`;
                  } else if (isCompleted) {
                     nodeBg = alpha(theme.palette.success.main, 0.12);
                     nodeColor = theme.palette.success.main;
                     nodeBorder = `1px solid ${alpha(theme.palette.success.main, 0.3)}`;
                  } else if (isCancelled) {
                     nodeBg = alpha(theme.palette.error.main, 0.12);
                     nodeColor = theme.palette.error.main;
                     nodeBorder = `1px solid ${alpha(theme.palette.error.main, 0.3)}`;
                  } else if (isSkipped) {
                     nodeBg = "action.hover";
                     nodeColor = theme.palette.text.disabled;
                     nodeBorder = `1px dashed ${theme.palette.divider}`;
                  }

                  // Connector line styling
                  const lineCompleted = isCompleted;
                  const lineBorderColor = lineCompleted
                     ? theme.palette.success.main
                     : theme.palette.divider;
                  const lineBorderStyle = lineCompleted ? "solid" : "dashed";

                  return (
                     <Stack
                        key={step.id || idx}
                        direction="row"
                        spacing={2}
                        alignItems="flex-start"
                     >
                        {/* Left Track: Node + Vertical Line */}
                        <Stack alignItems="center" sx={{ minWidth: 36 }}>
                           <Box
                              sx={{
                                 width: 34,
                                 height: 34,
                                 borderRadius: "50%",
                                 display: "grid",
                                 placeItems: "center",
                                 bgcolor: nodeBg,
                                 color: nodeColor,
                                 border: nodeBorder,
                                 boxShadow,
                                 transition: "all 0.2s ease-in-out",
                                 flexShrink: 0,
                                 zIndex: 1,
                              }}
                           >
                              <Icon
                                 icon={
                                    isCompleted && step.id !== "step-final"
                                       ? "solar:check-circle-bold"
                                       : step.icon
                                 }
                                 size="small"
                              />
                           </Box>

                           {!isLast && (
                              <Box
                                 sx={{
                                    width: "2px",
                                    height: "100%",
                                    minHeight: 44,
                                    borderLeftWidth: "2px",
                                    borderLeftStyle: lineBorderStyle,
                                    borderLeftColor: lineBorderColor,
                                    opacity: isPending || isSkipped ? 0.4 : 0.9,
                                    my: 0.5,
                                 }}
                              />
                           )}
                        </Stack>

                        {/* Right Content */}
                        <Box
                            flex={1}
                            minWidth={0}
                            pb={isLast ? 0.5 : 2.5}
                            pt={0.25}
                        >
                           {/* Step Header */}
                           <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="flex-start"
                              flexWrap="wrap"
                              gap={0.5}
                              mb={0.5}
                           >
                              <Stack direction="row" spacing={1} alignItems="center">
                                 <Typography
                                    variant="body2"
                                    fontWeight={isCurrent ? 700 : 600}
                                    color={
                                       isPending || isSkipped
                                          ? "text.secondary"
                                          : isCancelled
                                            ? "error.main"
                                            : "text.primary"
                                    }
                                 >
                                    {step.title}
                                 </Typography>

                                 {isCurrent && (
                                    <Chip
                                       label={isCancelled ? "Cancelled" : "Current"}
                                       size="small"
                                       color={isCancelled ? "error" : "primary"}
                                       sx={{
                                          height: 18,
                                          fontSize: "0.65rem",
                                          fontWeight: 700,
                                          px: 0.5,
                                       }}
                                    />
                                 )}

                                 {isSkipped && (
                                    <Chip
                                       label="Skipped"
                                       size="small"
                                       sx={{
                                          height: 18,
                                          fontSize: "0.62rem",
                                          fontWeight: 600,
                                          px: 0.5,
                                          bgcolor: "action.hover",
                                          color: "text.disabled",
                                       }}
                                    />
                                 )}
                              </Stack>

                              {step.timestamp && (
                                 <Typography
                                    variant="caption"
                                    color={isPending || isSkipped ? "text.secondary" : "text.primary"}
                                    fontWeight={500}
                                    sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.75rem" }}
                                 >
                                    {step.timestamp}
                                 </Typography>
                              )}
                           </Stack>

                           {/* Description */}
                           {step.description && (
                              <Typography
                                 variant="caption"
                                 color="text.secondary"
                                 display="block"
                                 lineHeight={1.45}
                                 sx={{ fontSize: "0.78rem" }}
                                 mb={step.metadata || step.note ? 0.75 : 0}
                              >
                                 {step.description}
                              </Typography>
                           )}

                           {/* Metadata Pills */}
                           {step.metadata && step.metadata.length > 0 && (
                              <Stack
                                 direction="row"
                                 spacing={1}
                                 flexWrap="wrap"
                                 gap={0.75}
                                 mt={0.75}
                              >
                                 {step.metadata.map((meta, mIdx) => (
                                    <Box
                                       key={mIdx}
                                       sx={{
                                          px: 1,
                                          py: 0.25,
                                          borderRadius: 0.75,
                                          bgcolor: meta.highlight
                                             ? alpha(theme.palette.primary.main, 0.08)
                                             : "action.hover",
                                          border: 1,
                                          borderColor: meta.highlight
                                             ? alpha(theme.palette.primary.main, 0.2)
                                             : "divider",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 0.75,
                                       }}
                                    >
                                       <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          fontWeight={500}
                                          sx={{ fontSize: "0.7rem" }}
                                       >
                                          {meta.label}:
                                       </Typography>
                                       <Typography
                                          variant="caption"
                                          fontWeight={meta.highlight ? 700 : 600}
                                          color={
                                             meta.highlight
                                                ? "primary.main"
                                                : "text.primary"
                                          }
                                          sx={{ fontSize: "0.7rem" }}
                                       >
                                          {meta.value}
                                       </Typography>

                                       {meta.label === "Tracking ID" && (
                                          <Tooltip
                                             title={
                                                copiedId === meta.value
                                                   ? "Copied!"
                                                   : "Copy Tracking ID"
                                             }
                                             arrow
                                          >
                                             <IconButton
                                                size="small"
                                                onClick={() =>
                                                   handleCopy(meta.value, meta.value)
                                                }
                                                sx={{ p: 0.25, ml: -0.25 }}
                                             >
                                                <Icon
                                                   icon={
                                                      copiedId === meta.value
                                                         ? "solar:check-read-bold"
                                                         : "solar:copy-bold"
                                                   }
                                                   size="13px"
                                                   color={
                                                      copiedId === meta.value
                                                         ? "success"
                                                         : "default"
                                                   }
                                                />
                                             </IconButton>
                                          </Tooltip>
                                       )}
                                    </Box>
                                 ))}
                              </Stack>
                           )}

                           {/* Notes Callout */}
                           {step.note && (
                              <Box
                                 sx={{
                                    mt: 1,
                                    p: 1.25,
                                    borderRadius: 1,
                                    bgcolor: alpha(theme.palette.warning.main, 0.06),
                                    border: 1,
                                    borderColor: alpha(theme.palette.warning.main, 0.25),
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 1,
                                 }}
                              >
                                 <Box sx={{ color: "warning.main", mt: 0.25 }}>
                                    <Icon icon="solar:notes-bold" size="15px" />
                                 </Box>
                                 <Typography
                                    variant="caption"
                                    color="text.primary"
                                    sx={{ fontStyle: "italic", lineHeight: 1.4 }}
                                 >
                                    {step.note}
                                 </Typography>
                              </Box>
                           )}
                        </Box>
                     </Stack>
                  );
               })}
            </Stack>
         </Box>
      </Paper>
   );
}
