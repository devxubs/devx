import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
} from "@mui/material";
import DatePicker from "../DatePicker";

const FilterModal = () => {
  return (
    <Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Order Created At</Typography>
            <DatePicker />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Courier Submitted At</Typography>
            <DatePicker />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Note Added At</Typography>
            <DatePicker />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">
              Status Added At
            </InputLabel>
            <Select label="Status Added At">
              {["a"].map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FilterModal;
