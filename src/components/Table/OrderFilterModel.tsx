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
import { OrderFilter } from "./Filter";

const employeeNames = [
  "John",
  "Anthony",
  "Thomas",
  "Mark",
  "Paul",
  "Andrew",
  "George",
  "Charles",
  "Richard",
  "Edward",
  "Steven",
];

const OrderFilterModal = ({
  onChange,
  filterValue,
  onCloseModal,
}: {
  filterValue: OrderFilter;
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
                  order_created_at: v === null ? "" : v,
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
                onChange?.({
                  ...filterValue,
                  courier_submitted_at: v === null ? "" : v,
                });
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Employee</Typography>
            <CustomAutocomplete
              label="Employee"
              option={employeeNames}
              value={filterValue.employee}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, employee: v === null ? "" : v });
              }}
            />
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
                onChange?.({ ...filterValue, status: v === null ? "" : v });
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
                onChange?.({
                  ...filterValue,
                  order_source: v === null ? "" : v,
                });
              }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Product</Typography>
            <CustomAutocomplete
              label="Product"
              option={products}
              value={filterValue.products}
              onChange={(v: any) => {
                onChange?.({ ...filterValue, products: v === null ? "" : v });
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
                onChange?.({ ...filterValue, district: v === null ? "" : v });
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
                onChange?.({
                  ...filterValue,
                  print_status: v === null ? "" : v,
                });
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

export default OrderFilterModal;
