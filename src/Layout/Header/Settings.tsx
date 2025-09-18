"use client";

import {
  alpha,
  Box,
  Button,
  IconButton,
  Stack,
  SwipeableDrawer,
  Tooltip,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";
import CustomBox from "@src/components/CustomBox";
import AntSwitch from "@src/components/CustomSwitch";
import Icon from "@src/components/Icon";
import useGlobalState from "@src/handler/globalState";
import SidebarFull from "@src/SvgIcon/SidebarFull";
import SidebarLayoutIcon from "@src/SvgIcon/SidebarLayout";
import SidebarShort from "@src/SvgIcon/SidebarShort";
import React, { useEffect, useState } from "react";
import Scrollbar from "react-browser-scrollbar";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const SettingsDrawer: React.FC<SettingsProps> = ({ open, onClose, onOpen }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const theme = useTheme();
  const isSmUp = theme.breakpoints.up("sm");

  const globalState = useGlobalState();
  const layout = globalState.get("layoutFull");
  const color = globalState.get("color");
  const isDark = globalState.get("theme") === "dark";

  const [customize, setCustomize] = useState<any>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCustomize = localStorage.getItem("customize");
      if (savedCustomize) {
        try {
          setCustomize(JSON.parse(savedCustomize));
        } catch (error) {
          console.error("Failed to parse customize from localStorage:", error);
        }
      }
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      PaperProps={{
        sx: {
          width: 300,
          backdropFilter: "blur(6px)",
        },
      }}
    >
      <CustomBox sx={{ height: "100%" }}>
        <Scrollbar autoHide thumbSize={6} darkMode>
          {/* Header */}
          <Box
            sx={{
              px: 2.5,
              py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Settings</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Tooltip
                title={isFullscreen ? "Exit full screen" : "Full screen"}
              >
                <IconButton onClick={toggleFullscreen}>
                  {isFullscreen ? (
                    <Icon icon="solar:quit-full-screen-square-line-duotone" />
                  ) : (
                    <Icon icon="solar:full-screen-square-line-duotone" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton onClick={onClose}>
                  <Icon icon="eva:close-fill" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Content */}
          <Stack spacing={2} sx={{ p: 2 }}>
            {/* Theme mode */}
            <Button
              variant="outlined"
              disableFocusRipple
              disableRipple
              color="inherit"
              fullWidth
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                border: 1,
                borderColor: "divider",
                p: "16px 16px 16px 20px",
              }}
              onClick={() => {
                globalState.set("theme", isDark ? "light" : "dark");

                localStorage.setItem(
                  "customize",
                  JSON.stringify({
                    ...customize,
                    theme: isDark ? "light" : "dark",
                  })
                );
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                width="100%"
                mb={3}
              >
                <Icon icon="solar:cloudy-moon-bold-duotone" />
                <AntSwitch checked={isDark} />
              </Stack>
              <Box width="100%" textAlign="start">
                <Typography
                  component="span"
                  variant="body2"
                  fontSize={14}
                  fontWeight={600}
                >
                  Dark
                </Typography>
              </Box>
            </Button>

            {/* Sidebar */}
            <Stack
              spacing={2}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="body1" fontWeight={600}>
                Nav
              </Typography>

              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
              >
                <Button
                  disableFocusRipple
                  disableRipple
                  color={layout ? "primary" : "inherit"}
                  onClick={() => {
                    globalState.set("layoutFull", true);

                    localStorage.setItem(
                      "customize",
                      JSON.stringify({ ...customize, layoutFull: true })
                    );
                  }}
                  sx={{
                    p: 0,
                    border: 1,
                    borderColor: "divider",
                    minWidth: 0,
                    minHeight: 0,
                  }}
                >
                  <SidebarFull />
                </Button>
                <Button
                  disableFocusRipple
                  disableRipple
                  onClick={() => {
                    globalState.set("layoutFull", false);

                    localStorage.setItem(
                      "customize",
                      JSON.stringify({ ...customize, layoutFull: false })
                    );
                  }}
                  color={!layout ? "primary" : "inherit"}
                  sx={{
                    p: 0,
                    minWidth: 0,
                    minHeight: 0,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <SidebarShort />
                </Button>
              </Stack>
            </Stack>

            {/* Color */}
            <Stack
              spacing={2}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="body1" fontWeight={600}>
                Presets
              </Typography>
              <Grid container spacing={2}>
                <Grid size={4}>
                  <Button
                    disableFocusRipple
                    disableRipple
                    color={color === "primary" ? "primary" : (color as any)}
                    onClick={() => {
                      globalState.set("color", "primary");
                      localStorage.setItem(
                        "customize",
                        JSON.stringify({
                          ...customize,
                          color: "primary",
                        })
                      );
                    }}
                    sx={{
                      p: 2,
                    }}
                  >
                    <SidebarLayoutIcon />
                  </Button>
                </Grid>
                <Grid size={4}>
                  <Button
                    disableFocusRipple
                    disableRipple
                    color={color === "secondary" ? "primary" : "secondary"}
                    onClick={() => {
                      globalState.set("color", "secondary");
                      localStorage.setItem(
                        "customize",
                        JSON.stringify({
                          ...customize,
                          color: "secondary",
                        })
                      );
                    }}
                    sx={{
                      p: 2,
                    }}
                  >
                    <SidebarLayoutIcon />
                  </Button>
                </Grid>
                <Grid size={4}>
                  <Button
                    disableFocusRipple
                    disableRipple
                    color={color === "info" ? "primary" : "info"}
                    onClick={() => {
                      globalState.set("color", "info");
                      localStorage.setItem(
                        "customize",
                        JSON.stringify({
                          ...customize,
                          color: "info",
                        })
                      );
                    }}
                    sx={{
                      p: 2,
                    }}
                  >
                    <SidebarLayoutIcon />
                  </Button>
                </Grid>
                <Grid size={4}>
                  <Button
                    disableFocusRipple
                    disableRipple
                    color={color === "error" ? "primary" : "error"}
                    onClick={() => {
                      globalState.set("color", "error");
                      localStorage.setItem(
                        "customize",
                        JSON.stringify({
                          ...customize,
                          color: "error",
                        })
                      );
                    }}
                    sx={{
                      p: 2,
                    }}
                  >
                    <SidebarLayoutIcon />
                  </Button>
                </Grid>
                <Grid size={4}>
                  <Button
                    disableFocusRipple
                    disableRipple
                    color={color === "warning" ? "primary" : "warning"}
                    onClick={() => {
                      globalState.set("color", "warning");
                      localStorage.setItem(
                        "customize",
                        JSON.stringify({
                          ...customize,
                          color: "warning",
                        })
                      );
                    }}
                    sx={{
                      p: 2,
                    }}
                  >
                    <SidebarLayoutIcon />
                  </Button>
                </Grid>
                <Grid size={4}>
                  <Button
                    disableFocusRipple
                    disableRipple
                    color={color === "success" ? "primary" : "success"}
                    onClick={() => {
                      globalState.set("color", "success");
                      localStorage.setItem(
                        "customize",
                        JSON.stringify({
                          ...customize,
                          color: "success",
                        })
                      );
                    }}
                    sx={{
                      p: 2,
                    }}
                  >
                    <SidebarLayoutIcon />
                  </Button>
                </Grid>
              </Grid>
            </Stack>
          </Stack>
        </Scrollbar>
      </CustomBox>
    </SwipeableDrawer>
  );
};

export default SettingsDrawer;
