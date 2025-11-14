"use client";
import { Stack, Typography, Button } from "@mui/material";
import Svg404 from "@src/SvgIcon/Svg404";
import Link from "next/link";
import React from "react";

const NotFoundPage = () => {
   return (
      <Stack
         alignItems="center"
         justifyContent="center"
         width="100%"
         height="100%"
         position="fixed"
         top={0}
         left={0}
         zIndex={1300}
         bgcolor="background.default"
         spacing={3}
      >
         {/* SVG Illustration */}
         <Svg404 style={{ maxWidth: 400, width: "100%" }} />

         {/* Title */}
         <Typography variant="h3" fontWeight="bold" color="text.primary">
            404 - Page Not Found
         </Typography>

         {/* Description */}
         <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            maxWidth={400}
         >
            Oops! The page you are looking for does not exist or may have been
            moved.
         </Typography>

         {/* Buttons */}
         <Stack direction="row" spacing={2} mt={2}>
            <Button
               component={Link}
               href="/"
               variant="contained"
               color="primary"
            >
               Go Home
            </Button>
         </Stack>
      </Stack>
   );
};

export default NotFoundPage;
