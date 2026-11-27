import { describe, expect, it } from "vitest";
import { getContrastRatio } from "@mui/material/styles";
import {
   buildCustomPrimary,
   customColorTextWarning,
   isHexColor,
   resolveFontStack,
} from "../src/lib/appearance";

describe("isHexColor", () => {
   it("accepts #RRGGBB only", () => {
      expect(isHexColor("#00A76F")).toBe(true);
      expect(isHexColor("#be123c")).toBe(true);
      expect(isHexColor("00A76F")).toBe(false);
      expect(isHexColor("#FFF")).toBe(false);
      expect(isHexColor("primary")).toBe(false);
      expect(isHexColor(undefined)).toBe(false);
   });
});

describe("buildCustomPrimary", () => {
   it("builds a ramp around the chosen colour", () => {
      const ramp = buildCustomPrimary("#BE123C");
      expect(ramp.main).toBe("#BE123C");
      expect(ramp.light).not.toBe(ramp.main);
      expect(ramp.dark).not.toBe(ramp.main);
   });

   it("always picks a contrastText that reads on the colour (>= 4.5)", () => {
      for (const hex of ["#FFA800", "#00A76F", "#F5F5F5", "#111827", "#FFD666"]) {
         const ramp = buildCustomPrimary(hex);
         expect(getContrastRatio(hex, ramp.contrastText)).toBeGreaterThanOrEqual(4.5);
      }
   });
});

describe("customColorTextWarning", () => {
   it("warns for very light colours and stays silent for readable ones", () => {
      expect(customColorTextWarning("#FFE9A8")).not.toBeNull();
      expect(customColorTextWarning("#1E3A8A")).toBeNull();
      expect(customColorTextWarning("not-a-color")).toBeNull();
   });
});

describe("resolveFontStack", () => {
   it("resolves known keys and falls back to Inter", () => {
      expect(resolveFontStack("inter")).toContain("--font-inter");
      expect(resolveFontStack("system")).toContain("-apple-system");
      expect(resolveFontStack("bengali")).toContain("Noto Sans Bengali");
      expect(resolveFontStack("unknown")).toContain("--font-inter");
      expect(resolveFontStack(undefined)).toContain("--font-inter");
   });
});
