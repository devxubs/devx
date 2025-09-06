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
import dayjs, { Dayjs } from "dayjs";
import { Type } from ".";
import CustomAutocomplete from "../Autocomplete";

type FilterOrder = {
  order_created_at?: Dayjs;
  courier_submitted_at?: Dayjs;
  employee: string;
  status: string;
  order_source: string;
  select_product: string;
  district: string;
  print_status: string;
};

const Filter = ({ type }: { type: Type }) => {
  const theme = useTheme();
  const [userRole, setUserRole] = useState<string[]>([]);
  const [productStock, setProductStock] = useState("");
  const [searchText, setSearchText] = useState("");

  const [filterOrder, setFilterOrder] = useState<FilterOrder>({
    order_created_at: undefined,
    courier_submitted_at: undefined,
    employee: "",
    status: "",
    order_source: "",
    select_product: "",
    district: "",
    print_status: "",
  });
  const activeFilters = Object.entries(filterOrder).filter(
    ([, value]) => value !== undefined && value !== "" // only show non-empty values
  );

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
        {type === "user" ? (
          <Stack sx={{ width: "30%" }}>
            <CustomAutocomplete label="Status" option={names} />
          </Stack>
        ) : type === "product" ? (
          <Stack sx={{ width: "30%" }}>
            <CustomAutocomplete
              label="Stock"
              option={["In stock", "Low stock", "Out of stock"]}
              value={productStock}
              onChange={(val: any) => {
                setProductStock(val);
              }}
            />
          </Stack>
        ) : (
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
              title="Order Filter"
            >
              <FilterModal
                filterValue={filterOrder}
                onCloseModal={() => setModalOpen(false)}
                onChange={(f: FilterOrder) => {
                  setFilterOrder(f);
                  console.log(f);
                }}
              />
            </CustomModal>
          </Box>
        )}
      </Stack>
      <Stack spacing={1} direction="row" alignItems="center">
        {productStock && (
          <Stack
            spacing={1}
            direction="row"
            border={1}
            borderColor={"divider"}
            borderRadius={0.5}
            p={1}
            sx={{ borderStyle: "dashed" }}
          >
            <Typography variant="subtitle2">Stock: </Typography>
            <Chip
              label={productStock}
              size="small"
              onDelete={() => {
                setProductStock("");
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
        {activeFilters.length > 0 && (
          <Stack
            spacing={1}
            direction="row"
            border={1}
            borderColor={"divider"}
            borderRadius={0.5}
            flexWrap="wrap"
            p={1}
            sx={{ borderStyle: "dashed" }}
          >
            <Typography variant="subtitle2">Filters: </Typography>

            {activeFilters.map(([key, value]) => {
              return (
                <Box sx={{ py: 0.2 }} key={key}>
                  <Chip
                    label={`${key.replace(/_/g, " ").toLocaleUpperCase()}: ${
                      dayjs.isDayjs(value)
                        ? (value?.format("MM/DD/YYYY") as any)
                        : value
                    }`}
                    size="small"
                    onDelete={() =>
                      setFilterOrder((prev) => ({
                        ...prev,
                        [key]: key.includes("at") ? undefined : "", // clear value
                      }))
                    }
                    suppressHydrationWarning
                    sx={{
                      borderRadius: 0.5,
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      p: "0px 0px ",
                      bgcolor: alpha(theme.palette.grey[300], 0.1),
                      color: theme.palette.grey[300],
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        )}
        {(searchText ||
          userRole.length > 0 ||
          activeFilters.length > 0 ||
          productStock) && (
          <Button
            variant="text"
            color="error"
            startIcon={<Icon size="small" icon="solar:trash-bin-trash-bold" />}
            onClick={() => {
              setUserRole([]);
              setSearchText("");
              setFilterOrder({
                order_created_at: undefined,
                courier_submitted_at: undefined,
                employee: "",
                status: "",
                order_source: "",
                select_product: "",
                district: "",
                print_status: "",
              });
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
