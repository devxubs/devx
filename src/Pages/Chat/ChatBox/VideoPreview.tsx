"use client";

import React, { useEffect, useRef, useState } from "react";
import {
   Box,
   Stack,
   alpha,
   IconButton,
   Slider,
   useMediaQuery,
   Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Icon from "@src/components/Icon";
import ReactPlayer from "react-player";
import { formatTime } from "./VideoPlayer";

interface VideoPreviewProps {
   ref: any;
   src: string;
   playing: boolean;
   played: number;
   onProgress: (p: any) => void;
   onPlay: () => void;
   onClose: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
   src,
   playing,
   onPlay,
   onProgress,
   onClose,
}) => {
   const theme = useTheme();
   const backdropRef = useRef<HTMLDivElement>(null);
   const playerRef = useRef<any>(null);
   const [played, setPlayed] = useState(0);
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const [playedSeconds, setPlayedSeconds] = useState(0);
   const [duration, setDuration] = useState(0);

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
      // We only want to update time slider if we are not currently seeking
      if (!player || !player.duration) return;

      setPlayed(player.currentTime / player.duration);
      setDuration(player.duration);
      setPlayedSeconds(player.currentTime);
   };

   // Close video if user clicks outside
   useEffect(() => {
      const handleBackdropClick = (event: MouseEvent) => {
         if (backdropRef.current && event.target === backdropRef.current) {
            onClose?.();
         }
      };

      document.addEventListener("click", handleBackdropClick);
      return () => document.removeEventListener("click", handleBackdropClick);
   }, [onClose]);

   return (
      <Stack
         ref={backdropRef}
         position="fixed"
         top={0}
         left={0}
         width="100%"
         height="100%"
         zIndex={1300}
         alignItems="center"
         justifyContent="center"
         bgcolor={alpha(theme.palette.grey[900], 0.6)}
         sx={{
            backdropFilter: "blur(4px)",
         }}
      >
         {/* Video Player */}
         <Box
            position="relative"
            width={isSmDown ? "100%" : "80%"}
            height={isSmDown ? "100%" : "70vh"}
            maxWidth={800}
            borderRadius={isSmDown ? 0 : 2}
            overflow="hidden"
            boxShadow={4}
         >
            <ReactPlayer
               ref={playerRef}
               src={src}
               width="100%"
               height="100%"
               playing={playing}
               onProgress={onProgress}
               onTimeUpdate={() => handleTimeUpdate()}
               playsInline
               onEnded={onPlay}
               style={{
                  backgroundColor: "black",
               }}
               onClick={() => {
                  onPlay();
               }}
            />
         </Box>

         {/* Controls */}
         <Stack
            direction="row"
            spacing={1}
            position="absolute"
            bottom={32}
            alignItems="center"
            bgcolor={alpha(theme.palette.background.paper, 0.7)}
            borderRadius={2}
            p={0.5}
            px={1.5}
            width="80%"
            maxWidth={800}
         >
            {/* Play / Pause */}
            <IconButton onClick={() => onPlay()} color="inherit">
               {playing ? (
                  <Icon icon="carbon:pause" size="small" />
               ) : (
                  <Icon icon="carbon:play" size="small" />
               )}
            </IconButton>

            {/* Progress Slider */}
            <Stack spacing={1} direction={"row"} alignItems={"center"} flex={1}>
               <Typography variant="body2" color="textPrimary">
                  {formatTime(playedSeconds)}
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
               <Typography variant="body2" color="textPrimary">
                  {playerRef.current ? formatTime(duration) : "0"}
               </Typography>
            </Stack>
            {/* Close */}
            <IconButton size="small" onClick={onClose}>
               <Icon icon="solar:quit-full-screen-square-bold-duotone" />
            </IconButton>
         </Stack>
      </Stack>
   );
};

export default VideoPreview;
