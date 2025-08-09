import React from "react";

const SidebarShort: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 86 64"
    width="96"
    height="74"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_1153_589)">
      <mask id="path-2-inside-1_1153_589" fill="white">
        <path d="M0 0H22V64H0V0Z" />
      </mask>
      <path
        d="M21 0V64H23V0H21Z"
        fill="currentColor"
        fillOpacity="0.08"
        mask="url(#path-2-inside-1_1153_589)"
      />
      <circle opacity="0.8" cx="11" cy="11" r="5" fill="currentColor" />
      <rect
        opacity="0.48"
        x="6"
        y="20"
        width="10"
        height="4"
        rx="2"
        fill="currentColor"
      />
      <rect
        opacity="0.24"
        x="6"
        y="28"
        width="10"
        height="4"
        rx="2"
        fill="currentColor"
      />
      <rect
        opacity="0.2"
        x="26"
        y="4"
        width="56"
        height="56"
        rx="8"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_1153_589">
        <path
          d="M0 12C0 5.37258 5.37258 0 12 0H74C80.6274 0 86 5.37258 86 12V52C86 58.6274 80.6274 64 74 64H12C5.37258 64 0 58.6274 0 52V12Z"
          fill="white"
        />
      </clipPath>
    </defs>
  </svg>
);

export default SidebarShort;
