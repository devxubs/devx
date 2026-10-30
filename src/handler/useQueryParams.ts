"use client";
import {
   ReadonlyURLSearchParams,
   usePathname,
   useSearchParams,
} from "next/navigation";
import { useRouter } from "next/navigation";

const useQueryParams = (basepath?: string) => {
   const searchParams = useSearchParams() as ReadonlyURLSearchParams;
   const router = useRouter();
   const currentPathname = usePathname();
   const pathname: string = basepath || (currentPathname as string);

   const root = {
      toString: () => searchParams?.toString(),
      getAll: () => {
         const ob: { [key: string]: string } = {};
         searchParams?.forEach((v, k) => {
            ob[k] = v;
         });
         return ob;
      },
      get: (key: string) => searchParams?.get(key),
      set: (key: string, value: string, scroll?: boolean) => {
         const params = new URLSearchParams(searchParams?.toString());
         params.set(key, value);
         router.push(pathname + "?" + params.toString(), {
            scroll: scroll ?? true,
         });
      },
      sets: (queries: { [key: string]: string }, scroll?: boolean) => {
         const params = new URLSearchParams(searchParams?.toString());
         for (let q in queries) {
            params.set(q, queries[q]);
         }
         router.push(pathname + "?" + params.toString(), {
            scroll: scroll ?? true,
         });
      },
      delete: (key: string, scroll?: boolean) => {
         const params = new URLSearchParams(searchParams?.toString());
         params.delete(key);
         if (params.size) {
            router.push(pathname + "?" + params.toString(), {
               scroll: scroll ?? true,
            });
         } else {
            router.push(pathname, { scroll: scroll ?? true });
         }
      },
      deletes: (keys: string[], scroll?: boolean) => {
         const params = new URLSearchParams(searchParams?.toString());
         keys.forEach((k) => params.delete(k));
         if (params.size) {
            router.push(pathname + "?" + params.toString(), {
               scroll: scroll ?? true,
            });
         } else {
            router.push(pathname, { scroll: scroll ?? true });
         }
      },
      clearAll: (scroll?: boolean) => {
         router.push(pathname, { scroll: scroll ?? true });
      },
      has: (key: string) => !!searchParams?.get(key),
      hasKeys: (keys: string[]) => {
         const allkeys = Array.from(searchParams?.keys());
         for (let key of keys) {
            if (!allkeys.includes(key)) {
               return false;
            }
         }
         return true;
      },
   };

   return root;
};

export default useQueryParams;
