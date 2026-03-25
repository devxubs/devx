export const formatCompactNumber = (num: number) => {
   // if (num >= 1_000_000) return `${num / 1_000_000}m`;
   // if (num >= 1_000) return `${num / 1_000}k`;
   // return num.toString();
   const formattedNumber = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1, // Optional: sets the maximum number of decimals, e.g., 1.2K
   }).format(num);

   return formattedNumber;
};
