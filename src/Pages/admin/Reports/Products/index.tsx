import React from "react";
import Grid from "@mui/material/Grid";
import { Stack } from "@mui/material";
import AnalyticsCard from "../components/AnalyticsCard";
import AnalyticsGraph from "../components/AnalyticsGraph";
import RadialBar from "../components/RadialBar";
import CustomTable from "@src/components/Table";

const Products = () => {
   return (
      <Stack spacing={3}>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Products"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"150"}
                  percentage={"25%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Low Stock Items"}
                  isPositive={false}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"15"}
                  percentage={"20%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Stock Value"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"300"}
                  percentage={"5%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
               <RadialBar
                  title={"Stock Overview"}
                  data={[
                     { label: "Healthy", value: 70 },
                     { label: "Low", value: 30 },
                     { label: "Reserved", value: 10 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
               <AnalyticsGraph
                  type="day"
                  title="Lowest Stock"
                  isPositive={true}
                  data={[
                     { x: "2026-01-01", y: 50 },
                     { x: "2026-01-02", y: 60 },
                     { x: "2026-01-03", y: 55 },
                     { x: "2026-01-04", y: 70 },
                     { x: "2026-01-05", y: 65 },
                     { x: "2026-01-06", y: 80 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
               <CustomTable rows={[]} columns={[]} />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Products;
