import {
  TableRow,
  TableCell,
  IconButton,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import React from "react";
import CustomPopover from "../CustomPopover";
import { TableRow as TableRowProps } from ".";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "../Menu";

interface RowProps {
  head: string[];
  row: TableRowProps;
  type: "order" | "rank" | "user";
}

const Row = ({ row, head }: RowProps) => {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <TableRow>
      {head.map((column, colIndex) => {
        const chip: any = row.chip;
        let color: any = row.color;

        color = theme.palette[color as keyof typeof theme.palette];

        if (column === "@action") {
          return (
            <TableCell key={colIndex} align="left">
              <IconButton onClick={handleMenuOpen}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <CustomPopover
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
              >
                <Menu item={[{ label: "view" }]} />
              </CustomPopover>
            </TableCell>
          );
        } else if (column.toLocaleLowerCase() === chip) {
          return (
            <TableCell key={colIndex} align="left">
              <Chip
                label={row[chip]}
                size="small"
                color={(row.color as any) || "primary"}
                sx={{
                  borderRadius: 0.5,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  p: "0px 0px ",
                  bgcolor: alpha(color.main, 0.1),
                  color: color.main,
                }}
              />
            </TableCell>
          );
        }
        return (
          <TableCell key={colIndex} align="left">
            {row[column.toLowerCase()] ?? "-"}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

export default Row;
