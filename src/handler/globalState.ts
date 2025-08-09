"use client";

import { createBucket } from "react-state-bucket";
import { GlobalStateProps } from "./globalTypes";

const initialState: GlobalStateProps = {
  theme: "dark",
  color: "primary",
  layoutFull: true,
};

const useGlobalState = createBucket(initialState);

export default useGlobalState;
