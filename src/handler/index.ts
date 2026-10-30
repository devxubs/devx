export const formatCompactNumber = (num: number | string | null | undefined): string => {
   if (num === null || num === undefined) return "0";
   let parsed: number;
   if (typeof num === "number") {
      parsed = isNaN(num) ? 0 : num;
   } else {
      const cleaned = String(num).replace(/[^0-9.-]/g, "");
      parsed = cleaned ? parseFloat(cleaned) : 0;
      if (isNaN(parsed)) parsed = 0;
   }

   return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
   }).format(parsed);
};
