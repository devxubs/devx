import {
   Box,
   Grid,
   Stack,
   Typography,
   Button,
   useMediaQuery,
   useTheme,
} from "@mui/material";
import DateRange from "../../../components/DateRange";
import CustomAutocomplete from "../../../components/Autocomplete";
import { OrderFilter } from "../../../components/Table/Filter";
import { useState } from "react";
import { orderStatuses, districts, orderSources, products } from "./data";

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
   const [filterData, setFilterData] = useState({
      order_created_at: filterValue.order_created_at,
      courier_submitted_at: filterValue.courier_submitted_at,
      employee: filterValue.employee || "",
      status: filterValue.status || "",
      order_source: filterValue.order_source || "",
      products: filterValue.products || "",
      district: filterValue.district || "",
      print_status: filterValue.print_status || "",
   });

   const inputSize = isMobile ? "small" : "medium"; // Adjust size on mobile

   console.log(filterData.order_created_at);

   return (
      <Stack height={"100%"}>
         <Grid container spacing={2}>
            {/* Order Created At */}
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={1.5}>
                  <Typography variant="body2">Order Created At</Typography>
                  <DateRange
                     size={isMobile ? "small" : "medium"}
                     title="Order Created At"
                     value={filterData.order_created_at}
                     onChange={(v: any) => {
                        setFilterData({
                           ...filterData,
                           order_created_at: v,
                        });
                     }}
                  />
               </Stack>
            </Grid>

            {/* Courier Submitted At */}
            <Grid size={{ xs: 12, sm: 6 }}>
               <Stack spacing={1.5}>
                  <Typography variant="body2">Courier Submitted At</Typography>
                  <DateRange
                     size={isMobile ? "small" : "medium"}
                     title="Courier Submitted At"
                     value={filterData.courier_submitted_at}
                     onChange={(v: any) => {
                        setFilterData({
                           ...filterData,
                           courier_submitted_at: v,
                        });
                     }}
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
                     options={employeeNames}
                     value={filterData.employee || ""}
                     onChange={(v: any) =>
                        setFilterData({ ...filterData, employee: v || "" })
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
                     options={orderStatuses}
                     value={filterData.status || ""}
                     onChange={(v: any) =>
                        setFilterData({ ...filterData, status: v || "" })
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
                     options={orderSources}
                     value={filterData.order_source || ""}
                     onChange={(v: any) =>
                        setFilterData({ ...filterData, order_source: v || "" })
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
                     options={products}
                     value={filterData.products || ""}
                     onChange={(v: any) =>
                        setFilterData({ ...filterData, products: v || "" })
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
                     options={districts}
                     value={filterData.district || ""}
                     onChange={(v: any) =>
                        setFilterData({ ...filterData, district: v || "" })
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
                     options={["All", "Printed", "Not Printed"]}
                     value={filterData.print_status || ""}
                     onChange={(v: any) =>
                        setFilterData({ ...filterData, print_status: v || "" })
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
            <Button
               variant="contained"
               onClick={() => {
                  onChange?.(filterData);
                  onCloseModal();
               }}
            >
               Apply
            </Button>
         </Stack>
      </Stack>
   );
};

export default OrderFilterModal;
