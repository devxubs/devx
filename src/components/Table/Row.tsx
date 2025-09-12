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
import React from "react";
import CustomPopover from "../CustomPopover";
import { ActionItem, TableRow as TableRowProps, Type } from ".";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "../Menu";

interface RowProps {
  head: string[];
  row: TableRowProps;
  type: Type;
  checked?: boolean; // ✅ comes from parent
  onCheck?: (checked: boolean) => void;
  actionMenu: ActionItem[];
}

const Row = ({
  row,
  head,
  onCheck,
  checked = false,
  type,
  actionMenu,
}: RowProps) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <TableRow
      component="tr"
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
            <TableCell
              key={colIndex}
              align="left"
              sx={{
                p: 0,
                px: 1,
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <Checkbox
                checked={checked} // ✅ controlled
                onChange={(e) => onCheck?.(e.target.checked)}
              />
            </TableCell>
          );
        }

        if (column === "@action") {
          return (
            <TableCell
              key={colIndex}
              align="right"
              sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis" }}
            >
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
            <TableCell
              key={colIndex}
              align="left"
              sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis" }}
            >
              <Chip
                label={row[chip]}
                size="small"
                color={(row.color as any) || "primary"}
                sx={{
                  borderRadius: 0.5,
                  fontWeight: 700,
                  fontSize: "0.75rem",
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
          <TableCell
            key={colIndex}
            sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis" }}
          >
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
