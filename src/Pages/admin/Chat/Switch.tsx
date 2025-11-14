"use client";
import React, { useState } from "react";
import { styled, useTheme } from "@mui/material";

// Container
const SwitchContainer = styled("div")({
   display: "inline-flex",
   alignItems: "center",
   cursor: "pointer",
   fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
   fontSize: 14,
   lineHeight: "18px",
   position: "relative",
   userSelect: "none",
});

// Hidden checkbox
const HiddenCheckbox = styled("input")({
   display: "none",
});

// Label + track
const SwitchLabel = styled("label")<{ checked?: boolean }>(
   ({ checked, theme }) => ({
      display: "flex",
      alignItems: "center",
      position: "relative",
      color: theme.palette.text.secondary,
      cursor: "pointer",
      "&::before": {
         content: '""',
         display: "block",
         width: 42,
         height: 20,
         borderRadius: 500,
         marginRight: 12,
         backgroundColor: checked
            ? theme.palette.primary.main
            : theme.palette.mode === "dark"
            ? theme.palette.grey[700]
            : theme.palette.grey[400],
         transition: "background-color 0.2s ease-out",
      },
      "&::after": {
         content: '""',
         display: "block",
         width: 16,
         height: 16,
         borderRadius: 24,
         position: "absolute",
         left: checked ? 24 : 2,
         top: 2,
         backgroundColor: theme.palette.common.white,
         boxShadow: `0 3px 1px 0 rgba(37, 34, 71, 0.05), 0 2px 2px 0 rgba(37, 34, 71, 0.1), 0 3px 3px 0 rgba(37, 34, 71, 0.05)`,
         transition: "transform 0.2s ease-out, left 0.2s ease-out",
      },
   })
);

// Text
const SwitchText = styled("span")({
   marginRight: "0.5em",
   fontSize: "1rem",
});

// Toggle text container
const ToggleText = styled("span")({
   display: "block",
   fontWeight: "bold",
   height: 20,
   overflow: "hidden",
   position: "relative",
   width: 50,
});

// Toggle text state
const ToggleState = styled("span")<{ active?: boolean; color?: string }>(
   ({ active, color }) => ({
      position: "absolute",
      top: 0,
      left: 0,
      opacity: active ? 1 : 0,
      transform: active ? "none" : "translate3d(0, 100%, 0)",
      transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
      color: color || "inherit",
   })
);

interface MUISwitchProps {
   checked?: boolean;
   onChange?: (checked: boolean) => void;
   label?: string;
}

const MUISwitch: React.FC<MUISwitchProps> = ({
   checked: controlledChecked,
   onChange,
   label = "Automation is",
}) => {
   const [internalChecked, setInternalChecked] = useState(false);
   const checked = controlledChecked ?? internalChecked;
   const theme = useTheme();

   const handleChange = () => {
      setInternalChecked(!checked);
      onChange?.(!checked);
   };

   return (
      <SwitchContainer>
         <HiddenCheckbox
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            id="mui-switch"
         />
         <SwitchLabel htmlFor="mui-switch" checked={checked}>
            <SwitchText>{label}</SwitchText>
            <ToggleText>
               <ToggleState active={!checked} color={theme.palette.grey[400]}>
                  Off
               </ToggleState>
               <ToggleState active={checked} color={theme.palette.primary.main}>
                  On
               </ToggleState>
            </ToggleText>
         </SwitchLabel>
      </SwitchContainer>
   );
};

export default MUISwitch;
