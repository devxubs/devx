import { Box, Typography, Tooltip, IconButton } from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useState } from "react";

export interface CustomerInfoProps {
   name: string;
   email?: string;
   phone: number | string;
   url?: string;
   onNameClick?: () => void;
}

const CustomerInfo = ({
   name,
   email,
   phone,
   url,
   onNameClick,
}: CustomerInfoProps) => {
   const [phoneCopied, setPhoneCopied] = useState(false);

   const handleCopyPhone = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!phone || phone === "-") return;
      navigator.clipboard.writeText(String(phone));
      setPhoneCopied(true);
      setTimeout(() => {
         setPhoneCopied(false);
      }, 2000);
   };

   const handleWhatsApp = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!phone || phone === "-") return;
      const rawDigits = String(phone).replace(/\D/g, "");
      const formattedNumber =
         rawDigits.length === 11 && rawDigits.startsWith("0")
            ? `88${rawDigits}`
            : rawDigits;
      window.open(`https://wa.me/${formattedNumber}`, "_blank");
   };

   const handleCall = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!phone || phone === "-") return;
      window.open(`tel:${phone}`);
   };

   const hasPhone = Boolean(phone && phone !== "-");

   return (
      <Box
         sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            minWidth: 0,
            py: 0.5,
         }}
      >
         {/* Customer Details: Name & Phone */}
         <Box
            sx={{
               minWidth: 0,
               flex: 1,
               mr: 1,
               display: "flex",
               flexDirection: "column",
               justifyContent: "center",
               overflow: "hidden",
            }}
         >
            <Typography
               variant="body2"
               color="textPrimary"
               noWrap
               onClick={(e) => {
                  if (onNameClick) {
                     e.stopPropagation();
                     onNameClick();
                  }
               }}
               sx={{
                  "&:hover": {
                     textDecoration: onNameClick ? "underline" : "none",
                  },
                  cursor: onNameClick ? "pointer" : "default",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: 500,
                  lineHeight: 1.3,
               }}
            >
               {name}
            </Typography>
            <Tooltip
               title={
                  hasPhone ? (phoneCopied ? "Copied!" : "Click to copy") : ""
               }
               disableInteractive
            >
               <Typography
                  variant="body2"
                  fontSize={13}
                  color="textSecondary"
                  noWrap
                  onClick={handleCopyPhone}
                  sx={{
                     overflow: "hidden",
                     textOverflow: "ellipsis",
                     lineHeight: 1.3,
                     cursor: hasPhone ? "pointer" : "default",
                     "&:hover": {
                        textDecoration: hasPhone ? "underline" : "none",
                        color: hasPhone ? "text.primary" : "textSecondary",
                     },
                  }}
               >
                  {phone || "—"}
               </Typography>
            </Tooltip>
         </Box>

         {/* Dedicated flex column container for action buttons */}
         <Box
            sx={{
               display: "flex",
               flexDirection: "column",
               alignItems: "center",
               justifyContent: "center",
               flexShrink: 0,
               width: 24,
               minWidth: 24,
               gap: "2px",
            }}
         >
            <Tooltip title="WhatsApp" placement="left" disableInteractive arrow>
               <span style={{ display: "inline-flex" }}>
                  <IconButton
                     size="small"
                     color="success"
                     onClick={handleWhatsApp}
                     disabled={!hasPhone}
                     aria-label="WhatsApp"
                     sx={{
                        width: 30,
                        height: 30,
                        p: 0,
                        borderRadius: "4px",
                        "&:hover": {
                           bgcolor: "action.hover",
                        },
                     }}
                  >
                     <Icon
                        icon="ic:baseline-whatsapp"
                        size="20px"
                        color="success"
                     />
                  </IconButton>
               </span>
            </Tooltip>
            <Tooltip title="Call" placement="left" disableInteractive arrow>
               <span style={{ display: "inline-flex" }}>
                  <IconButton
                     size="small"
                     color="primary"
                     onClick={handleCall}
                     disabled={!hasPhone}
                     aria-label="Call"
                     sx={{
                        width: 30,
                        height: 30,
                        p: 0,
                        borderRadius: "4px",
                        "&:hover": {
                           bgcolor: "action.hover",
                        },
                     }}
                  >
                     <Icon
                        icon="solar:outgoing-call-rounded-bold"
                        size="20px"
                        // color="primary"
                     />
                  </IconButton>
               </span>
            </Tooltip>
         </Box>
      </Box>
   );
};

export default CustomerInfo;
