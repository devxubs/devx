"use client";

import {
  Stack,
  Box,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  TextField,
  Typography,
  alpha,
  useTheme,
  Button,
  IconButton,
  Tooltip,
  Grid,
} from "@mui/material";
import React, { useState } from "react";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Icon from "../Icon";
import CustomModal from "../Modal";
import FilterModal from "./FilterModel";

const Filter = ({ type }: { type: "user" | "order" }) => {
  const theme = useTheme();
  const [userRole, setUserRole] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const handleChange = (event: SelectChangeEvent<typeof userRole>) => {
    const value = event.target.value;
    setUserRole(typeof value === "string" ? value.split(",") : value);
  };

  const names = [
    "CEO",
    "Manager",
    "Repeat Sales Exicutive",
    "Team Leader",
    "Courier Exicutive",
    "Reseller",
  ];

  return (
    <Stack spacing={2}>
      <Stack
        spacing={2}
        direction="row"
        alignItems="center"
        justifyContent={"space-between"}
      >
        {type === "user" && (
          <FormControl sx={{ width: "30%" }}>
            <InputLabel id="demo-simple-select-label">Roll</InputLabel>
            <Select
              multiple
              value={userRole}
              onChange={handleChange}
              label="Roll"
            >
              {names.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl variant="outlined" sx={{ width: "40%" }}>
          <TextField
            fullWidth
            placeholder="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="eva:search-fill" />
                </InputAdornment>
              ),
            }}
          />
        </FormControl>

        <Box>
          <Tooltip title="Filter">
            <IconButton
              sx={{ color: "text.secondary" }}
              onClick={() => setModalOpen(true)}
            >
              <Icon icon="solar:filters-bold-duotone" />
            </IconButton>
          </Tooltip>
          <CustomModal
            sx={{ width: { xs: "90%", md: 900 } }}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Filter"
          >
            <FilterModal />
          </CustomModal>
        </Box>
      </Stack>
      <Stack spacing={1} direction="row" alignItems="center">
        {userRole.length > 0 && (
          <Stack
            spacing={1}
            direction="row"
            border={1}
            borderColor={"divider"}
            borderRadius={0.5}
            p={1}
            sx={{ borderStyle: "dashed" }}
          >
            <Typography variant="subtitle2">Role: </Typography>
            <Stack spacing={0.5} direction="row" alignItems={"center"}>
              {userRole.map((role, idx) => (
                <Chip
                  key={idx}
                  label={role}
                  size="small"
                  onDelete={(e) => {
                    const rr = userRole.filter((ur) => ur !== role);
                    setUserRole(rr);
                  }}
                  sx={{
                    borderRadius: 0.5,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    p: "0px 0px ",
                    bgcolor: alpha(theme.palette.grey[300], 0.1),
                    color: theme.palette.grey[300],
                  }}
                />
              ))}
            </Stack>
          </Stack>
        )}
        {searchText && (
          <Stack
            spacing={1}
            direction="row"
            border={1}
            borderColor={"divider"}
            borderRadius={0.5}
            p={1}
            sx={{ borderStyle: "dashed" }}
          >
            <Typography variant="subtitle2">Keyword: </Typography>

            <Chip
              label={searchText}
              size="small"
              onDelete={() => {
                setSearchText("");
              }}
              sx={{
                borderRadius: 0.5,
                fontWeight: 700,
                fontSize: "0.75rem",
                p: "0px 0px ",
                bgcolor: alpha(theme.palette.grey[300], 0.1),
                color: theme.palette.grey[300],
              }}
            />
          </Stack>
        )}
        {(userRole.length > 0 || searchText) && (
          <Button
            variant="text"
            color="error"
            startIcon={<Icon size="small" icon="solar:trash-bin-trash-bold" />}
            onClick={() => {
              setUserRole([]);
              setSearchText("");
            }}
          >
            Clear
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

export default Filter;
