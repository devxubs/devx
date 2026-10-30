"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Divider,
  Button,
  useTheme,
  Stack,
  TextField,
  Typography,
  Tooltip,
  alpha,
} from "@mui/material";

import Icon from "../Icon";
import CustomPopover from "../CustomPopover";
import ImageDropzoneButton from "./ImageDropzoneButton";

function useEditorState(editor: any) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const update = () => setVersion((v) => v + 1);

    editor.on("transaction", update);
    editor.on("selectionUpdate", update);

    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  return editor?.view?.state; // return something reactive
}

const ClearFormatIcon = () => {
  return (
    <svg
      focusable="false"
      aria-hidden="true"
      fill="currentcolor"
      width={"1rem"}
      height={"1rem"}
      fontSize={18}
      viewBox="0 0 24 24"
    >
      <path d="M12.6512 14.0654L11.6047 20H9.57389L10.9247 12.339L3.51465 4.92892L4.92886 3.51471L20.4852 19.0711L19.071 20.4853L12.6512 14.0654ZM11.7727 7.53009L12.0425 5.99999H10.2426L8.24257 3.99999H19.9999V5.99999H14.0733L13.4991 9.25652L11.7727 7.53009Z"></path>
    </svg>
  );
};

function MenuBar({
  editor,
  onFullScreen,
  fullScreen,
}: {
  editor: any;
  onFullScreen: Function;
  fullScreen: boolean;
}) {
  useEditorState(editor);
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [heading, setHeading] = useState("Paragraph");
  const [headingAnchorEl, setHeadingAnchorEl] = useState<null | HTMLElement>(
    null
  );

  if (!editor) return null;

  const handleLinkClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setLinkUrl(editor.getAttributes("link")?.href || "");
  };

  const handleLinkClose = () => {
    setAnchorEl(null);
  };

  const headings = [
    "Paragraph",
    "Heading 1",
    "Heading 2",
    "Heading 3",
    "Heading 4",
    "Heading 5",
    "Heading 6",
  ];

  return (
    <Stack
      direction={"row"}
      alignItems={"stretch"}
      flexWrap={"wrap"}
      spacing={1}
      sx={{
        p: 1,
        borderBottom: 1,
        borderColor: "divider",
        borderRadius: 1,
        borderBottomRightRadius: 0,
        borderBottomLeftRadius: 0,
        bgcolor: alpha(theme.palette.background.default, 0.4),
      }}
    >
      <Box sx={{ minWidth: 120, mr: 1 }}>
        <Button
          size="small"
          onClick={(e) => {
            setHeadingAnchorEl(e.currentTarget);
          }}
          color={"inherit"}
          sx={{
            minWidth: "0px!important",
            height: "28px",
            width: "100%",
            borderRadius: "6px",
            boxShadow: "none",
            border: 1,
            borderColor: theme.palette.action.hover,
            bgcolor: "transparent",
            fontWeight: 400,
            "&:hover": {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          {heading}
        </Button>

        <CustomPopover
          anchorEl={headingAnchorEl}
          onClose={() => {
            setHeadingAnchorEl(null);
          }}
        >
          {headings.map((h, idx) => {
            const hn =
              h.toLowerCase() !== "paragraph" && "h" + h.split(" ").pop();
            const variant: any =
              h.toLowerCase() === "paragraph" ? "body1" : `${hn}`;

            return (
              <Tooltip
                key={idx}
                disableInteractive
                title={`(Ctrl + alt + ${idx}) `}
              >
                <Box
                  sx={{
                    my: 0.5,
                    px: 1,
                    py: 0.5,
                    borderRadius: "6px",
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                  onClick={() => {
                    setHeading(h);
                    if (h === "Paragraph") {
                      editor.chain().focus().setParagraph().run();
                    } else {
                      const level = parseInt(h.replace("Heading ", ""), 10);

                      editor.chain().focus().toggleHeading({ level }).run();
                    }
                  }}
                >
                  <Typography
                    variant={variant}
                    fontSize={`${
                      18 - parseInt(h.split(" ").pop() || "0")
                    }px!important`}
                    fontWeight={hn ? 700 : 400}
                  >
                    {h}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </CustomPopover>
      </Box>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 1, my: "10px!important" }}
      />

      <Stack direction={"row"} spacing={0.5} py={0.5}>
        <Tooltip title="Bold (Ctrl + B)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={"inherit"}
            //   variant={editor.isActive("bold") ? "contained" : "text"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive("bold")
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive("bold")
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-bold" />
          </Button>
        </Tooltip>

        <Tooltip disableInteractive title="Italic (Ctrl + I)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive("italic")
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive("italic")
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-italic" />
          </Button>
        </Tooltip>
        <Tooltip disableInteractive title="Strike (Ctrl + Shift + s)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive("strike")
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive("strike")
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="carbon:text-strikethrough" />
          </Button>
        </Tooltip>
        <Tooltip disableInteractive title="Underline (Ctrl + U)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive("underline")
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive("underline")
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-underlined" />
          </Button>
        </Tooltip>
      </Stack>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 1, my: "10px!important" }}
      />

      <Stack direction={"row"} spacing={0.5} py={0.5}>
        <Tooltip disableInteractive title="Bullet list (Ctrl + Shift + 8)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive("bulletList")
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive("bulletList")
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-list-bulleted" />
          </Button>
        </Tooltip>

        <Tooltip disableInteractive title="Ordered list (Ctrl + Shift + 7)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive("orderedList")
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive("orderedList")
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-list-numbered" />
          </Button>
        </Tooltip>
      </Stack>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 1, my: "10px!important" }}
      />

      <Stack direction="row" spacing={0.5} py={0.5}>
        <Tooltip disableInteractive title="Align left (Ctrl + Shift + L)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive({ textAlign: "left" })
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive({ textAlign: "left" })
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-align-left" />
          </Button>
        </Tooltip>

        <Tooltip disableInteractive title="Align center (Ctrl + Shift + E)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive({ textAlign: "center" })
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive({ textAlign: "center" })
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-align-center" />
          </Button>
        </Tooltip>

        <Tooltip disableInteractive title="Align right (Ctrl + Shift + R)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive({ textAlign: "right" })
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive({ textAlign: "right" })
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-align-right" />
          </Button>
        </Tooltip>

        <Tooltip disableInteractive title="Align justify (Ctrl + Shift + J)">
          <Button
            size="small"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive({ textAlign: "justify" })
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive({ textAlign: "justify" })
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="ic:round-format-align-justify" />
          </Button>
        </Tooltip>
      </Stack>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 1, my: "10px!important" }}
      />

      <Stack direction={"row"} spacing={0.5} py={0.5}>
        <Tooltip disableInteractive title="Link">
          <Button
            size="small"
            onClick={(e) => {
              handleLinkClick(e);
              if (linkUrl) {
                editor
                  .chain()
                  .focus()
                  .setLink({
                    href: linkUrl,
                    style: {
                      color: "red",
                    },
                  })
                  .run();
              }
            }}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: editor.isActive("link")
                ? theme.palette.action.hover
                : "transparent",
              bgcolor: editor.isActive("link")
                ? theme.palette.action.selected
                : "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="streamline-flex:link-chain-solid" />
          </Button>
        </Tooltip>

        <Tooltip disableInteractive title="Remove link">
          <Button
            size="small"
            disabled={!editor.isActive("link")}
            onClick={() => editor.chain().focus().unsetLink().run()}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="streamline-flex:broken-link-1-remix" />
          </Button>
        </Tooltip>
        <CustomPopover anchorEl={anchorEl} onClose={handleLinkClose}>
          <Stack spacing={1} sx={{ p: 1, width: 240 }}>
            <TextField
              type="text"
              placeholder="Enter URL"
              value={linkUrl}
              size="small"
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                }
              }}
              sx={{
                "& > div": {
                  borderRadius: "8px!important",
                },
                "& .MuiInputBase-input": {
                  fontSize: 13,
                },
              }}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!linkUrl}
              onClick={() => {
                if (linkUrl) {
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .setLink({ href: linkUrl, class: "custom-link" })
                    .run();
                } else {
                  editor.chain().focus().unsetLink().run();
                }
                handleLinkClose();
              }}
            >
              Apply
            </Button>
          </Stack>
        </CustomPopover>
        <ImageDropzoneButton editor={editor} />
      </Stack>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 1, my: "10px!important" }}
      />

      <Stack direction={"row"} spacing={0.5} py={0.5}>
        <Tooltip disableInteractive title="Heard break">
          <Button
            size="small"
            onClick={(e) => {
              editor.chain().focus().setHardBreak().run();
            }}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: "transparent",
              bgcolor: "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon size="large" icon="icon-park-outline:paragraph-break-two" />
          </Button>
        </Tooltip>

        <Tooltip disableInteractive title="Clear format">
          <Button
            size="small"
            onClick={() => {
              editor.chain().focus().clearNodes().unsetAllMarks().run();
            }}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: "transparent",
              bgcolor: "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ClearFormatIcon />
          </Button>
        </Tooltip>
      </Stack>
      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 1, my: "10px!important" }}
      />

      <Stack direction={"row"} spacing={0.5} py={0.5}>
        <Tooltip disableInteractive title="Full screen">
          <Button
            size="small"
            onClick={() => {
              onFullScreen();
            }}
            color={"inherit"}
            sx={{
              minWidth: "0px!important",
              height: "28px",
              width: "28px",
              borderRadius: "6px",
              boxShadow: "none",
              border: 1,
              borderColor: "transparent",
              bgcolor: "transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            {fullScreen ? (
              <Icon size="large" icon="mingcute:fullscreen-exit-fill" />
            ) : (
              <Icon size="large" icon="mingcute:fullscreen-fill" />
            )}
          </Button>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

export default MenuBar;
