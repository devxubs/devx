"use client";

import React, { useMemo } from "react";
import { Box, Typography, SxProps, Theme } from "@mui/material";
import { isHtmlContent, isDescriptionEmpty, sanitizeHtml } from "@src/lib/sanitizeHtml";

export interface HtmlRendererProps {
   content?: string | null;
   sx?: SxProps<Theme>;
   className?: string;
   fallbackText?: string;
   showFallbackIfEmpty?: boolean;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({
   content,
   sx,
   className,
   fallbackText = "No description provided.",
   showFallbackIfEmpty = false,
}) => {
   const isEmpty = isDescriptionEmpty(content);
   const isHtml = Boolean(content && isHtmlContent(content));

   const sanitizedHtml = useMemo(() => {
      if (!content || !isHtml) return "";
      return sanitizeHtml(content);
   }, [content, isHtml]);

   if (isEmpty) {
      if (showFallbackIfEmpty) {
         return (
            <Typography
               variant="body2"
               color="text.secondary"
               sx={{ fontStyle: "italic", fontSize: "0.85rem", ...sx }}
               className={className}
            >
               {fallbackText}
            </Typography>
         );
      }
      return null;
   }

   // Render plain text directly with preserved line breaks and formatting
   if (!isHtml) {
      return (
         <Typography
            variant="body2"
            sx={{
               whiteSpace: "pre-wrap",
               wordBreak: "break-word",
               color: "text.primary",
               lineHeight: 1.6,
               fontSize: "0.875rem",
               ...sx,
            }}
            className={className}
         >
            {content}
         </Typography>
      );
   }

   // Render sanitized HTML with theme-consistent rich-text styles
   return (
      <Box
         className={className}
         suppressHydrationWarning
         sx={{
            color: "text.primary",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            wordBreak: "break-word",

            // Paragraphs
            "& p": {
               m: 0,
               mb: 1,
               lineHeight: 1.6,
               "&:last-child": {
                  mb: 0,
               },
            },

            // Headings
            "& h1, & h2, & h3, & h4, & h5, & h6": {
               color: "text.primary",
               fontWeight: 700,
               letterSpacing: "-0.01em",
               mt: 1.5,
               mb: 0.75,
               "&:first-child": {
                  mt: 0,
               },
            },
            "& h1": { fontSize: "1.35rem", lineHeight: 1.3 },
            "& h2": { fontSize: "1.2rem", lineHeight: 1.35 },
            "& h3": { fontSize: "1.05rem", lineHeight: 1.4 },
            "& h4": { fontSize: "0.95rem", lineHeight: 1.4 },
            "& h5": { fontSize: "0.875rem", lineHeight: 1.45 },
            "& h6": { fontSize: "0.825rem", lineHeight: 1.45 },

            // Inline Formatting
            "& strong, & b": {
               fontWeight: 700,
               color: "text.primary",
            },
            "& em, & i": {
               fontStyle: "italic",
            },
            "& u": {
               textDecoration: "underline",
            },
            "& s, & strike, & del": {
               textDecoration: "line-through",
               color: "text.secondary",
            },

            // Lists
            "& ul, & ol": {
               pl: 2.75,
               my: 0.75,
               "&:first-child": {
                  mt: 0,
               },
               "&:last-child": {
                  mb: 0,
               },
            },
            "& ul": {
               listStyleType: "disc",
            },
            "& ol": {
               listStyleType: "decimal",
            },
            "& li": {
               mb: 0.35,
               lineHeight: 1.6,
               "&::marker": {
                  color: "text.secondary",
               },
               "& p": {
                  mb: 0.25,
               },
            },

            // Links
            "& a, & a.custom-link": {
               color: "primary.main",
               textDecoration: "underline",
               fontWeight: 500,
               wordBreak: "break-all",
               transition: "color 0.15s ease",
               "&:hover": {
                  color: "primary.light",
               },
            },

            // Blockquotes
            "& blockquote": {
               borderLeft: 3,
               borderColor: "primary.main",
               pl: 1.5,
               py: 0.25,
               my: 1,
               color: "text.secondary",
               fontStyle: "italic",
               "& p": {
                  mb: 0.25,
               },
            },

            // Code & Preformatted Blocks
            "& code": {
               px: 0.75,
               py: 0.25,
               borderRadius: 0.75,
               bgcolor: "action.hover",
               fontSize: "0.82rem",
               fontFamily: "monospace",
               color: "text.primary",
               border: 1,
               borderColor: "divider",
            },
            "& pre": {
               p: 1.5,
               borderRadius: 1,
               bgcolor: "background.default",
               border: 1,
               borderColor: "divider",
               overflowX: "auto",
               fontSize: "0.82rem",
               my: 1,
               "& code": {
                  p: 0,
                  bgcolor: "transparent",
                  border: "none",
               },
            },

            // Horizontal Rule
            "& hr": {
               border: "none",
               borderTop: 1,
               borderColor: "divider",
               my: 1.5,
            },

            // Images inside content
            "& img": {
               maxWidth: "100%",
               height: "auto",
               borderRadius: 1,
               border: 1,
               borderColor: "divider",
               my: 1,
            },

            // Text alignment styles (from Tiptap align extension)
            "& [style*='text-align: center']": {
               textAlign: "center",
            },
            "& [style*='text-align: right']": {
               textAlign: "right",
            },
            "& [style*='text-align: justify']": {
               textAlign: "justify",
            },
            "& [style*='text-align: left']": {
               textAlign: "left",
            },

            ...sx,
         }}
         dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
   );
};

export default HtmlRenderer;
