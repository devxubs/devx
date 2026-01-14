export const formatCompactNumber = (num: number) => {
   if (num >= 1_000_000) return `${num / 1_000_000}m`;
   if (num >= 1_000) return `${num / 1_000}k`;
   return num.toString();
};
