export type TrackingStepState = "completed" | "current" | "pending" | "cancelled" | "skipped";

export interface TrackingStep {
   id: string;
   title: string;
   description?: string;
   date?: string;
   time?: string;
   timestamp?: string;
   state: TrackingStepState;
   icon: string;
   note?: string;
   stageNumber?: number;
   totalStages?: number;
   nextStagePreview?: string;
   metadata?: {
      label: string;
      value: string;
      highlight?: boolean;
      copyable?: boolean;
   }[];
}

export type ActivityCategory =
   | "order"
   | "invoice"
   | "workflow"
   | "note"
   | "courier"
   | "payment";

export type ActivityFilter = "all" | "order" | "note" | "payment" | "courier";

export interface ActivityDiff {
   field?: string;
   previous?: string | number | null;
   new?: string | number | null;
   itemsSummary?: string;
}

export interface ActivityActor {
   name: string;
   role?: string;
   id?: string;
   employeeCode?: string;
   email?: string;
   phone?: string;
   avatar?: string;
}

export interface EmployeeActivity {
   id: string;
   action: string;
   category: ActivityCategory;
   actor: ActivityActor;
   details: string;
   diff?: ActivityDiff;
   date: string;
   time: string;
   timestamp: string;
   rawDate?: Date;
   icon: string;
   isImportant?: boolean;
   badgeLabel?: string;
}

export interface GroupedActivities {
   dateLabel: string;
   activities: EmployeeActivity[];
}
