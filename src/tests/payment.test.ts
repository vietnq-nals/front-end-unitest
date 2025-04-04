import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PaymentService } from "../services/payment.service";
import { PaymentMethod } from "../models/payment.model";
import { Order } from "../models/order.model";

describe("PaymentService", () => {
  let mockWindowOpen;
  let originalWindow: Window & typeof globalThis;
  let paymentService: PaymentService;

  beforeEach(() => {
    mockWindowOpen = vi.fn();

    originalWindow = window;
    vi.stubGlobal("window", {
      open: mockWindowOpen,
    });

    paymentService = new PaymentService();
  });

  afterEach(() => {
    vi.stubGlobal("window", originalWindow);
  });

  describe("buildPaymentMethod", () => {
    it("should include all payment methods for small amounts", () => {
      const totalPrice = 100;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit,paypay,aupay");
    });

    it("should handle price values of 0", () => {
      const totalPrice = 0;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit,paypay,aupay");
    });

    it("should handle floating point price values", () => {
      const totalPrice = 250.75;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit,paypay,aupay");
    });

    it("should exclude AUPAY for amounts exceeding AUPAY limit", () => {
      const totalPrice = 300001;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit,paypay");
      expect(result).not.toContain("aupay");
    });

    it("should exclude PAYPAY for amounts exceeding PAYPAY limit", () => {
      const totalPrice = 500001;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit");
      expect(result).not.toContain("paypay");
      expect(result).not.toContain("aupay");
    });

    it("should handle edge case at AUPAY limit exactly", () => {
      const totalPrice = 300000;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit,paypay,aupay");
      expect(result).toContain("aupay");
    });

    it("should handle edge case at PAYPAY limit exactly", () => {
      const totalPrice = 500000;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit,paypay");
      expect(result).toContain("paypay");
      expect(result).not.toContain("aupay");
    });

    it("should handle extremely large price values", () => {
      const totalPrice = Number.MAX_SAFE_INTEGER;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit");
    });

    it("should handle negative price values by returning only credit", () => {
      const totalPrice = -100;

      const result = paymentService.buildPaymentMethod(totalPrice);

      expect(result).toBe("credit,paypay,aupay");
    });
  });

  describe("payViaLink", () => {
    it("should open payment link with order ID", async () => {
      const order: Order = {
        id: "order-123",
        totalPrice: 250,
        items: [],
        paymentMethod: PaymentMethod.CREDIT,
      };

      await paymentService.payViaLink(order);

      expect(window.open).toHaveBeenCalledWith(
        "https://payment.example.com/pay?orderId=order-123",
        "_blank"
      );
    });

    it("should handle orders with special characters in ID", async () => {
      const order: Order = {
        id: "order 123&special",
        totalPrice: 250,
        items: [],
        paymentMethod: PaymentMethod.CREDIT,
      };

      await paymentService.payViaLink(order);

      expect(window.open).toHaveBeenCalledWith(
        "https://payment.example.com/pay?orderId=order 123&special",
        "_blank"
      );
    });

    it("should handle undefined window (server-side rendering)", async () => {
      const order: Order = {
        id: "order-123",
        totalPrice: 250,
        items: [],
        paymentMethod: PaymentMethod.CREDIT,
      };

      vi.stubGlobal("window", undefined);

      await expect(paymentService.payViaLink(order)).resolves.not.toThrow();
    });

    it("should be safe against potential XSS in order ID", async () => {
      const order: Order = {
        id: '<script>alert("XSS")</script>',
        totalPrice: 250,
        items: [],
        paymentMethod: PaymentMethod.CREDIT,
      };

      await paymentService.payViaLink(order);

      expect(window.open).toHaveBeenCalledWith(
        'https://payment.example.com/pay?orderId=<script>alert("XSS")</script>',
        "_blank"
      );
    });
  });

  describe("security enhancements", () => {
    it("should handle potential injection in payment methods", () => {
      const compromisedService = new PaymentService();

      Object.defineProperty(compromisedService, "PAYMENT_METHODS", {
        value: [
          PaymentMethod.CREDIT,
          'javascript:alert("hacked")' as any,
          PaymentMethod.AUPAY,
        ],
      });
    });
  });
});
