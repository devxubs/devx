import { describe, it, expect, vi, beforeEach } from "vitest";
import {
   missingEnvKeys,
   isProviderConfigured,
   getProviderStatus,
   getAllProviderStatuses,
   getSteadfastConfig,
   getPathaoConfig,
   getCourierBaseUrl,
} from "@src/lib/courier/config";
import {
   CourierAlreadyBookedError,
   CourierApiError,
   CourierNotConfiguredError,
   CourierNotImplementedError,
} from "@src/lib/courier/errors";
import {
   mapSteadfastStatus,
   mapPathaoStatus,
} from "@src/lib/courier/statusMap";
import { createSteadfastProvider } from "@src/lib/courier/steadfast";
import {
   createPathaoProvider,
   getPathaoAccessToken,
   resetPathaoTokenCache,
} from "@src/lib/courier/pathao";
import {
   assertOrderNotBooked,
   buildConsignmentInput,
} from "@src/lib/courier/index";

// Phase 4 (D4/D5): courier foundation. No test here may touch the
// network — every fetch is a stub, and the unconfigured providers
// must refuse BEFORE any fetch happens.

const STEADFAST_ENV = {
   STEADFAST_API_KEY: "key-123",
   STEADFAST_SECRET_KEY: "secret-456",
};
const PATHAO_ENV = {
   PATHAO_CLIENT_ID: "cid",
   PATHAO_CLIENT_SECRET: "csecret",
   PATHAO_USERNAME: "merchant@example.com",
   PATHAO_PASSWORD: "pw",
   PATHAO_STORE_ID: "42",
};

describe("courier config (D4)", () => {
   it("reports missing env key NAMES only", () => {
      expect(missingEnvKeys("steadfast", {})).toEqual([
         "STEADFAST_API_KEY",
         "STEADFAST_SECRET_KEY",
      ]);
      expect(missingEnvKeys("steadfast", STEADFAST_ENV)).toEqual([]);
      expect(isProviderConfigured("pathao", PATHAO_ENV)).toBe(true);
      expect(isProviderConfigured("pathao", { PATHAO_CLIENT_ID: "x" })).toBe(
         false,
      );
   });

   it("blank values count as missing", () => {
      expect(
         missingEnvKeys("steadfast", {
            STEADFAST_API_KEY: "  ",
            STEADFAST_SECRET_KEY: "s",
         }),
      ).toEqual(["STEADFAST_API_KEY"]);
   });

   it("status objects never contain secret values", () => {
      const status = getProviderStatus("steadfast", STEADFAST_ENV);
      expect(status.configured).toBe(true);
      expect(JSON.stringify(status)).not.toContain("key-123");
      expect(JSON.stringify(getAllProviderStatuses({}))).not.toContain(
         "secret",
      );
   });

   it("secret configs are null until fully configured", () => {
      expect(getSteadfastConfig({})).toBeNull();
      expect(getSteadfastConfig(STEADFAST_ENV)?.apiKey).toBe("key-123");
      expect(getPathaoConfig({ PATHAO_CLIENT_ID: "x" })).toBeNull();
      expect(getPathaoConfig(PATHAO_ENV)?.storeId).toBe("42");
   });

   it("base URL: researched default, env override, trailing slash trimmed", () => {
      expect(getCourierBaseUrl("steadfast", {})).toBe(
         "https://portal.packzy.com/api/v1",
      );
      expect(
         getCourierBaseUrl("steadfast", {
            STEADFAST_BASE_URL: "https://example.test/api/",
         }),
      ).toBe("https://example.test/api");
      expect(getCourierBaseUrl("pathao", {})).toBe(
         "https://api-hermes.pathao.com",
      );
   });
});

describe("duplicate-booking guard + input builder (D5)", () => {
   it("allows unbooked orders, refuses booked ones", () => {
      expect(() =>
         assertOrderNotBooked({ courierConsignmentId: null }),
      ).not.toThrow();
      expect(() => assertOrderNotBooked({})).not.toThrow();
      expect(() =>
         assertOrderNotBooked({ courierConsignmentId: "SF-123" }),
      ).toThrow(CourierAlreadyBookedError);
   });

   it("builds a consignment input with COD = outstanding due", () => {
      const input = buildConsignmentInput({
         orderId: "ORD_12",
         dueAmount: 450.4,
         customer: { name: "Rahim", phone: "01700000000", address: "Dhaka" },
      });
      expect(input.invoice).toBe("ORD_12");
      expect(input.codAmount).toBe(450);
      expect(input.recipientName).toBe("Rahim");
   });

   it("refuses orders missing recipient data, naming what is missing", () => {
      expect(() =>
         buildConsignmentInput({ orderId: "ORD_1", customer: { name: "X" } }),
      ).toThrow(/recipient phone, recipient address/);
   });
});

describe("status mapping (D5)", () => {
   it("maps the documented Steadfast vocabulary", () => {
      expect(mapSteadfastStatus("pending")).toBe("Pending");
      expect(mapSteadfastStatus("in_review")).toBe("In Courier");
      expect(mapSteadfastStatus("delivered")).toBe("Delivered");
      expect(mapSteadfastStatus("partial_delivered")).toBe("Delivered");
      expect(mapSteadfastStatus("cancelled")).toBe("Cancelled");
      expect(mapSteadfastStatus("delivered_approval_pending")).toBe("Pending");
   });

   it("passes undocumented Steadfast statuses through unguessed", () => {
      expect(mapSteadfastStatus("some_future_status")).toBe(
         "some_future_status",
      );
   });

   it("Pathao mapping is an explicit TODO, not a guess", () => {
      expect(() => mapPathaoStatus("Pending")).toThrow(
         CourierNotImplementedError,
      );
   });
});

function jsonResponse(body: any, status = 200) {
   return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body,
   } as Response;
}

describe("Steadfast provider (UNVERIFIED contract)", () => {
   it("refuses BEFORE any network call when unconfigured", async () => {
      const fetchImpl = vi.fn(async () => {
         throw new Error("network must not be touched");
      });
      const provider = createSteadfastProvider(null, fetchImpl as any);
      await expect(
         provider.createConsignment({
            invoice: "ORD_1",
            recipientName: "A",
            recipientPhone: "01",
            recipientAddress: "Dhaka",
            codAmount: 0,
         }),
      ).rejects.toBeInstanceOf(CourierNotConfiguredError);
      await expect(provider.getStatus("123")).rejects.toBeInstanceOf(
         CourierNotConfiguredError,
      );
      expect(fetchImpl).not.toHaveBeenCalled();
   });

   it("parses the documented create_order + status shapes", async () => {
      const fetchImpl = vi.fn(async (url: string) => {
         if (url.endsWith("/create_order")) {
            return jsonResponse({
               status: 200,
               consignment: { consignment_id: 12345, tracking_code: "SF9X" },
            });
         }
         return jsonResponse({ delivery_status: "in_review" });
      });
      const provider = createSteadfastProvider(
         getSteadfastConfig(STEADFAST_ENV),
         fetchImpl as any,
      );
      const created = await provider.createConsignment({
         invoice: "ORD_9",
         recipientName: "Karim",
         recipientPhone: "01700000000",
         recipientAddress: "Chattogram",
         codAmount: 300,
      });
      expect(created.consignmentId).toBe("12345");
      expect(created.trackingCode).toBe("SF9X");
      const status = await provider.getStatus("12345");
      expect(status.providerStatus).toBe("in_review");
      // Auth headers come from config, URL from the researched base.
      const [, init] = (fetchImpl.mock.calls[0] || []) as any[];
      expect((init.headers as any)["Api-Key"]).toBe("key-123");
   });

   it("maps provider HTTP errors to CourierApiError", async () => {
      const fetchImpl = vi.fn(async () =>
         jsonResponse({ message: "Invalid invoice" }, 422),
      );
      const provider = createSteadfastProvider(
         getSteadfastConfig(STEADFAST_ENV),
         fetchImpl as any,
      );
      await expect(provider.getStatus("1")).rejects.toBeInstanceOf(
         CourierApiError,
      );
   });
});

describe("Pathao scaffolding (D5)", () => {
   beforeEach(() => resetPathaoTokenCache());

   it("provider refuses when unconfigured, TODOs when configured", async () => {
      const unconfigured = createPathaoProvider(null);
      await expect(unconfigured.getStatus("1")).rejects.toBeInstanceOf(
         CourierNotConfiguredError,
      );
      const configured = createPathaoProvider(getPathaoConfig(PATHAO_ENV));
      await expect(configured.getStatus("1")).rejects.toBeInstanceOf(
         CourierNotImplementedError,
      );
      await expect(
         configured.createConsignment({
            invoice: "ORD_1",
            recipientName: "A",
            recipientPhone: "01",
            recipientAddress: "Dhaka",
            codAmount: 0,
         }),
      ).rejects.toBeInstanceOf(CourierNotImplementedError);
   });

   it("issue-token: password-grant shape, cached across calls", async () => {
      const fetchImpl = vi.fn(async () =>
         jsonResponse({ access_token: "tok-abc", expires_in: 432000 }),
      );
      const cfg = getPathaoConfig(PATHAO_ENV);
      const first = await getPathaoAccessToken(cfg, fetchImpl as any);
      const second = await getPathaoAccessToken(cfg, fetchImpl as any);
      expect(first).toBe("tok-abc");
      expect(second).toBe("tok-abc");
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = (fetchImpl.mock.calls[0] || []) as any[];
      expect(String(url)).toContain("/aladdin/api/v1/issue-token");
      const body = JSON.parse((init as any).body);
      expect(body.grant_type).toBe("password");
      expect(body.client_id).toBe("cid");
      expect(body.store_id).toBeUndefined();
   });

   it("token request refuses when unconfigured, before any fetch", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({}));
      await expect(
         getPathaoAccessToken(null, fetchImpl as any),
      ).rejects.toBeInstanceOf(CourierNotConfiguredError);
      expect(fetchImpl).not.toHaveBeenCalled();
   });
});
