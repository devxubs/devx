import React from "react";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";
import { useTheme } from "@mui/material";

// Custom MUI SvgIcon component converted from provided SVG
// Usage: import CustomSvgIcon from './CustomSvgIcon';
// <CustomSvgIcon fontSize="medium" />

type Props = SvgIconProps & { title?: string };

export default function SendIcon(props: Props) {
   const { title = "custom icon", ...other } = props;
   const theme = useTheme();

   return (
      <SvgIcon
         {...other}
         viewBox="0 0 24 24"
         role={"presentation"}
         aria-label={"send icon"}
         sx={{
            color: theme.palette.text.secondary,
         }}
      >
         <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.40203 6.67292C3.14203 4.33892 5.54503 2.62492 7.66803 3.63092L19.612 9.28892C21.9 10.3719 21.9 13.6279 19.612 14.7109L7.66803 20.3699C5.54503 21.3759 3.14303 19.6619 3.40203 17.3279L3.88203 12.9999H12C12.2652 12.9999 12.5196 12.8946 12.7071 12.707C12.8947 12.5195 13 12.2651 13 11.9999C13 11.7347 12.8947 11.4803 12.7071 11.2928C12.5196 11.1053 12.2652 10.9999 12 10.9999H3.88303L3.40203 6.67292Z"
         />
      </SvgIcon>
   );
}
