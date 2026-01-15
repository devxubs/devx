import { Stack, Grid } from "@mui/material";
import React from "react";
import AnalyticsCard from "../components/AnalyticsCard";
import AnalyticsGraph from "../Purchases/AnalyticsGraph";
import RadialBar from "../components/RadialBar";
import CustomTable from "@src/components/Table";
import { UserProfile } from "../../User";

const user = [
   {
      employee_id: "E001",
      name: "John Doe",
      role: "Sales Manager",
      phone_number: "01325584606",
      email: "john.doe@example.com",
      hire_date: "2020-03-15",
      salary: "$75,000",
   },
   {
      employee_id: "E002",
      name: "Jane Smith",
      role: "HR Specialist",
      phone_number: "01818388585",
      email: "jane.smith@example.com",
      hire_date: "2019-07-22",
      salary: "$65,000",
   },
   {
      employee_id: "E003",
      name: "Mike Johnson",
      role: "Software Developer",
      phone_number: "01711223344",
      email: "mike.johnson@example.com",
      hire_date: "2021-11-05",
      salary: "$85,000",
   },
];

const Employees = () => {
   const employeeTableData = {
      head: [
         "Employee ID",
         "Name",
         "Role",
         "Phone Number",
         "Hire Date",
         "Salary",
      ],
      body: user.map((u) => ({
         employee_id: u.employee_id,
         name: <UserProfile name={u.name} email={u.email} />,
         role: u.role,
         hire_date: u.hire_date,
         phone_number: u.phone_number,
         salary: u.salary,
      })),
   };

   return (
      <Stack spacing={3}>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Employees"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"1000"}
                  percentage={"70%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Roles"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"15"}
                  percentage={"70%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Purchases"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"190"}
                  percentage={"70%"}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
               <AnalyticsGraph
                  title={"Employee by Role"}
                  isPositive={true}
                  type="category"
                  data={[
                     { x: "Admin", y: 40 },
                     { x: "Manager", y: 25 },
                     { x: "Sales", y: 20 },
                     { x: "Support", y: 15 },
                     { x: "HR", y: 10 },
                     { x: "Developer", y: 30 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <RadialBar
                  title="Top Active Employee"
                  isPositive={true}
                  data={[
                     { label: "Satisfied", value: 85 },
                     { label: "Neutral", value: 10 },
                     { label: "Dissatisfied", value: 5 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
               <CustomTable
                  type={"default"}
                  head={employeeTableData.head}
                  body={employeeTableData.body}
               />
            </Grid>
            <Grid size={{ xs: 12, md: 12 }}>
               <CustomTable
                  type={"default"}
                  head={employeeTableData.head}
                  body={employeeTableData.body}
               />
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Employees;
