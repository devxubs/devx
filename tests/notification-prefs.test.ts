import { describe, expect, it } from "vitest";
import {
   DEFAULT_TOAST_CONFIG,
   eventPrefForCategory,
   resolveNotificationPrefs,
   toastAnchorOrigin,
   validateNotificationPrefsInConfig,
} from "../src/lib/notificationPrefs";

describe("resolveNotificationPrefs", () => {
   it("returns the defaults for absent or malformed config", () => {
      const prefs = resolveNotificationPrefs(undefined);
      expect(prefs.toast).toEqual(DEFAULT_TOAST_CONFIG);
      expect(prefs.events.Inventory).toEqual({ toast: true, sound: false, soundId: "chime" });
      expect(prefs.events.Chat).toBeDefined();
      expect(prefs.events.default).toBeDefined();
      expect(resolveNotificationPrefs({ notificationPrefs: "x" }).toast).toEqual(DEFAULT_TOAST_CONFIG);
   });

   it("merges stored values over the defaults and sanitizes bad ones", () => {
      const prefs = resolveNotificationPrefs({
         notificationPrefs: {
            events: {
               Inventory: { toast: false, sound: true, soundId: "ding" },
               Chat: { soundId: "not-a-sound" },
            },
            toast: { position: "top-left", durationMs: null, style: "filled", showClose: false },
         },
      });
      expect(prefs.events.Inventory).toEqual({ toast: false, sound: true, soundId: "ding" });
      // Unknown sound falls back; untouched fields keep defaults.
      expect(prefs.events.Chat.soundId).toBe("chime");
      expect(prefs.events.Chat.toast).toBe(true);
      expect(prefs.toast.position).toBe("top-left");
      expect(prefs.toast.durationMs).toBeNull();
      expect(prefs.toast.style).toBe("filled");
      expect(prefs.toast.showClose).toBe(false);
      expect(prefs.toast.clickawayDismiss).toBe(true);
   });

   it("rejects an out-of-range duration back to the default", () => {
      const prefs = resolveNotificationPrefs({
         notificationPrefs: { toast: { durationMs: 50 } },
      });
      expect(prefs.toast.durationMs).toBe(4000);
   });
});

describe("eventPrefForCategory", () => {
   it("uses the category row and falls back to the default row", () => {
      const prefs = resolveNotificationPrefs({
         notificationPrefs: {
            events: {
               Inventory: { toast: false },
               default: { sound: true, soundId: "pop" },
            },
         },
      });
      expect(eventPrefForCategory(prefs, "Inventory").toast).toBe(false);
      const other = eventPrefForCategory(prefs, "SomethingElse");
      expect(other.sound).toBe(true);
      expect(other.soundId).toBe("pop");
      expect(eventPrefForCategory(prefs, undefined).sound).toBe(true);
   });
});

describe("toastAnchorOrigin", () => {
   it("maps position keys to MUI anchors", () => {
      expect(toastAnchorOrigin("bottom-right")).toEqual({ vertical: "bottom", horizontal: "right" });
      expect(toastAnchorOrigin("top-left")).toEqual({ vertical: "top", horizontal: "left" });
      expect(toastAnchorOrigin("bottom-center")).toEqual({ vertical: "bottom", horizontal: "center" });
   });
});

describe("validateNotificationPrefsInConfig", () => {
   it("accepts absent values and a well-formed object", () => {
      expect(validateNotificationPrefsInConfig({})).toEqual({ ok: true });
      expect(
         validateNotificationPrefsInConfig({
            notificationPrefs: {
               events: { Inventory: { toast: false, sound: true, soundId: "ding" } },
               toast: { position: "top-right", durationMs: 6000, style: "outlined", showClose: true, clickawayDismiss: false },
            },
         }),
      ).toEqual({ ok: true });
   });

   it("rejects unknown sounds, positions, styles and bad durations", () => {
      expect(validateNotificationPrefsInConfig({ notificationPrefs: { events: { Chat: { soundId: "siren" } } } }).ok).toBe(false);
      expect(validateNotificationPrefsInConfig({ notificationPrefs: { toast: { position: "middle" } } }).ok).toBe(false);
      expect(validateNotificationPrefsInConfig({ notificationPrefs: { toast: { style: "neon" } } }).ok).toBe(false);
      expect(validateNotificationPrefsInConfig({ notificationPrefs: { toast: { durationMs: 10 } } }).ok).toBe(false);
      expect(validateNotificationPrefsInConfig({ notificationPrefs: { events: { Chat: { toast: "yes" } } } }).ok).toBe(false);
   });
});
