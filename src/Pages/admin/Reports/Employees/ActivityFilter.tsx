import { Stack, IconButton, Grid, TextField, Button } from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import DateRangePickerCustom from "@src/components/DateRange";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import React, { useState } from "react";

const Activity = () => {
   const [Open, setOpen] = useState(false);
   const [orderStatus, setOrderStatus] = useState<string[]>([]);

   return (
      <Stack>
         <IconButton size="small" onClick={() => setOpen(!Open)}>
            <Icon icon="solar:filters-bold-duotone" />
         </IconButton>
         <CustomModal
            open={Open}
            onClose={() => setOpen(false)}
            sx={{
               width: 600,
            }}
            title={"Filter Options"}
         >
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <DateRangePickerCustom />
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomAutocomplete
                     label="Activity Type"
                     options={["Active", "Inactive"]}
                  />
               </Grid>
               <Grid size={{ xs: 12 }}>
                  <CustomAutocomplete
                     label="Employee"
                     multiple
                     limitTags={3}
                     value={orderStatus}
                     onChange={(nv) => {
                        setOrderStatus(Array.isArray(nv) ? [...nv] : []);
                     }}
                     options={[
                        "John Doe",
                        "Jane Smith",
                        "Michael Johnson",
                        "Emily Davis",
                        "William Brown",
                        "Olivia Wilson",
                        "James Taylor",
                        "Sophia Anderson",
                     ]}
                  />
               </Grid>
            </Grid>
            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
               <Button variant="text" color="inherit">
                  Reset
               </Button>
               <Button variant="text" color="primary">
                  Apply
               </Button>
            </Stack>
         </CustomModal>
      </Stack>
   );
};

export default Activity;
