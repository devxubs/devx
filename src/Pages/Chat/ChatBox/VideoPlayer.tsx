"use client";

import React, { useEffect, useRef, useState } from "react";
import {
   alpha,
   Box,
   Fade,
   IconButton,
   Slider,
   Stack,
   Typography,
   useTheme,
} from "@mui/material";
import ReactPlayer from "react-player";
import Icon from "@src/components/Icon";
import VideoPreview from "./VideoPreview";

interface VideoPlayerProps {
   url: string;
   height?: string;
   width?: string;
}

export const formatTime = (seconds: number) => {
   if (!seconds || isNaN(seconds)) return "0:0";
   const mins = Math.floor(seconds / 60);
   const secs = Math.floor(seconds % 60);
   return `${String(mins).padStart(1, "0")}:${String(secs).padStart(1, "0")}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
   const theme = useTheme();
   const playerRef = useRef<any>(null);
   const containerRef = useRef<HTMLDivElement | null>(null);

   const [playing, setPlaying] = useState(false);
   const [played, setPlayed] = useState(0);
   const [open, setOpen] = useState(false);
   const [playedSeconds, setPlayedSeconds] = useState(0);
   const [duration, setDuration] = useState(0);

   const handleProgress = (state: any) => {
      if (typeof state.played === "number") {
         setPlayed(state.played);
      }
   };

   const handleSeek = (value: any) => {
      const seekTo = Array.isArray(value) ? value[0] : value;
      setPlayed(seekTo);

      if (playerRef.current) {
         playerRef.current.currentTime =
            Number.parseFloat(value) * playerRef.current.duration;
      }
   };

   const handleTimeUpdate = () => {
      const player = playerRef.current;
      if (!player || !player.duration) return;

      setPlayed(player.currentTime / player.duration);
      setDuration(player.duration);
      setPlayedSeconds(player.currentTime);
   };

   // 🧠 Added scroll/visibility observer to pause video when out of view
   useEffect(() => {
      const element = containerRef.current;
      if (!element) return;

      const observer = new IntersectionObserver(
         (entries) => {
            const [entry] = entries;
            if (!entry.isIntersecting && playing) {
               setPlaying(false); // Pause when not visible
            }
         },
         {
            threshold: 0.2, // 20% must be visible to stay playing
         }
      );

      observer.observe(element);
      return () => observer.disconnect();
   }, [playing]);

   useEffect(() => {
      const player = playerRef.current;
      if (!player || !player.duration) return;

      setDuration(player.duration);
   }, []);

   return (
      <>
         {/* ✅ Fullscreen preview */}
         <Fade in={open}>
            <Stack>
               <VideoPreview
                  ref={playerRef}
                  src={url}
                  playing={!open ? false : playing}
                  played={played}
                  onProgress={handleProgress}
                  onPlay={() => setPlaying(!playing)}
                  onClose={() => {
                     setOpen(false);
                  }}
               />
            </Stack>
         </Fade>

         {/* ✅ Inline player */}
         <Box
            ref={containerRef} // 👈 added ref here for scroll detection
            sx={{
               position: "relative",
               backgroundColor: "#000",
               borderRadius: 2,
               overflow: "hidden",
               width: "100%",
               height: "100%",
               maxWidth: 300,
               maxHeight: 300,
            }}
         >
            <ReactPlayer
               ref={open ? null : playerRef}
               src={url}
               playing={!open && playing}
               onProgress={handleProgress}
               onTimeUpdate={handleTimeUpdate}
               playsInline
               width={"100%"}
               height={"100%"}
               onEnded={() => setPlaying(false)}
               onClick={() => {
                  if (playing) {
                     setOpen(true);
                  } else {
                     setPlaying(true);
                  }
               }}
            />

            {/* Controls */}
            <Stack
               direction="row"
               alignItems="center"
               spacing={1}
               sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  px: 1,
                  py: 0.3,
               }}
            >
               {/* Play / Pause */}
               <IconButton onClick={() => setPlaying((p) => !p)} size="small">
                  {playing ? (
                     <Icon icon="carbon:pause" size="small" />
                  ) : (
                     <Icon icon="carbon:play" size="small" />
                  )}
               </IconButton>
               {/* Progress Slider */}
               <Stack
                  spacing={2}
                  direction={"row"}
                  alignItems={"center"}
                  flex={1}
                  pr={1.5}
               >
                  <Typography variant="body2" color="textPrimary">
                     {played ? formatTime(playedSeconds) : formatTime(duration)}
                  </Typography>
                  <Slider
                     min={0}
                     max={1}
                     step={0.01}
                     value={played}
                     onChange={(_, v) => handleSeek(v)}
                     sx={{ flexGrow: 1 }}
                     size="small"
                  />
                  {/* <Typography variant="body2" color="textPrimary">
                     {playerRef.current ? formatTime(duration) : "0"}
                  </Typography> */}
               </Stack>
               {/* Fullscreen */}
               {/* <IconButton
                  onClick={() => setOpen(true)}
                  color="inherit"
                  size="small"
               >
                  <Icon
                     icon="solar:full-screen-square-bold-duotone"
                     size="small"
                  />
               </IconButton> */}
            </Stack>
         </Box>
      </>
   );
};

export default VideoPlayer;
