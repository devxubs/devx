import * as React from "react";
import TextField from "@mui/material/TextField";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import Icon from "./Icon";

const CustomCalendarIcon = () => <Icon icon="solar:calendar-bold-duotone" />;

export default function DatePicker() {
  const [value, setValue] = React.useState<Dayjs | null>(dayjs());

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        label="Select Date"
        value={value}
        onChange={(newValue) => setValue(newValue)}
        slots={{
          openPickerIcon: CustomCalendarIcon, // 👈 custom icon component
        }}
        slotProps={{
          popper: {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, 8],
                },
              },
            ],
          },
        }}
      />
    </LocalizationProvider>
  );
}
