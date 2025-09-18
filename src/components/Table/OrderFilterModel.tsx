import {
  Box,
  Grid,
  Stack,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
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
import Scrollbar from "react-browser-scrollbar";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const inputSize = isMobile ? "small" : "medium"; // Adjust size on mobile

  return (
    <Stack height={"100%"}>
      <Grid container spacing={2}>
        {/* Order Created At */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Order Created At</Typography>
            <DatePicker
              size={isMobile ? "small" : "medium"}
              value={filterValue.order_created_at}
              onChange={(v: any) =>
                onChange?.({ ...filterValue, order_created_at: v || "" })
              }
            />
          </Stack>
        </Grid>

        {/* Courier Submitted At */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Courier Submitted At</Typography>
            <DatePicker
              size={isMobile ? "small" : "medium"}
              // size={inputSize}
              value={filterValue.courier_submitted_at}
              onChange={(v: any) =>
                onChange?.({
                  ...filterValue,
                  courier_submitted_at: v || "",
                })
              }
            />
          </Stack>
        </Grid>

        {/* Employee */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Employee</Typography>
            <CustomAutocomplete
              size={inputSize}
              label="Employee"
              option={employeeNames}
              value={filterValue.employee || ""}
              onChange={(v: any) =>
                onChange?.({ ...filterValue, employee: v || "" })
              }
            />
          </Stack>
        </Grid>

        {/* Status */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Status</Typography>
            <CustomAutocomplete
              size={inputSize}
              label="Status"
              option={orderStatuses}
              value={filterValue.status || ""}
              onChange={(v: any) =>
                onChange?.({ ...filterValue, status: v || "" })
              }
            />
          </Stack>
        </Grid>

        {/* Order Source */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Order Source</Typography>
            <CustomAutocomplete
              size={inputSize}
              label="Order Source"
              option={orderSources}
              value={filterValue.order_source || ""}
              onChange={(v: any) =>
                onChange?.({ ...filterValue, order_source: v || "" })
              }
            />
          </Stack>
        </Grid>

        {/* Product */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Product</Typography>
            <CustomAutocomplete
              size={inputSize}
              label="Product"
              option={products}
              value={filterValue.products || ""}
              onChange={(v: any) =>
                onChange?.({ ...filterValue, products: v || "" })
              }
            />
          </Stack>
        </Grid>

        {/* District */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">District</Typography>
            <CustomAutocomplete
              size={inputSize}
              label="District"
              option={districts}
              value={filterValue.district || ""}
              onChange={(v: any) =>
                onChange?.({ ...filterValue, district: v || "" })
              }
            />
          </Stack>
        </Grid>

        {/* Print Status */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Print Status</Typography>
            <CustomAutocomplete
              size={inputSize}
              label="Print Status"
              option={["All", "Printed", "Not Printed"]}
              value={filterValue.print_status || ""}
              onChange={(v: any) =>
                onChange?.({ ...filterValue, print_status: v || "" })
              }
            />
          </Stack>
        </Grid>
      </Grid>

      {/* Buttons */}
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent={isMobile ? "flex-start" : "flex-end"}
        spacing={2}
        pt={2}
        pb={isMobile ? 6 : 0}
        flexWrap="wrap"
      >
        <Button color="error" onClick={() => onCloseModal()}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onCloseModal()}>
          Apply
        </Button>
      </Stack>
    </Stack>
  );
};

export default OrderFilterModal;
