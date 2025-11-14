import React, { useEffect, useRef, useState } from "react";
import { Box, Stack, alpha, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Icon from "@src/components/Icon";

interface ImagePreviewProps {
   attachments: { url: string };
   close?: boolean;
   onClose?: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
   attachments,
   close,
   onClose,
}) => {
   const theme = useTheme();
   const backdropRef = useRef<HTMLDivElement>(null);
   const [scale, setScale] = useState(1);
   const [isZoomed, setIsZoomed] = useState(false);

   // ✅ Click outside to close
   const handleBackdropClick = (event: MouseEvent) => {
      if (backdropRef.current && event.target === backdropRef.current) {
         onClose?.();
      }
   };

   useEffect(() => {
      document.addEventListener("click", handleBackdropClick);
      return () => document.removeEventListener("click", handleBackdropClick);
   }, []);

   // ✅ Scroll wheel zoom
   const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.1 : -0.1;
      setScale((prev) => Math.min(Math.max(prev + zoomFactor, 0.5), 3));
   };

   // ✅ Left-click to toggle zoom in/out
   const handleClickToZoom = () => {
      setIsZoomed((prev) => !prev);
      setScale((prev) => (prev === 1 ? 2 : 1));
   };

   const resetZoom = () => {
      setIsZoomed(false);
      setScale(1);
   };

   useEffect(() => {
      if (close) {
         resetZoom();
      }
   }, [close]);

   return (
      <Stack
         ref={backdropRef}
         position="fixed"
         top={0}
         left={0}
         width="100%"
         height="100%"
         zIndex={99}
         alignItems="center"
         justifyContent="center"
         bgcolor={alpha(theme.palette.grey[900], 0.6)}
         sx={{
            backdropFilter: "blur(4px)",
            cursor: isZoomed ? "zoom-out" : "zoom-in",
         }}
      >
         <Box
            component="img"
            src={attachments.url as string}
            onWheel={handleWheel}
            onClick={handleClickToZoom}
            sx={{
               width: {
                  xs: "100%",
                  md: "70%",
               },
               height: {
                  xs: "100%",
                  md: "70%",
               },
               borderRadius: 2,
               objectFit: "contain",
               transform: `scale(${scale})`,
               transition: "transform 0.25s ease",
               userSelect: "none",
            }}
         />

         {/* ✅ Zoom Controls */}
         <Stack
            direction="row"
            justifyContent={"center"}
            spacing={1}
            position="absolute"
            bottom={32}
            bgcolor={alpha(theme.palette.background.paper, 0.6)}
            borderRadius={2}
            p={0.5}
            px={1}
         >
            <IconButton
               size="small"
               onClick={() => setScale((s) => Math.min(s + 0.2, 3))}
            >
               <Icon icon="solar:add-square-bold" />
            </IconButton>
            <IconButton
               size="small"
               onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))}
            >
               <Icon icon="solar:minus-square-bold" />
            </IconButton>
            <IconButton size="small" onClick={resetZoom}>
               <Icon icon="solar:refresh-square-bold" />
            </IconButton>
            <IconButton size="small" onClick={onClose}>
               <Icon icon="solar:close-square-bold" />
            </IconButton>
         </Stack>
      </Stack>
   );
};

export default ImagePreview;
