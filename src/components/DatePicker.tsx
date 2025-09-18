import * as React from "react";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import Icon from "./Icon";

const CustomCalendarIcon = () => <Icon icon="solar:calendar-bold-duotone" />;

type Props = {
  onChange?: (value: Dayjs | null) => void;
  value?: Dayjs | null;
};

export default function DatePicker({ onChange, value }: Props) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        value={value || null}
        onChange={(newValue) => onChange?.(newValue)}
        slots={{ openPickerIcon: CustomCalendarIcon }}
        slotProps={{
          textField: {
            variant: "outlined",
            label: "Select Date",
            fullWidth: true,
          },
          popper: {
            modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
          },
        }}
      />
    </LocalizationProvider>
  );
}
