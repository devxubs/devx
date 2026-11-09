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
   Divider,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { EmployeeActivity } from "../types/trackingTypes";
import {
   deriveEmployeeActivities,
   groupActivitiesByDate,
   formatEmployeeCode,
} from "../helpers/trackingHelpers";

interface EmployeeActivityTimelineProps {
   order: any;
   activities?: EmployeeActivity[];
}

export default function EmployeeActivityTimeline({
   order,
   activities: customActivities,
}: EmployeeActivityTimelineProps) {
   const theme = useTheme();
   const activities = customActivities || deriveEmployeeActivities(order);
   const grouped = groupActivitiesByDate(activities);

   const staffName = order?.employee?.name || "DevX System Administrator";
   const cleanEmployeeCode = formatEmployeeCode(order?.employee, order?.employeeId);

   const getCategoryTheme = (category: string) => {
      switch (category) {
         case "order":
            return {
               color: theme.palette.primary.main,
               bg: alpha(theme.palette.primary.main, 0.1),
               border: alpha(theme.palette.primary.main, 0.25),
            };
         case "invoice":
            return {
               color: theme.palette.success.main,
               bg: alpha(theme.palette.success.main, 0.1),
               border: alpha(theme.palette.success.main, 0.25),
            };
         case "workflow":
            return {
               color: theme.palette.info.main,
               bg: alpha(theme.palette.info.main, 0.1),
               border: alpha(theme.palette.info.main, 0.25),
            };
         case "courier":
            return {
               color: theme.palette.secondary.main,
               bg: alpha(theme.palette.secondary.main, 0.1),
               border: alpha(theme.palette.secondary.main, 0.25),
            };
         case "note":
            return {
               color: theme.palette.warning.main,
               bg: alpha(theme.palette.warning.main, 0.1),
               border: alpha(theme.palette.warning.main, 0.25),
            };
         default:
            return {
               color: theme.palette.text.secondary,
               bg: "action.hover",
               border: theme.palette.divider,
            };
      }
   };

   // Empty State
   if (!activities || activities.length === 0) {
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
                  <Icon icon="solar:user-id-bold-duotone" size="medium" />
               </Box>
               <Typography variant="subtitle2" fontWeight={600}>
                  No Staff Activity Records
               </Typography>
               <Typography variant="caption" color="text.secondary" maxWidth={360}>
                  Activity logs including creation, invoice billing, and logistics handover will be registered here.
               </Typography>
            </Stack>
         </Paper>
      );
   }

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
                     bgcolor: alpha(theme.palette.secondary.main, 0.1),
                     color: "secondary.main",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                  }}
               >
                  <Icon icon="solar:history-bold-duotone" size="16px" />
               </Box>
               <Box>
                  <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                     Operational Audit & Staff Activity
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     Chronological record of staff actions on this order
                  </Typography>
               </Box>
            </Stack>

            <Chip
               size="small"
               label={`${activities.length} ${
                  activities.length === 1 ? "Event Logged" : "Events Logged"
               }`}
               variant="outlined"
               sx={{
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  height: 24,
               }}
            />
         </Box>

         {/* Activities Container */}
         <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack spacing={2}>
               {grouped.map((group, gIdx) => (
                  <Box key={gIdx}>
                     {/* Date Group Header Divider */}
                     <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        mb={1.5}
                     >
                        <Chip
                           size="small"
                           label={group.dateLabel}
                           icon={<Icon icon="solar:calendar-date-bold" size="13px" />}
                           sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              bgcolor: "action.hover",
                              color: "text.primary",
                              borderRadius: 0.75,
                              "& .MuiChip-icon": { ml: 0.5 },
                           }}
                        />
                        <Divider sx={{ flex: 1, borderColor: "divider" }} />
                     </Stack>

                     {/* Activity Items in Group */}
                     <Stack spacing={0}>
                        {group.activities.map((act, aIdx) => {
                           const isLastInGroup = aIdx === group.activities.length - 1;
                           const catTheme = getCategoryTheme(act.category);

                           return (
                              <Stack
                                 key={act.id || aIdx}
                                 direction="row"
                                 spacing={2}
                                 alignItems="flex-start"
                              >
                                 {/* Indicator Column */}
                                 <Stack alignItems="center" sx={{ minWidth: 32 }}>
                                    <Box
                                       sx={{
                                          width: 30,
                                          height: 30,
                                          borderRadius: "50%",
                                          display: "grid",
                                          placeItems: "center",
                                          bgcolor: catTheme.bg,
                                          color: catTheme.color,
                                          border: `1px solid ${catTheme.border}`,
                                          flexShrink: 0,
                                          zIndex: 1,
                                       }}
                                    >
                                       <Icon icon={act.icon} size="small" />
                                    </Box>

                                    {!isLastInGroup && (
                                       <Box
                                          sx={{
                                             width: "2px",
                                             height: "100%",
                                             minHeight: 22,
                                             bgcolor: "divider",
                                             my: 0.25,
                                          }}
                                       />
                                    )}
                                 </Stack>

                                 {/* Activity Details Column */}
                                 <Box
                                    flex={1}
                                    minWidth={0}
                                    pb={isLastInGroup ? 0.75 : 1.5}
                                    pt={0.25}
                                 >
                                    {/* Action Header */}
                                    <Stack
                                       direction="row"
                                       justifyContent="space-between"
                                       alignItems="center"
                                       flexWrap="wrap"
                                       gap={0.5}
                                    >
                                       <Stack direction="row" spacing={1} alignItems="center">
                                          <Typography
                                             variant="body2"
                                             fontWeight={act.isImportant ? 700 : 600}
                                             color="text.primary"
                                          >
                                             {act.action}
                                          </Typography>

                                          {act.badgeLabel && (
                                             <Chip
                                                label={act.badgeLabel}
                                                size="small"
                                                sx={{
                                                   height: 18,
                                                   fontSize: "0.65rem",
                                                   fontWeight: 700,
                                                   bgcolor: catTheme.bg,
                                                   color: catTheme.color,
                                                   border: `1px solid ${catTheme.border}`,
                                                }}
                                             />
                                          )}
                                       </Stack>

                                       <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontVariantNumeric: "tabular-nums" }}
                                       >
                                          {act.time}
                                       </Typography>
                                    </Stack>

                                    {/* Actor Subtitle */}
                                    {(() => {
                                       const actorEmpCode =
                                          act.actor.employeeCode || cleanEmployeeCode;
                                       const actorRoleClean = (act.actor.role || "Staff").replace(
                                          /\s*\([^)]*\)$/,
                                          "",
                                       );
                                       const roleBadgeText = [actorRoleClean, actorEmpCode]
                                          .filter(Boolean)
                                          .join(" • ");
                                       return (
                                          <Typography
                                             variant="caption"
                                             color="text.secondary"
                                             display="block"
                                             mt={0.25}
                                          >
                                             By <b>{act.actor.name}</b> ({roleBadgeText})
                                          </Typography>
                                       );
                                    })()}

                                    {/* Detailed Description with clean diff display */}
                                    <Box
                                       sx={{
                                          mt: 0.5,
                                          p: 0.75,
                                          px: 1.25,
                                          borderRadius: 0.75,
                                          bgcolor: alpha(theme.palette.text.primary, 0.02),
                                          border: `1px solid ${theme.palette.divider}`,
                                       }}
                                    >
                                       <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                             display: "block",
                                             lineHeight: 1.4,
                                          }}
                                       >
                                          {act.details}
                                       </Typography>

                                       {/* When previous and updated content exist, display cleanly */}
                                       {act.diff && (act.diff.previous || act.diff.new) && (
                                          <Box sx={{ mt: 0.5, pt: 0.5, borderTop: `1px dashed ${alpha(theme.palette.divider, 0.6)}` }}>
                                             {act.diff.previous && (
                                                <Typography
                                                   variant="caption"
                                                   color="text.secondary"
                                                   sx={{ display: "block", fontSize: "0.72rem" }}
                                                >
                                                   <span style={{ fontWeight: 600 }}>Previous:</span>{" "}
                                                   <span style={{ textDecoration: "line-through", opacity: 0.75 }}>
                                                      {String(act.diff.previous)}
                                                   </span>
                                                </Typography>
                                             )}
                                             {act.diff.new && (
                                                <Typography
                                                   variant="caption"
                                                   color="text.primary"
                                                   sx={{ display: "block", fontSize: "0.72rem", fontWeight: 500 }}
                                                >
                                                   <span style={{ fontWeight: 600, color: theme.palette.text.secondary }}>Updated:</span>{" "}
                                                   {String(act.diff.new)}
                                                </Typography>
                                             )}
                                          </Box>
                                       )}
                                    </Box>
                                 </Box>
                              </Stack>
                           );
                        })}
                     </Stack>
                  </Box>
               ))}
            </Stack>
         </Box>
      </Paper>
   );
}
