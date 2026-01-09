import { Stack, Grid } from "@mui/material";
import React from "react";
import AnalyticsCard from "./AnalyticsCard";

const Purchases = () => {
   return (
      <Stack spacing={3}>
         <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
               <AnalyticsCard
                  title={"Purchases Over Time"}
                  isPositive={true}
                  type="day"
                  data={[
                     { x: "2025-01-8", y: 10000 },
                     { x: "2025-01-15", y: 30000 },
                     { x: "2025-01-19", y: 40000 },
                     { x: "2025-01-25", y: 40000 },
                     { x: "2025-01-28", y: 40000 },
                     { x: "2025-01-31", y: 10000 },
                     { x: "2025-02-9", y: 20000 },
                     { x: "2025-03-10", y: 18000 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
               <AnalyticsCard
                  title={"Purchases by Supplier"}
                  isPositive={true}
                  type="category"
                  data={[
                     { x: "supplier a", y: 9 },
                     { x: "supplier b", y: 2 },
                     { x: "supplier c", y: 10 },
                     { x: "supplier d", y: 1 },
                     { x: "supplier e", y: 5 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
               {/* Placeholder for more Purchases Report Content */}
               <div>More Purchases Report Content</div>
            </Grid>
            <Grid size={{ xs: 12 }}>
               {/* Placeholder for even more Purchases Report Content */}
               <div>Even More Purchases Report Content</div>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Purchases;
