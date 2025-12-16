import { Stack } from "@mui/material";
import React from "react";
import WeeklySalesChart from "./ExpenseChart";
import CustomTable from "@src/components/Table";
import DateRangePickerCustom from "@src/components/DateRange";

const Expenses = () => {
   const tableData = {
      head: ["ID", "Type", "Date", "Amount", "Note"],

      body: [
         {
            id: 1,
            type: "Food",
            date: "2025-10-20",
            amount: 15.99,
            note: "Lunch at local restaurant",
         },
         {
            id: 2,
            type: "Transport",
            date: "2025-10-21",
            amount: 8.5,
            note: "Uber ride to office",
         },
         {
            id: 3,
            type: "Utilities",
            date: "2025-10-18",
            amount: 60,
            note: "Electricity bill payment",
         },
         {
            id: 4,
            type: "Groceries",
            date: "2025-10-19",
            amount: 45.75,
            note: "Weekly grocery shopping",
         },
         {
            id: 5,
            type: "Entertainment",
            date: "2025-10-17",
            amount: 25,
            note: "Netflix subscription renewal",
         },
         {
            id: 6,
            type: "Health",
            date: "2025-10-22",
            amount: 12.99,
            note: "Medicine purchase",
         },
      ],
   };

   return (
      <Stack spacing={3}>
         <WeeklySalesChart />
         <CustomTable
            type="default"
            head={tableData.head}
            body={tableData.body}
            filter={(data, onChange) => (
               <DateRangePickerCustom
                  title="Filter by Expense Date"
                  onChange={(v: [Date | null, Date | null]) => {
                     onChange({
                        ...data,
                        reportData: {
                           date: v,
                           report_type: "expenses",
                        },
                     });
                  }}
               />
            )}
         />
      </Stack>
   );
};

export default Expenses;
