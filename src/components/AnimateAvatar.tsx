import { Box, Avatar, useTheme, SxProps } from "@mui/material";
import { keyframes } from "@emotion/react";

// Keyframes for rotating border
const rotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

interface AnimatedAvatarProps {
   size?: "small" | "medium" | "large";
   src?: string;
}

const AnimatedAvatar = ({ size, src }: AnimatedAvatarProps) => {
   const theme = useTheme();

   return (
      <Box
         sx={{
            position: "relative",
            width:
               size === "small"
                  ? 40
                  : size === "medium"
                  ? 60
                  : size === "large"
                  ? 96
                  : 40,
            height:
               size === "small"
                  ? 40
                  : size === "medium"
                  ? 60
                  : size === "large"
                  ? 96
                  : 40,
            display: "inline-block",
         }}
      >
         {/* Animated circular border */}
         <Box
            sx={{
               position: "absolute",
               top: 0,
               left: 0,
               width: "100%",
               height: "100%",
               borderRadius: "50%",
               background: `conic-gradient(
            ${theme.palette.primary.main} 0%,
            ${theme.palette.primary.main} 25%,
            ${theme.palette.warning.main}  75%,
            ${theme.palette.warning.main} 100%
          )`,
               animation: `${rotate} 8s linear infinite`,
               zIndex: 1,
               padding: "1px", // thickness of the border
               boxSizing: "border-box",
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               filter: "blur(0.7px)",
               backdropFilter: "blur(8px)",
            }}
         >
            <Box
               sx={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  backgroundColor: "background.default",
               }}
            />
         </Box>

         {/* Avatar (inside background circle) */}
         <Avatar
            alt="Jaydon Frankie"
            src={src}
            sx={{
               position: "absolute",
               top: "50%",
               left: "50%",
               transform: "translate(-50%, -50%)",
               zIndex: 2,
               width: "90%",
               height: "90%",
            }}
         />
      </Box>
   );
};

export default AnimatedAvatar;
