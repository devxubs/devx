import React from "react";
import { SvgIcon, type SvgIconProps, useTheme } from "@mui/material";

const LogoIcon = (props: SvgIconProps) => {
  const theme = useTheme();

  return (
    <SvgIcon
      {...props}
      viewBox="0 0 512 512"
      sx={{ width: "100%", height: "100%" }}
    >
      {/* <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="4" width="12" height="12" rx="3" fill="#2563EB" />
        <rect x="20" y="4" width="12" height="12" rx="3" fill="#3B82F6" />
        <rect x="4" y="20" width="12" height="12" rx="3" fill="#93C5FD" />
        <rect x="20" y="20" width="12" height="12" rx="3" fill="#2563EB" />
      </svg> */}
      <defs>
        <linearGradient
          id="r12-1"
          x1="152"
          y1="167.79"
          x2="65.523"
          y2="259.624"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={theme.palette.primary.dark} />
          <stop offset="1" stopColor={theme.palette.primary.main} />
        </linearGradient>
        <linearGradient
          id="r12-2"
          x1="86"
          y1="128"
          x2="86"
          y2="384"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={theme.palette.primary.light} />
          <stop offset="1" stopColor={theme.palette.primary.main} />
        </linearGradient>
        <linearGradient
          id="r12-3"
          x1="402"
          y1="288"
          x2="402"
          y2="384"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={theme.palette.primary.light} />
          <stop offset="1" stopColor={theme.palette.primary.main} />
        </linearGradient>
      </defs>

      <path
        fill="url(#r12-1)"
        d="M86.352 246.358C137.511 214.183 161.836 245.017 183.168 285.573C165.515 317.716 153.837 337.331 148.132 344.418C137.373 357.788 125.636 367.911 111.202 373.752C80.856 388.014 43.132 388.681 14 371.048L86.352 246.358Z"
      />
      <path
        fill="url(#r12-2)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M444.31 229.726C398.04 148.77 350.21 72.498 295.267 184.382C287.751 198.766 282.272 226.719 270 226.719V226.577C257.728 226.577 252.251 198.624 244.735 184.24C189.79 72.356 141.96 148.628 95.689 229.584C92.207 235.69 88.862 241.516 86 246.58C192.038 179.453 183.11 382.247 270 383.858V384C356.891 382.389 347.962 179.595 454 246.72C451.139 241.658 447.794 235.832 444.31 229.726Z"
      />
      <path
        fill="url(#r12-3)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M450 384C476.509 384 498 362.509 498 336C498 309.491 476.509 288 450 288C423.491 288 402 309.491 402 336C402 362.509 423.491 384 450 384Z"
      />
    </SvgIcon>
  );
};

export default LogoIcon;
