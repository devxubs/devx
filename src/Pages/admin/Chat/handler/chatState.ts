"use client";

import { createBucket } from "react-state-bucket";

const initialState = {
   isRecording: false,
   showRecord: false,
};

const useChatState = createBucket(initialState);

export default useChatState;
