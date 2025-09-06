import {
  Grid,
  Stack,
  Typography,
  Button,
  TextField,
  InputAdornment,
  useTheme,
  IconButton,
  Box,
} from "@mui/material";
import React, { useState } from "react";
import UploadPhoto from "./imageUploader";
import CustomAutocomplete from "@src/components/Autocomplete";
import { TableRow } from "@src/components/Table";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import { accordionSummaryClasses } from "@mui/material/AccordionSummary";

import Icon from "@src/components/Icon";
import Details from "./Details";
import Properties from "./Properties";
import Pricing from "./Pricing";

interface ModalProps {
  mode: "add" | "edit";
  onClose?: () => void;
  userData?: TableRow;
  onChange?: (data: any) => void;
}

const Modal = ({ mode, onClose, userData, onChange }: ModalProps) => {
  const theme = useTheme();

  const [detailsData, setDetailsData] = useState({
    name: "",
    category: "",
    subDescription: "",
    content: "",
    images: [],
  });

  const onDetailsDataChange = (field: string, value: any) => {
    if (Array.isArray(value)) {
      setDetailsData((prev) => ({
        ...prev,
        [field]: [...prev.images, ...value],
      }));
      return;
    }
    setDetailsData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleRemove = (index: number) => {
    // setImages(images.filter((_, i) => i !== index));
  };

  return (
    <Stack width={"100%"}>
      <Stack spacing={4}>
        <Stack>
          <Details
            detailsData={detailsData}
            onDetailsDataChange={onDetailsDataChange}
            handleRemove={handleRemove}
          />
        </Stack>
        <Stack>
          <Properties />
        </Stack>
        <Stack>
          <Pricing />
        </Stack>
      </Stack>

      <Stack
        spacing={2}
        direction={"row"}
        justifyContent={"flex-end"}
        width={"100%"}
        mt={2}
      >
        <Button variant="text" color="inherit" onClick={onClose}>
          Cancel
        </Button>

        <Button variant="contained" color="primary">
          {mode === "edit" ? "Update user" : "Add user"}
        </Button>
      </Stack>
    </Stack>
  );
};

export default Modal;
