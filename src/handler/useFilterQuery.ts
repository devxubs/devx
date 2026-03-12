import { FilterData } from "@src/components/Table/Filter";
import useQueryParams from "./useQueryParams";
import delayExecute from "./delayExecute";

export const useFilterQuery = () => {
   const query = useQueryParams();
   let getFilterData: FilterData = {
      orderData: {},
      reportData: {},
   };
   if (query.get("filter")) {
      getFilterData = JSON.parse(
         decodeURIComponent(query.get("filter") || "") || "{}",
      );
   }

   return {
      filterQueryData: getFilterData as FilterData,
      setFilterQueryData: (data: FilterData, millisecond?: number) => {
         millisecond = millisecond || 500;
         delayExecute(() => {
            query.set(
               "filter",
               encodeURIComponent(
                  JSON.stringify({
                     ...getFilterData,
                     ...data,

                     orderData: {
                        ...getFilterData?.orderData,
                        ...data.orderData,
                     },
                     reportData: {
                        ...getFilterData?.reportData,
                        ...data.reportData,
                     },
                  }),
               ),
               false,
            );
         }, millisecond);
      },
   };
};
