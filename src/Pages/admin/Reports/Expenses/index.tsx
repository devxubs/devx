import { Stack } from "@mui/material";
import WeeklySalesChart from "./ExpenseChart";
import CustomTable from "@src/components/Table";
import DateRangePicker from "@src/components/DateRange";
import { useEffect, useState } from "react";

const expensesData = [
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
];

const Expenses = () => {
   const columns = [
      {
         field: "id",
         headerName: "ID",
         width: 100,
      },
      { field: "type", headerName: "Type", width: 150 },
      { field: "date", headerName: "Date", width: 150 },
      { field: "amount", headerName: "Amount", width: 150 },
      { field: "note", headerName: "Note", width: 200 },
   ];

   return (
      <Stack spacing={3}>
         <WeeklySalesChart />
         <CustomTable
            rows={expensesData}
            columns={columns}
            filter={(data, onChange) => (
               <DateRangePicker
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
