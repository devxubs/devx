import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  Button,
} from "@mui/material";
import DatePicker from "../DatePicker";
import {
  orderStatuses,
  districts,
  products,
  orderSources,
} from "@src/handler/order_filter";
import CustomAutocomplete from "../Autocomplete";
import { Dayjs } from "dayjs";

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

const FilterModal = ({
  onChange,
  filterValue,
  onCloseModal,
}: {
  filterValue: FilterOrder;
  onChange?: Function;
  onCloseModal: Function;
}) => {
  return (
    <Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Order Created At</Typography>
            <DatePicker
              value={filterValue.order_created_at}
              onChange={(v: any) => {
                onChange?.({
                  ...filterValue,
                  order_created_at: v,
                });
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Courier Submitted At</Typography>
            <DatePicker
              value={filterValue.courier_submitted_at}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, courier_submitted_at: v });
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Employee</Typography>
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label">Employee</InputLabel>
              <Select label="Employee">
                {["a"].map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Status</Typography>
            <CustomAutocomplete
              label="Status"
              option={orderStatuses}
              value={filterValue.status}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, status: v });
                console.log(v);
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Order Source</Typography>
            <CustomAutocomplete
              label="Order Source"
              option={orderSources}
              value={filterValue.order_source}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, order_source: v });
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Select Product</Typography>
            <CustomAutocomplete
              label="Select Product"
              option={products}
              value={filterValue.select_product}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, select_product: v });
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">District</Typography>
            <CustomAutocomplete
              label="District"
              option={districts}
              value={filterValue.district}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, district: v });
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Print Status</Typography>
            <CustomAutocomplete
              label="Print Status"
              option={["All", "Printed", "NOt Printed"]}
              value={filterValue.print_status}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, print_status: v });
              }}
            />
          </Stack>
        </Grid>
      </Grid>
      <Stack direction="row" justifyContent="flex-end" spacing={2} pt={2}>
        <Button
          size="large"
          color="error"
          onClick={() => {
            onChange?.({
              order_created_at: undefined,
              courier_submitted_at: undefined,
              employee: "",
              status: "",
              order_source: "",
              select_product: "",
              district: "",
              print_status: "",
            });
            onCloseModal();
          }}
        >
          Cancel
        </Button>
        <Button
          size="large"
          variant="contained"
          onClick={() => {
            onCloseModal();
          }}
        >
          Apply
        </Button>
      </Stack>
    </Box>
  );
};

export default FilterModal;
