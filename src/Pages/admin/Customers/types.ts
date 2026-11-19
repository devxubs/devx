export type {
   CustomerRow,
   CustomerFilterState,
   CustomerFilterErrors,
   FilterChipDescriptor,
   FilterChipKey,
} from "./components/customerFilterUtils";

export type SnackState = {
   severity: "success" | "error";
   message: string;
} | null;
