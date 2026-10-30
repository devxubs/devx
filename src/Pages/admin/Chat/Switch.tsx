"use client";
import React, { useState } from "react";
import { Stack, Typography, FormControlLabel } from "@mui/material";
import CustomSwitch from "@src/components/CustomSwitch";

interface MUISwitchProps {
   checked?: boolean;
   onChange?: (checked: boolean) => void;
   label?: string;
}

const MUISwitch: React.FC<MUISwitchProps> = ({
   checked: controlledChecked,
   onChange,
   label = "Private Group",
}) => {
   const [internalChecked, setInternalChecked] = useState(false);
   const isChecked = controlledChecked ?? internalChecked;

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.checked;
      setInternalChecked(next);
      onChange?.(next);
   };

   return (
      <FormControlLabel
         control={<CustomSwitch checked={isChecked} onChange={handleChange} />}
         label={<Typography variant="body2" color="text.secondary">{label}</Typography>}
         sx={{ m: 0, gap: 1 }}
      />
   );
};

export default MUISwitch;
