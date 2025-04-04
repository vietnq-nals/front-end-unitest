import { describe, it, expect, vi, beforeEach } from "vitest";
import { CouponService } from "../services/coupon.service";
import { CouponItem } from "../models/coupon.model";

describe("CouponService", () => {
  let couponService: CouponService;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    couponService = new CouponService(
      "https://67eb7353aa794fb3222a4c0e.mockapi.io/coupons"
    );
    vi.clearAllMocks();
  });

  describe("getCoupon", () => {
    it("should return coupon when API call is successful", async () => {
      const mockCoupon: CouponItem = {
        id: "123",
        code: "TEST10",
        discount: 10,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCoupon,
      });

      const result = await couponService.getCoupon("123");

      expect(mockFetch).toHaveBeenCalledWith(`${couponService.apiBaseUrl}/123`);
      expect(result).toEqual(mockCoupon);
    });

    it("should throw error when coupon fetch is not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(couponService.getCoupon("abc")).rejects.toThrowError(
        "Invalid coupon"
      );
    });

    it("should handle high traffic with multiple concurrent requests", async () => {
      const mockCoupon: CouponItem = {
        id: "123",
        code: "TEST10",
        discount: 10,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCoupon,
      });

      const promises = Array(10)
        .fill(0)
        .map(() => couponService.getCoupon("123"));
      const results = await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(10);
      expect(results.every((result) => result?.id === "123")).toBe(true);
    });
  });

  describe("applyCoupon", () => {
    it("should subtract discount from price", () => {
      const price = 100;
      const coupon: CouponItem = { id: "123", code: "TEST10", discount: 10 };

      const result = couponService.applyCoupon(price, coupon);

      expect(result).toBe(90);
    });

    it("should return 0 when discount is greater than price", () => {
      const price = 10;
      const coupon: CouponItem = { id: "123", code: "TEST20", discount: 20 };

      const result = couponService.applyCoupon(price, coupon);

      expect(result).toBe(0);
    });

    it("should handle edge case with price equal to discount", () => {
      const price = 50;
      const coupon: CouponItem = { id: "123", code: "TEST50", discount: 50 };

      const result = couponService.applyCoupon(price, coupon);

      expect(result).toBe(0);
    });

    it("should handle large discount values", () => {
      const price = 1000000;
      const coupon: CouponItem = { id: "123", code: "HUGE", discount: 999999 };

      const result = couponService.applyCoupon(price, coupon);

      expect(result).toBe(1);
    });

    it("should handle negative price values", () => {
      const price = -100;
      const coupon: CouponItem = { id: "123", code: "TEST10", discount: 10 };

      const result = couponService.applyCoupon(price, coupon);

      expect(result).toBe(0);
    });

    it("should handle NaN price values", () => {
      const price = NaN;
      const coupon: CouponItem = { id: "123", code: "TEST10", discount: 10 };

      const result = couponService.applyCoupon(price, coupon);

      expect(result).toBe(NaN);
    });

    it("should handle floating point price values", () => {
      const price = 100.75;
      const coupon: CouponItem = { id: "123", code: "TEST10", discount: 10 };

      const result = couponService.applyCoupon(price, coupon);

      expect(result).toBeCloseTo(90.75, 2);
    });
  });
});
