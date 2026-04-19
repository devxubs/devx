export const formatCompactNumber = (num: number) => {
   const formattedNumber = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1, // Optional: sets the maximum number of decimals, e.g., 1.2K
   }).format(num);

   return formattedNumber;
};
