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
         customerData: {},
         reportData: {},
      };
      if (filterRaw) {
         try {
            getFilterData = JSON.parse(
               decodeURIComponent(filterRaw) || "{}",
            );
         } catch {
            getFilterData = {
               orderData: {},
               customerData: {},
               reportData: {},
            };
         }
      }
      return getFilterData;
   }, [filterRaw]);

   const setFilterQueryData = useCallback((data: FilterData, millisecond?: number) => {
      const delay = millisecond !== undefined ? millisecond : 500;
      delayExecute(() => {
         query.set(
            "filter",
            encodeURIComponent(
               JSON.stringify({
                  ...filterQueryData,
                  ...data,

                  orderData:
                     data.orderData !== undefined &&
                     Object.keys(data.orderData).length === 0
                        ? {}
                        : {
                             ...filterQueryData?.orderData,
                             ...data.orderData,
                          },
                  customerData:
                     data.customerData !== undefined &&
                     Object.keys(data.customerData).length === 0
                        ? {}
                        : {
                             ...filterQueryData?.customerData,
                             ...data.customerData,
                          },
                  reportData: {
                     ...filterQueryData?.reportData,
                     ...data.reportData,
                  },
               }),
            ),
            false,
         );
      }, delay);
   }, [query, filterQueryData]);

   return {
      filterQueryData,
      setFilterQueryData,
   };
};
