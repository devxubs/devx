import {
   Stack,
   IconButton,
   Grid,
   Button,
   useTheme,
   useMediaQuery,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import DateRangePickerCustom from "@src/components/DateRange";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import React, { useState } from "react";
import { productsData } from "../../Product";
import { FilterData } from "@src/components/Table/Filter";

const Filter = ({
   data,
   onChange,
}: {
   data: FilterData;
   onChange: (d: any) => void;
}) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const [open, setOpen] = useState(false);
   const [filterData, setFilterData] = useState({
      date: data?.reportData?.date as [Date | null, Date | null],
      product: data?.reportData?.product as string,
   });

   return (
      <Stack>
         <IconButton onClick={() => setOpen(true)}>
            <Icon icon="solar:filters-bold-duotone" />
         </IconButton>

         <CustomModal
            title="Filter Customers Report"
            open={open}
            onClose={() => {
               setOpen(false);
            }}
            sx={{
               width: { xs: "100%", md: 400 },
               height: { xs: 400, md: "auto" },
               borderRadius: { xs: 0, md: 2 },
            }}
         >
            <Grid container spacing={2}>
               <Grid size={{ xs: 12 }}>
                  <DateRangePickerCustom
                     title="Filter by Courier Submitted Date"
                     onChange={(v: [Date | null, Date | null]) => {
                        setFilterData({
                           ...filterData,
                           date: v,
                        });
                     }}
                  />
               </Grid>
               <Grid size={{ xs: 12 }}>
                  <CustomAutocomplete
                     placeholder="Select Product"
                     label="Select Product"
                     option={productsData.map((item) => ({
                        label: item.product_name,
                        value: item.id,
                     }))}
                     onChange={(val: any) => {
                        setFilterData({
                           ...filterData,
                           product: val.label,
                        });
                     }}
                  />
               </Grid>
            </Grid>
            {/* ✅ ACTIONS */}
            <Stack
               direction={isMobile ? "column" : "row"}
               justifyContent={isMobile ? "flex-start" : "flex-end"}
               spacing={2}
               pt={2}
               pb={isMobile ? 6 : 0}
               flexWrap="wrap"
            >
               <Button color="error" onClick={() => setOpen(false)}>
                  Cancel
               </Button>
               <Button
                  variant="contained"
                  onClick={() => {
                     onChange({
                        ...data,
                        reportData: {
                           ...data.reportData,
                           report_type: "customer",
                           date: filterData.date,
                           product: filterData.product,
                        },
                     });
                     setOpen(false);
                  }}
               >
                  Apply
               </Button>
            </Stack>
         </CustomModal>
      </Stack>
   );
};

export default Filter;
