"use client";

import React, { useState } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  Typography,
  Collapse,
  Box,
  useTheme,
  alpha,
  Stack,
} from "@mui/material";
import Icon from "@src/components/Icon"; // Must support Iconify string
import { useRouter, usePathname } from "next/navigation";

interface Heading {
  title: string;
  id: any;
}

interface SidebarItem {
  heading?: Heading;
  icon?: string;
  label: string;
  selected?: boolean;
  children?: SidebarItem[];
  headingId?: string;
  url?: string;
}

interface CustomListProps {
  items: SidebarItem[];
  fullMenu?: boolean;
}

export default function CustomList({ items, fullMenu }: CustomListProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  const handleToggle = (item: SidebarItem, hasChild: boolean) => {
    if (hasChild) {
      setOpenStates((prev) => ({
        ...prev,
        [item.label]: !prev[item.label],
      }));
    }

    if (item.url && !item.selected) {
      router.push(item.url);
    }
  };

  return (
    <Box>
      <List disablePadding>
        {items.map((item, index) => {
          const isOpen = openStates[item.label] || false;
          const hasChildren = !!item.children?.length;

          item.selected = item.url ? pathname === item.url : false;

          return (
            <React.Fragment key={index}>
              {fullMenu && item.heading && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ px: 2, mb: 1.5, opacity: 0.7 }}
                >
                  {item.heading.title}
                </Typography>
              )}
              <ListItemButton
                onClick={() => handleToggle(item, hasChildren)}
                // selected={item.selected}
                sx={{
                  borderRadius: 0.5,
                  mx: fullMenu ? 1 : 0,
                  mb: 0.5,
                  gap: fullMenu ? 1 : 0,
                  px: 1.5,
                  py: 0.75,
                  ml:
                    fullMenu &&
                    (item.heading !== undefined || item.headingId !== undefined)
                      ? 2.5
                      : 0,

                  backgroundColor: item.selected
                    ? alpha(theme.palette.primary.main, 0.09)
                    : "transparent",
                  "&:hover": {
                    backgroundColor: item.selected
                      ? alpha(theme.palette.primary.main, 0.2)
                      : theme.palette.action.hover,
                  },
                  color: item.selected ? "primary.main" : "text.secondary",
                  display: "flex",
                  justifyContent: fullMenu ? "space-between" : "center",
                  alignItems: fullMenu ? "" : "center",
                }}
              >
                <Stack
                  direction={fullMenu ? "row" : "column"}
                  alignItems={fullMenu ? "" : "center"}
                  sx={{
                    color: item.selected ? "primary.main" : "text.secondary",
                  }}
                >
                  {item.icon && (
                    <ListItemIcon
                      sx={{
                        minWidth: "auto",
                        mr: fullMenu ? 1 : 0,
                        color: item.selected
                          ? "primary.main"
                          : "text.secondary",
                      }}
                    >
                      <Icon icon={item.icon} />
                    </ListItemIcon>
                  )}
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    fontSize={fullMenu ? "0.875rem" : 10}
                    color={item.selected ? "primary " : "textSecondary"}
                  >
                    {item.label}
                  </Typography>
                </Stack>
                <Box>
                  {fullMenu &&
                    hasChildren &&
                    (isOpen ? (
                      <Icon icon="solar:alt-arrow-down-bold-duotone" />
                    ) : (
                      <Icon icon="solar:alt-arrow-right-bold-duotone" />
                    ))}
                </Box>
              </ListItemButton>

              {fullMenu && hasChildren && (
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <Box
                    sx={{
                      ml: item.heading || item.headingId ? 5 : 0,

                      borderLeft: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <List disablePadding>
                      {(item.children || []).map((child, idx) => (
                        <ListItemButton
                          key={idx}
                          selected={child.selected}
                          sx={{
                            pl: 2,
                            py: 0.75,
                            borderRadius: 0.5,
                            mx: 1,
                            mb: 0.5,
                            gap: 1,
                            color: child.selected ? "primary.main" : "inherit",
                            backgroundColor: child.selected
                              ? alpha(theme.palette.primary.main, 0.1)
                              : "transparent",
                          }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {child.label}
                          </Typography>
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
}
