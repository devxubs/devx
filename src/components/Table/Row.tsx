"use client";

import {
  TableRow,
  TableCell,
  IconButton,
  Chip,
  useTheme,
  alpha,
  Checkbox,
  Palette,
} from "@mui/material";
import React, { useState } from "react";
import CustomPopover from "../CustomPopover";
import { ActionItem, TableRow as TableRowProps, Type } from ".";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "../Menu";
interface RowProps {
  head: string[];
  row: TableRowProps & { allChecked?: boolean };
  type: Type;
  onCheck?: (checked: boolean) => void;
  actionMenu: ActionItem[];
}

const Row = ({ row, head, onCheck, type, actionMenu }: RowProps) => {
  const [checked, setChecked] = useState(Boolean(row.allChecked));
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  React.useEffect(() => {
    setChecked(Boolean(row.allChecked));
  }, [row.allChecked]);

  return (
    <TableRow
      component={"tr"}
      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
    >
      {head.map((column, colIndex) => {
        const chip: any = row.chip;
        const colorKey = row.color as keyof Palette;
        const paletteColor: any = theme.palette[colorKey] ?? {
          main: row.color || theme.palette.primary.main,
        };

        if (column === "@check") {
          return (
            <TableCell key={colIndex}>
              <Checkbox
                checked={checked}
                onChange={(e) => {
                  setChecked(e.target.checked);
                  onCheck?.(e.target.checked);
                }}
              />
            </TableCell>
          );
        }

        if (column === "@action") {
          // your action buttons (menu) here
          return (
            <TableCell key={colIndex} align="left">
              <IconButton onClick={handleMenuOpen}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <CustomPopover
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <Menu item={actionMenu} onClose={() => setAnchorEl(null)} />
              </CustomPopover>
            </TableCell>
          );
        }
        if (column.toLocaleLowerCase() === chip) {
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
                  bgcolor: paletteColor?.main
                    ? alpha(paletteColor.main, 0.1)
                    : alpha(theme.palette.primary.main, 0.1),
                  color: paletteColor?.main || theme.palette.primary.main,
                }}
              />
            </TableCell>
          );
        }

        return (
          <TableCell key={colIndex}>
            {row[
              column.includes(" ")
                ? column.replaceAll(" ", "_").toLowerCase()
                : column.toLowerCase()
            ] ?? "-"}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

export default Row;
