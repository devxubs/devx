/**
 * Cleanup Phase 3 — Notification & Toast Preferences.
 *
 * Stored business-wide in customConfig.notificationPrefs (the
 * owner configures the shop's terminals once; every role's
 * client reads the same values through the settings context —
 * the key is on the staff GET allowlist for exactly that
 * reason).
 *
 * Event rows cover the notification producers that ACTUALLY
 * exist in this codebase — nothing else is offered:
 * - "Inventory": low-stock alerts from the stock engine
 *   (generation itself is gated separately by the
 *   enableLowStockAlert setting; these prefs only govern the
 *   toast + sound presentation when one arrives).
 * - "Chat": new chat message notifications.
 * - "default": any other category (e.g. notifications created
 *   through the notifications API) — labelled "Other".
 * There are no order/payment/courier notification producers
 * today, so no rows pretend otherwise.
 *
 * Sounds are synthesized with the Web Audio API — the repo has
 * no audio assets (public/audio holds videos), and a POS must
 * work offline without new dependencies. Playback is
 * best-effort: browsers may keep the AudioContext suspended
 * until the user has interacted with the page, in which case a
 * poll-triggered sound silently does not play (the toast and
 * the drawer still deliver the notification).
 */

export const NOTIFICATION_PREFS_KEY = "notificationPrefs";

export interface NotificationEventPref {
   toast: boolean;
   sound: boolean;
   soundId: string;
}

export type ToastPosition =
   | "top-right"
   | "top-left"
   | "bottom-right"
   | "bottom-left"
   | "bottom-center"
   | "top-center";

export interface ToastConfig {
   position: ToastPosition;
   /** null = stays until dismissed. */
   durationMs: number | null;
   style: "standard" | "filled" | "outlined";
   showClose: boolean;
   clickawayDismiss: boolean;
}

export interface NotificationPrefs {
   events: Record<string, NotificationEventPref>;
   toast: ToastConfig;
}

export const NOTIFICATION_EVENT_ROWS: {
   key: string;
   label: string;
   desc: string;
}[] = [
   {
      key: "Inventory",
      label: "Low Stock Alerts",
      desc: "Stock engine alerts when a product crosses its low-stock threshold",
   },
   {
      key: "Chat",
      label: "Chat Messages",
      desc: "New message in a team chat conversation",
   },
   {
      key: "default",
      label: "Other Notifications",
      desc: "Any other notification category, including ones added later",
   },
];

export const KNOWN_EVENT_KEYS = NOTIFICATION_EVENT_ROWS.map((r) => r.key);

export const DEFAULT_EVENT_PREF: NotificationEventPref = {
   toast: true,
   sound: false,
   soundId: "chime",
};

export const DEFAULT_TOAST_CONFIG: ToastConfig = {
   position: "bottom-right",
   durationMs: 4000,
   style: "standard",
   showClose: true,
   clickawayDismiss: true,
};

export const TOAST_POSITION_OPTIONS: { key: ToastPosition; name: string }[] = [
   { key: "top-right", name: "Top Right" },
   { key: "top-left", name: "Top Left" },
   { key: "bottom-right", name: "Bottom Right" },
   { key: "bottom-left", name: "Bottom Left" },
   { key: "bottom-center", name: "Bottom Center" },
   { key: "top-center", name: "Top Center" },
];

export const TOAST_DURATION_OPTIONS: { value: number | null; name: string }[] = [
   { value: 2000, name: "2 seconds" },
   { value: 3000, name: "3 seconds" },
   { value: 4000, name: "4 seconds" },
   { value: 6000, name: "6 seconds" },
   { value: 8000, name: "8 seconds" },
   { value: null, name: "Until dismissed" },
];

// ── Sounds (Web Audio synthesis) ────────────────────────────

export const NOTIFICATION_SOUNDS: { id: string; name: string }[] = [
   { id: "none", name: "No Sound" },
   { id: "chime", name: "Chime" },
   { id: "ding", name: "Ding" },
   { id: "beep", name: "Beep" },
   { id: "pop", name: "Pop" },
];

const SOUND_IDS = new Set(NOTIFICATION_SOUNDS.map((s) => s.id));

export function isKnownSoundId(id: unknown): boolean {
   return typeof id === "string" && SOUND_IDS.has(id);
}

let sharedContext: AudioContext | null = null;

function tone(
   ctx: AudioContext,
   freq: number,
   startAt: number,
   duration: number,
   type: OscillatorType,
   peak = 0.15,
   sweepTo?: number,
) {
   const osc = ctx.createOscillator();
   const gain = ctx.createGain();
   osc.type = type;
   osc.frequency.setValueAtTime(freq, startAt);
   if (sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(sweepTo, startAt + duration);
   }
   gain.gain.setValueAtTime(0.0001, startAt);
   gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.015);
   gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
   osc.connect(gain).connect(ctx.destination);
   osc.start(startAt);
   osc.stop(startAt + duration + 0.05);
}

/**
 * Play one of the curated sounds. Never throws; a suspended
 * context (autoplay policy) simply results in silence.
 */
export function playNotificationSound(soundId: string): void {
   if (typeof window === "undefined") return;
   if (!isKnownSoundId(soundId) || soundId === "none") return;
   try {
      const Ctor =
         window.AudioContext ||
         (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
      if (!Ctor) return;
      sharedContext = sharedContext ?? new Ctor();
      const ctx = sharedContext;
      if (ctx.state === "suspended") {
         void ctx.resume().catch(() => {});
         if (ctx.state === "suspended") return;
      }
      const t = ctx.currentTime + 0.02;
      switch (soundId) {
         case "chime":
            tone(ctx, 1318.5, t, 0.18, "sine");
            tone(ctx, 1760, t + 0.12, 0.3, "sine");
            break;
         case "ding":
            tone(ctx, 1567.98, t, 0.5, "sine", 0.15);
            tone(ctx, 3135.96, t, 0.25, "sine", 0.05);
            break;
         case "beep":
            tone(ctx, 880, t, 0.13, "square", 0.08);
            break;
         case "pop":
            tone(ctx, 420, t, 0.1, "sine", 0.18, 940);
            break;
      }
   } catch {
      // Audio is decorative — never break notification delivery.
   }
}

// ── Resolution ──────────────────────────────────────────────

function asConfigObject(customConfig: unknown): Record<string, unknown> {
   return customConfig &&
      typeof customConfig === "object" &&
      !Array.isArray(customConfig)
      ? (customConfig as Record<string, unknown>)
      : {};
}

function resolveEventPref(raw: unknown): NotificationEventPref {
   const e =
      raw && typeof raw === "object" && !Array.isArray(raw)
         ? (raw as Record<string, unknown>)
         : {};
   return {
      toast: typeof e.toast === "boolean" ? e.toast : DEFAULT_EVENT_PREF.toast,
      sound: typeof e.sound === "boolean" ? e.sound : DEFAULT_EVENT_PREF.sound,
      soundId: isKnownSoundId(e.soundId)
         ? (e.soundId as string)
         : DEFAULT_EVENT_PREF.soundId,
   };
}

function resolveToastConfig(raw: unknown): ToastConfig {
   const t =
      raw && typeof raw === "object" && !Array.isArray(raw)
         ? (raw as Record<string, unknown>)
         : {};
   const position = TOAST_POSITION_OPTIONS.some((o) => o.key === t.position)
      ? (t.position as ToastPosition)
      : DEFAULT_TOAST_CONFIG.position;
   const durationMs =
      t.durationMs === null
         ? null
         : typeof t.durationMs === "number" &&
             t.durationMs >= 1000 &&
             t.durationMs <= 30000
           ? t.durationMs
           : DEFAULT_TOAST_CONFIG.durationMs;
   const style =
      t.style === "filled" || t.style === "outlined" || t.style === "standard"
         ? t.style
         : DEFAULT_TOAST_CONFIG.style;
   return {
      position,
      durationMs,
      style,
      showClose:
         typeof t.showClose === "boolean"
            ? t.showClose
            : DEFAULT_TOAST_CONFIG.showClose,
      clickawayDismiss:
         typeof t.clickawayDismiss === "boolean"
            ? t.clickawayDismiss
            : DEFAULT_TOAST_CONFIG.clickawayDismiss,
   };
}

/** Complete preferences with defaults filled in. */
export function resolveNotificationPrefs(
   customConfig: unknown,
): NotificationPrefs {
   const raw = asConfigObject(customConfig)[NOTIFICATION_PREFS_KEY];
   const root =
      raw && typeof raw === "object" && !Array.isArray(raw)
         ? (raw as Record<string, unknown>)
         : {};
   const rawEvents =
      root.events &&
      typeof root.events === "object" &&
      !Array.isArray(root.events)
         ? (root.events as Record<string, unknown>)
         : {};
   const events: Record<string, NotificationEventPref> = {};
   for (const key of KNOWN_EVENT_KEYS) {
      events[key] = resolveEventPref(rawEvents[key]);
   }
   // Preserve any additional stored categories (forward-compat).
   for (const [key, value] of Object.entries(rawEvents)) {
      if (!(key in events)) events[key] = resolveEventPref(value);
   }
   return { events, toast: resolveToastConfig(root.toast) };
}

/** The effective preference for one notification category. */
export function eventPrefForCategory(
   prefs: NotificationPrefs,
   category: unknown,
): NotificationEventPref {
   if (typeof category === "string" && prefs.events[category]) {
      return prefs.events[category];
   }
   return prefs.events.default ?? DEFAULT_EVENT_PREF;
}

/** MUI anchorOrigin for a toast position key. */
export function toastAnchorOrigin(position: ToastPosition): {
   vertical: "top" | "bottom";
   horizontal: "left" | "center" | "right";
} {
   const [vertical, horizontal] = position.split("-") as [
      "top" | "bottom",
      "left" | "center" | "right",
   ];
   return { vertical, horizontal };
}

// ── Server-side validation (settings PUT) ───────────────────

export function validateNotificationPrefsInConfig(
   customConfig: unknown,
): { ok: true } | { ok: false; message: string } {
   const raw = asConfigObject(customConfig)[NOTIFICATION_PREFS_KEY];
   if (raw === undefined || raw === null) return { ok: true };
   if (typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, message: `${NOTIFICATION_PREFS_KEY} must be an object.` };
   }
   const root = raw as Record<string, unknown>;
   if (root.events !== undefined && root.events !== null) {
      if (typeof root.events !== "object" || Array.isArray(root.events)) {
         return { ok: false, message: "notificationPrefs.events must be an object." };
      }
      for (const [key, value] of Object.entries(
         root.events as Record<string, unknown>,
      )) {
         if (!value || typeof value !== "object" || Array.isArray(value)) {
            return {
               ok: false,
               message: `Notification preference for "${key}" must be an object.`,
            };
         }
         const e = value as Record<string, unknown>;
         if (e.toast !== undefined && typeof e.toast !== "boolean") {
            return { ok: false, message: `Notification preference for "${key}": toast must be true or false.` };
         }
         if (e.sound !== undefined && typeof e.sound !== "boolean") {
            return { ok: false, message: `Notification preference for "${key}": sound must be true or false.` };
         }
         if (e.soundId !== undefined && !isKnownSoundId(e.soundId)) {
            return { ok: false, message: `Notification preference for "${key}": unknown sound.` };
         }
      }
   }
   if (root.toast !== undefined && root.toast !== null) {
      if (typeof root.toast !== "object" || Array.isArray(root.toast)) {
         return { ok: false, message: "notificationPrefs.toast must be an object." };
      }
      const t = root.toast as Record<string, unknown>;
      if (
         t.position !== undefined &&
         !TOAST_POSITION_OPTIONS.some((o) => o.key === t.position)
      ) {
         return { ok: false, message: "notificationPrefs.toast.position is not a supported position." };
      }
      if (
         t.durationMs !== undefined &&
         t.durationMs !== null &&
         (typeof t.durationMs !== "number" || t.durationMs < 1000 || t.durationMs > 30000)
      ) {
         return { ok: false, message: "notificationPrefs.toast.durationMs must be between 1000 and 30000, or null." };
      }
      if (
         t.style !== undefined &&
         !["standard", "filled", "outlined"].includes(t.style as string)
      ) {
         return { ok: false, message: "notificationPrefs.toast.style is not a supported style." };
      }
      if (t.showClose !== undefined && typeof t.showClose !== "boolean") {
         return { ok: false, message: "notificationPrefs.toast.showClose must be true or false." };
      }
      if (t.clickawayDismiss !== undefined && typeof t.clickawayDismiss !== "boolean") {
         return { ok: false, message: "notificationPrefs.toast.clickawayDismiss must be true or false." };
      }
   }
   return { ok: true };
}
