"use client";

// SVG barcode renderer (Phase 4, §4.1) — draws a Code 128 (set B)
// symbol from @src/lib/barcode, with the encoded value printed
// beneath it in human-readable form. Pure presentation: no state,
// no fetching. If the value contains characters Code 128 set B
// cannot encode, it renders the raw text only (never a wrong code).

import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { code128BWidths } from "@src/lib/barcode";

interface BarcodeProps {
   value: string;
   /** Bar height in px (the text line adds ~14px below). */
   height?: number;
   /** Width of one narrow module in px. */
   moduleWidth?: number;
   showText?: boolean;
}

const Barcode: React.FC<BarcodeProps> = ({
   value,
   height = 40,
   moduleWidth = 1.6,
   showText = true,
}) => {
   const bars = useMemo(() => {
      try {
         const widths = code128BWidths(value);
         const rects: { x: number; w: number }[] = [];
         let x = 0;
         widths.forEach((w, i) => {
            if (i % 2 === 0) rects.push({ x, w }); // even indexes are bars
            x += w;
         });
         return { rects, totalModules: x };
      } catch {
         return null;
      }
   }, [value]);

   if (!bars) {
      return (
         <Typography variant="caption" fontFamily="monospace">
            {value}
         </Typography>
      );
   }

   const quiet = 10; // quiet zone modules on each side
   const svgWidth = (bars.totalModules + quiet * 2) * moduleWidth;

   return (
      <Box sx={{ display: "inline-block", textAlign: "center", bgcolor: "#fff" }}>
         <svg
            width={svgWidth}
            height={height}
            viewBox={`0 0 ${svgWidth} ${height}`}
            role="img"
            aria-label={`Barcode ${value}`}
            style={{ display: "block" }}
         >
            <rect x={0} y={0} width={svgWidth} height={height} fill="#fff" />
            {bars.rects.map((r, i) => (
               <rect
                  key={i}
                  x={(r.x + quiet) * moduleWidth}
                  y={0}
                  width={r.w * moduleWidth}
                  height={height}
                  fill="#000"
               />
            ))}
         </svg>
         {showText && (
            <Typography
               variant="caption"
               sx={{
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  color: "#000",
                  lineHeight: 1.2,
               }}
            >
               {value}
            </Typography>
         )}
      </Box>
   );
};

export default Barcode;
