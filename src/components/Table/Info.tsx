import * as React from "react";
import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

interface InfoProps {
  orders: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

const Info = ({ orders }: InfoProps) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 0 }}>
      <Table padding="none" sx={{ minWidth: 750 }}>
        <TableHead
          sx={{
            bgcolor: "background.paper",

            "& th": { p: 1.5 },
          }}
        >
          <TableRow sx={{}}>
            <TableCell align="left">
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Name
              </Typography>
            </TableCell>
            <TableCell align="left">
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Quantity
              </Typography>
            </TableCell>
            <TableCell align="left">
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Price
              </Typography>
            </TableCell>
            <TableCell align="left" />
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((item, index) => (
            <TableRow
              key={index}
              sx={{
                "&:last-child td, &:last-child th": { border: 0 },
                "& td": { p: 1, px: 2 },
              }}
            >
              <TableCell align="left">{item.name}</TableCell>
              <TableCell align="left">
                <Typography variant="body1">{item.quantity}</Typography>
              </TableCell>
              <TableCell align="left">৳ {item.price}</TableCell>
              <TableCell align="left">
                <IconButton size="small">
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default Info;
