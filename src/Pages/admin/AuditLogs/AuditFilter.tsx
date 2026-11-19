import { Badge, Box, IconButton, Tooltip } from "@mui/material";
import dayjs from "dayjs";
import React, { useState } from "react";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import { FilterData } from "@src/components/Table/Filter";
import AuditFilterModal, {
   AuditActorOption,
   AuditFilters,
   EMPTY_AUDIT_FILTERS,
} from "./AuditFilterModel";

// The shared table Filter (src/components/Table/Filter) renders the
// applied-filter chips and the Clear button from FilterData — for a
// non-order page the generic bucket is `customerData`, adapted the
// same way the Customers page adapts it: one display entry per
// filter group (human-readable chip text) plus the full applied
// state under `_raw`, which the shared Filter excludes from chips.
export const AUDIT_CHIP_KEYS = [
   "entity_type",
   "action",
   "actor",
   "date_range",
] as const;

type SerializedAuditFilters = {
   entityType: string;
   action: string;
   actorId: string;
   range: [string | null, string | null];
};

export const serializeAuditFilters = (
   f: AuditFilters,
): SerializedAuditFilters => ({
   entityType: f.entityType,
   action: f.action,
   actorId: f.actorId,
   range: [
      f.range[0] ? f.range[0].toISOString() : null,
      f.range[1] ? f.range[1].toISOString() : null,
   ],
});

export const reviveAuditFilters = (raw: any): AuditFilters | null => {
   if (!raw || typeof raw !== "object") return null;
   const reviveDate = (v: any): Date | null => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
   };
   return {
      entityType: typeof raw.entityType === "string" ? raw.entityType : "",
      action: typeof raw.action === "string" ? raw.action : "",
      actorId: typeof raw.actorId === "string" ? raw.actorId : "",
      range: [reviveDate(raw.range?.[0]), reviveDate(raw.range?.[1])],
   };
};

// Chip text for the date range, formatted like the shared Filter's
// own order/report chips ("YYYY-MM-DD → YYYY-MM-DD"); partial ranges
// (the API accepts a lone start or end date) get a readable label.
const formatRangeChip = (range: [Date | null, Date | null]): string => {
   const [start, end] = range;
   if (start && end)
      return `${dayjs(start).format("YYYY-MM-DD")} → ${dayjs(end).format("YYYY-MM-DD")}`;
   if (start) return `From ${dayjs(start).format("YYYY-MM-DD")}`;
   if (end) return `Until ${dayjs(end).format("YYYY-MM-DD")}`;
   return "";
};

// Build the customerData payload for an applied AuditFilters state.
// Every chip key is always written ("" when inactive) so a group
// cleared in the modal also clears its chip.
export const buildAuditCustomerData = (
   f: AuditFilters,
   actors: AuditActorOption[],
): Record<string, any> => ({
   entity_type: f.entityType || "",
   action: f.action || "",
   actor: f.actorId
      ? actors.find((a) => a.id === f.actorId)?.label || f.actorId
      : "",
   date_range: formatRangeChip(f.range),
   _raw: serializeAuditFilters(f),
});

// Same "active" test the shared Filter applies to chip values.
const isChipActive = (v: any) =>
   v !== undefined && v !== null && v !== "" && v !== "All" && v !== "Any";

export const countAuditChips = (customerData?: Record<string, any>) =>
   AUDIT_CHIP_KEYS.filter((k) => isChipActive(customerData?.[k])).length;

// Mirror chip removals back into an AuditFilters state: when the
// shared Filter blanks a display key (chip delete), the matching
// filter group is cleared. (Bucket-wide Clear is handled by the
// page: an empty bucket resets everything.)
export const syncAuditFilters = (
   current: AuditFilters,
   customerData: Record<string, any>,
): AuditFilters => {
   const next = { ...current };
   if (!isChipActive(customerData.entity_type)) next.entityType = "";
   if (!isChipActive(customerData.action)) next.action = "";
   if (!isChipActive(customerData.actor)) next.actorId = "";
   if (!isChipActive(customerData.date_range)) next.range = [null, null];
   return next;
};

export const AuditFilterComponent = ({
   data,
   onChange,
   actors,
}: {
   data: FilterData;
   onChange: Function;
   actors: AuditActorOption[];
}) => {
   const [modalOpen, setModalOpen] = useState(false);
   const applied =
      reviveAuditFilters(data.customerData?._raw) ?? EMPTY_AUDIT_FILTERS;

   return (
      <Box>
         <Tooltip title="Filter" disableInteractive>
            <Badge
               badgeContent={countAuditChips(data.customerData)}
               color="primary"
            >
               <IconButton
                  data-testid="audit-logs-filter-btn"
                  sx={{ color: "text.secondary" }}
                  onClick={() => setModalOpen(true)}
               >
                  <Icon icon="solar:filters-bold-duotone" />
               </IconButton>
            </Badge>
         </Tooltip>

         <CustomModal
            sx={{
               maxHeight: { xs: "100vh", md: "88vh" },
               display: "flex",
               flexDirection: "column",
            }}
            size="md"
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Audit Filters"
         >
            <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
               <AuditFilterModal
                  filterValue={applied}
                  actors={actors}
                  onCloseModal={() => setModalOpen(false)}
                  onChange={(f: AuditFilters) => {
                     onChange?.({
                        ...data,
                        customerData: buildAuditCustomerData(f, actors),
                     });
                  }}
               />
            </Box>
         </CustomModal>
      </Box>
   );
};

const AuditFilter = (
   data: FilterData,
   onChange: Function,
   actors: AuditActorOption[],
) => {
   return (
      <AuditFilterComponent data={data} onChange={onChange} actors={actors} />
   );
};

export default AuditFilter;
