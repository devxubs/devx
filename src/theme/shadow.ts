import { alpha } from "@mui/material/styles";

const createShadow = (color: string) => {
  const transparent1 = alpha(color, 0.2);
  const transparent2 = alpha(color, 0.14);
  const transparent3 = alpha(color, 0.12);

  return `0px 3px 1px -2px ${transparent1}, 0px 2px 2px 0px ${transparent2}, 0px 1px 5px 0px ${transparent3}`;
};

const shadows: [
  "none",
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
] = [
  "none",
  "0px 0px 0px 0px rgba(145, 158, 171, 0.2)",
  "0px 1px 2px 0px rgba(145, 158, 171, 0.2)",
  "0px 1px 3px 0px rgba(145, 158, 171, 0.2)",
  "0px 1px 4px 0px rgba(145, 158, 171, 0.2)",
  "0px 2px 4px -1px rgba(145, 158, 171, 0.2)",
  "0px 3px 6px -2px rgba(145, 158, 171, 0.2)",
  "0px 3px 8px -3px rgba(145, 158, 171, 0.2)",
  "0px 4px 10px -4px rgba(145, 158, 171, 0.2)",
  "0px 5px 12px -5px rgba(145, 158, 171, 0.2)",
  "0px 6px 16px -6px rgba(145, 158, 171, 0.2)",
  "0px 7px 20px -7px rgba(145, 158, 171, 0.2)",
  "0px 8px 24px -8px rgba(145, 158, 171, 0.2)",
  "0px 9px 28px -9px rgba(145, 158, 171, 0.2)",
  "0px 10px 32px -10px rgba(145, 158, 171, 0.2)",
  "0px 11px 36px -11px rgba(145, 158, 171, 0.2)",
  "0px 12px 40px -12px rgba(145, 158, 171, 0.2)",
  "0px 13px 44px -13px rgba(145, 158, 171, 0.2)",
  "0px 14px 48px -14px rgba(145, 158, 171, 0.2)",
  "0px 15px 52px -15px rgba(145, 158, 171, 0.2)",
  "0px 16px 56px -16px rgba(145, 158, 171, 0.2)",
  "0px 17px 60px -17px rgba(145, 158, 171, 0.2)",
  "0px 18px 64px -18px rgba(145, 158, 171, 0.2)",
  "0px 19px 68px -19px rgba(145, 158, 171, 0.2)",
  "0px 20px 72px -20px rgba(145, 158, 171, 0.2)",
];

// Custom named shadows
export const customShadows = {
  card: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)",
  dropdown:
    "0 0 2px 0 rgba(145, 158, 171, 0.24), 0 20px 40px -4px rgba(145, 158, 171, 0.24)",
  dialog:
    "0 0 2px 0 rgba(145, 158, 171, 0.24), 0 40px 80px -8px rgba(145, 158, 171, 0.24)",

  primary: createShadow("#00A76F"),
  secondary: createShadow("#8E33FF"),
  info: createShadow("#00B8D9"),
  success: createShadow("#22C55E"),
  warning: createShadow("#FFA800"),
  error: createShadow("#FF5630"),
};

export default shadows;
