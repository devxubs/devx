"use client";

import React, { useRef, useState, useEffect } from "react";
import {
   Stack,
   IconButton,
   Box,
   Typography,
   Slider,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";

interface VoiceMessageProps {
   url: string;
   name: string;
}

const formatTime = (seconds: number) => {
   if (!seconds || isNaN(seconds)) return "0:0";
   const m = Math.floor(seconds / 60);
   const s = Math.floor(seconds % 60);
   return `${m}:${s < 10 ? "0" + s : s}`;
};

const VoiceMessage = ({ url, name }: VoiceMessageProps) => {
   const theme = useTheme();
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const containerRef = useRef<HTMLDivElement | null>(null);

   const [isPlaying, setIsPlaying] = useState(false);
   const [duration, setDuration] = useState(0);
   const [currentTime, setCurrentTime] = useState(0);
   const [isSeeking, setIsSeeking] = useState(false);

   // 🎧 Load metadata & update progress
   useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const update = () => {
         setDuration(audio.duration || 0);
         setCurrentTime(audio.currentTime);
      };

      audio.ontimeupdate = update;
      return () => {
         audio.ontimeupdate = null;
      };
   }, []);

   // ▶️ Play / ⏸ Pause
   const handlePlayPause = async () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
         audio.pause();
         setIsPlaying(false);
      } else {
         try {
            await audio.play();
            setIsPlaying(true);
         } catch (error) {
            console.error("Audio play failed:", error);
         }
      }
   };

   // 🎚️ Slider
   const handleSliderChange = (
      _event: Event | React.SyntheticEvent<Element, Event>,
      value: number | number[]
   ) => {
      const v = Array.isArray(value) ? value[0] : value;
      const audio = audioRef.current;
      if (!audio) return;

      setIsSeeking(true);
      setCurrentTime(v);
      audio.currentTime = v;
   };

   const handleSliderCommitted = (
      _event: Event | React.SyntheticEvent<Element, Event>,
      value: number | number[]
   ) => {
      const v = Array.isArray(value) ? value[0] : value;
      const audio = audioRef.current;
      if (!audio) return;

      audio.currentTime = v;
      setCurrentTime(v);
      setIsSeeking(false);
   };

   // 👁️ Pause when scrolled out of view
   useEffect(() => {
      const element = containerRef.current;
      const audio = audioRef.current;
      if (!element || !audio) return;

      const observer = new IntersectionObserver(
         (entries) => {
            const [entry] = entries;
            if (!entry.isIntersecting && isPlaying) {
               audio.pause();
               setIsPlaying(false);
            }
         },
         {
            threshold: 0.2, // 20% visible required to keep playing
         }
      );

      observer.observe(element);

      return () => observer.disconnect();
   }, [isPlaying]);

   return (
      <Stack
         ref={containerRef}
         direction="row"
         alignItems="center"
         spacing={1}
         minWidth={250}
         maxWidth={450}
         sx={{
            p: 1,
            borderRadius: 1.5,
         }}
      >
         {/* ▶️ Play / ⏸ Pause */}
         <IconButton onClick={handlePlayPause} sx={{ p: 0.5 }}>
            <Icon
               icon={
                  isPlaying
                     ? "solar:pause-circle-bold-duotone"
                     : "solar:play-circle-bold-duotone"
               }
               style={{
                  fontSize: 32,
                  color:
                     theme.palette.mode === "dark"
                        ? theme.palette.text.secondary
                        : theme.palette.text.secondary,
               }}
            />
         </IconButton>

         {/* 🎚️ Slider + Time */}
         <Box sx={{ flex: 1, mx: 1 }}>
            {/* <Typography variant="body2" noWrap sx={{ mb: 0.5 }}>
               {name}
            </Typography> */}
            <Stack direction="row" alignItems="center" spacing={1}>
               <Typography variant="caption">
                  {formatTime(currentTime)}
               </Typography>
               <Slider
                  value={currentTime}
                  min={0}
                  max={duration}
                  step={0.1}
                  onChange={handleSliderChange}
                  onChangeCommitted={handleSliderCommitted}
                  sx={{
                     flex: 1,
                     height: 10,
                     "& .MuiSlider-thumb": { width: 15, height: 15 },
                     "& .MuiSlider-rail": { opacity: 0.3 },
                     "& .MuiSlider-track": { border: "none" },
                  }}
               />
               <Typography variant="caption">{formatTime(duration)}</Typography>
            </Stack>
         </Box>

         {/* 🔊 Voice Icon */}
         <Icon
            icon="icon-park-solid:voice-one"
            style={{
               fontSize: 24,
               color:
                  theme.palette.mode === "dark"
                     ? theme.palette.text.secondary
                     : theme.palette.text.secondary,
            }}
         />

         {/* 🎵 Hidden Audio */}
         <audio ref={audioRef} src={url} preload="metadata" />
      </Stack>
   );
};

export default VoiceMessage;
