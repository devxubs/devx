import { useMemo, useCallback } from "react";
import { FilterData } from "@src/components/Table/Filter";
import useQueryParams from "./useQueryParams";
import delayExecute from "./delayExecute";

export const useFilterQuery = () => {
   const query = useQueryParams();
   const filterRaw = query.get("filter");

   const filterQueryData: FilterData = useMemo(() => {
      let getFilterData: FilterData = {
         orderData: {},
         reportData: {},
      };
      if (filterRaw) {
         try {
            getFilterData = JSON.parse(
               decodeURIComponent(filterRaw) || "{}",
            );
         } catch {
            getFilterData = { orderData: {}, reportData: {} };
         }
      }
      return getFilterData;
   }, [filterRaw]);

   const setFilterQueryData = useCallback((data: FilterData, millisecond?: number) => {
      millisecond = millisecond || 500;
      delayExecute(() => {
         query.set(
            "filter",
            encodeURIComponent(
               JSON.stringify({
                  ...filterQueryData,
                  ...data,

                  orderData: {
                     ...filterQueryData?.orderData,
                     ...data.orderData,
                  },
                  reportData: {
                     ...filterQueryData?.reportData,
                     ...data.reportData,
                  },
               }),
            ),
            false,
         );
      }, millisecond);
   }, [query, filterQueryData]);

   return {
      filterQueryData,
      setFilterQueryData,
   };
};
