"use client";

import React, { useState, useRef, useEffect } from "react";
import {
   Stack,
   LinearProgress,
   Typography,
   IconButton,
   Tooltip,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import SendIcon from "@src/SvgIcon/SendIcon";
import useChatState from "./handler/chatState";

const VoiceRecorder = () => {
   const theme = useTheme();
   const state = useChatState();
   const [audioUrl, setAudioUrl] = useState<string | null>(null);
   const [isPlaying, setIsPlaying] = useState(false);
   const [progress, setProgress] = useState(0);
   const [duration, setDuration] = useState(0);

   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
   const audioChunksRef = useRef<Blob[]>([]);
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const timer = useRef<number | null>(null);

   const clearTimer = () => timer.current && clearInterval(timer.current);

   const handleRecord = async () => {
      try {
         const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
         });
         const mediaRecorder = new MediaRecorder(stream);
         mediaRecorderRef.current = mediaRecorder;
         audioChunksRef.current = [];
         setAudioUrl(null);
         state.set("isRecording", true);
         setProgress(0);
         setDuration(0);

         mediaRecorder.ondataavailable = (e) =>
            e.data.size && audioChunksRef.current.push(e.data);
         mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, {
               type: "audio/webm",
            });
            setAudioUrl(URL.createObjectURL(blob));
            stream.getTracks().forEach((t) => t.stop());
            clearTimer();
         };

         mediaRecorder.start();
         const start = Date.now();
         timer.current = window.setInterval(() => {
            const elapsed = (Date.now() - start) / 1000;
            setDuration(elapsed);
            setProgress(Math.min((elapsed / 60) * 100, 100));
         }, 100);
      } catch {
         // Microphone access error handled gracefully
      }
   };

   const handleStop = () => {
      mediaRecorderRef.current?.stop();
      state.set("isRecording", false);
      setProgress(0);
   };

   const handlePlayPause = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
         audioRef.current.pause();
         setIsPlaying(false);
         clearTimer();
      } else {
         audioRef.current.play();
         setIsPlaying(true);
         timer.current = window.setInterval(() => {
            const { currentTime, duration } = audioRef.current!;
            setProgress((currentTime / duration) * 100);
            setDuration(currentTime);
         }, 100);
      }
   };

   const handleClear = () => {
      setAudioUrl(null);
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
      state.set("isRecording", false);
      state.set("showRecord", false);
      clearTimer();
   };

   // Auto pause when audio ends
   useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleEnded = () => {
         setIsPlaying(false);
         setProgress(100);
         clearTimer();
      };

      audio.addEventListener("ended", handleEnded);
      return () => audio.removeEventListener("ended", handleEnded);
   }, [audioUrl]);

   useEffect(() => {
      clearTimer();
   }, []);
   useEffect(() => {
      if (state.get("isRecording")) handleRecord();
   }, []);

   return (
      <Stack spacing={2}>
         <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
               variant="body2"
               color="text.secondary"
               sx={{ minWidth: 32 }}
            >
               {duration.toFixed(1)}s
            </Typography>
            <LinearProgress
               variant="determinate"
               value={progress}
               sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                     theme.palette.mode === "dark"
                        ? theme.palette.grey[800]
                        : theme.palette.grey[200],
                  "& .MuiLinearProgress-bar": {
                     borderRadius: 4,
                     backgroundColor: state.get("isRecording")
                        ? theme.palette.error.main
                        : theme.palette.primary.main,
                  },
               }}
            />
         </Stack>

         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
         >
            <Tooltip title="Clear Recording">
               <IconButton size="small" onClick={handleClear}>
                  <Icon icon="solar:trash-bin-trash-bold" size="small" />
               </IconButton>
            </Tooltip>

            <Tooltip
               title={
                  !audioUrl
                     ? state.get("isRecording")
                        ? "Stop"
                        : "Record"
                     : isPlaying
                     ? "Pause"
                     : "Play"
               }
            >
               <IconButton
                  size="small"
                  onClick={
                     !audioUrl
                        ? state.get("isRecording")
                           ? handleStop
                           : handleRecord
                        : handlePlayPause
                  }
               >
                  <Icon
                     icon={
                        !audioUrl
                           ? state.get("isRecording")
                              ? "material-symbols:stop-circle-outline"
                              : "solar:microphone-bold-duotone"
                           : isPlaying
                           ? "carbon:pause"
                           : "carbon:play"
                     }
                     size="small"
                  />
               </IconButton>
            </Tooltip>

            <Tooltip title="Send Recording">
               <IconButton size="small">
                  <SendIcon fontSize="small" />
               </IconButton>
            </Tooltip>
         </Stack>

         {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      </Stack>
   );
};

export default VoiceRecorder;
