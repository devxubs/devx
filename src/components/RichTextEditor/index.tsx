"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import HardBreak from "@tiptap/extension-hard-break";

import { Box, useTheme, Stack, alpha } from "@mui/material";
import MenuBar from "./MenuBar";
import { useState, useEffect } from "react";

interface RichTextEditorProps {
  error?: boolean;
  helperText?: string;
  value?: string;
  onChange?: Function;
}

export default function ReachTextEditor({
  error,
  helperText,
  value,
  onChange,
}: RichTextEditorProps) {
  const [fullScreen, setFullScreen] = useState(false);
  const theme = useTheme();
  const editor = useEditor({
    immediatelyRender: false,
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    extensions: [
      StarterKit.configure({ hardBreak: false }),
      HardBreak.extend({
        addKeyboardShortcuts() {
          return {
            "Mod-Enter": () => this.editor.commands.setHardBreak(),
            "Shift-Enter": () => this.editor.commands.setHardBreak(),
          };
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        enableClickSelection: true,
        linkOnPaste: true,
        HTMLAttributes: { class: "custom-link" },
      }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
  });

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) return null; // Don't render until editor is ready

  return (
    <Stack
      sx={{
        width: fullScreen ? "100vw" : "100%",
        height: fullScreen ? "100vh" : "auto",
        position: fullScreen ? "fixed" : "relative",
        top: fullScreen ? 0 : "auto",
        bottom: fullScreen ? 0 : "auto",
        left: fullScreen ? 0 : "auto",
        right: fullScreen ? 0 : "auto",
        zIndex: fullScreen ? 99999 : "auto",
        maxHeight: fullScreen ? "100vh" : 480,
        // transform: fullScreen ? "scale(1)" : "scale(0.99)", // subtle zoom effect
        transformOrigin: "center center", // zoom from center
        boxShadow: fullScreen ? "0 4px 40px rgba(0,0,0,0.3)" : "none",
        bgcolor: fullScreen ? "background.paper" : "initial",
        p: fullScreen ? 2 : 0,
      }}
    >
      <Stack
        sx={{
          p: 0,
          borderRadius: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: 1,
          borderColor: error ? "error.main" : "divider",
          transition: "all 0.2s ease", // smooth animation for position & size
          minHeight: 240,
          height: "100%",
          width: "100%",
          transform: "none",
        }}
      >
        <style>{`
        .tiptap-main{
          min-height: 200px
        }
        .tiptap{
          min-height: 200px;
          height: 100%;
          width: 100%;
          outline: none;
          font-size: 14px;
          line-height: 1.5;
          padding: 12px 16px;
          color: ${theme.palette.text.primary};
          overflow-y: auto;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          height: fit-content;
        }
        .tiptap::-webkit-scrollbar {
          display: none !important;
        }
        .custom-link {
          color: ${theme.palette.primary.main};
          text-decoration: underline;
        }
      `}</style>
        <MenuBar
          editor={editor}
          onFullScreen={() => setFullScreen(!fullScreen)}
          fullScreen={fullScreen}
        />
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none !important",
            msOverflowStyle: "none !important",
            "&::-webkit-scrollbar": {
              display: "none !important",
            },
            bgcolor: error ? alpha(theme.palette.error.main, 0.08) : "initial",
            p: 0,
          }}
        >
          <EditorContent editor={editor} className="tiptap-main" />
        </Box>
      </Stack>
    </Stack>
  );
}
