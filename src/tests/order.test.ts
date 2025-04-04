import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "../services/order.service";
import { PaymentService } from "../services/payment.service";
import { ICouponService } from "../services/coupon.service";
import { Order, OrderItem } from "../models/order.model";
import { PaymentMethod } from "../models/payment.model";
import { CouponItem } from "../models/coupon.model";

describe("OrderService", () => {
  let orderService: OrderService;
  let mockPaymentService: PaymentService;
  let mockCouponService: ICouponService;
  let mockFetch: any;

  beforeEach(() => {
    mockPaymentService = {
      buildPaymentMethod: vi.fn().mockReturnValue(PaymentMethod.CREDIT),
      payViaLink: vi.fn().mockResolvedValue(undefined),
    } as unknown as PaymentService;

    mockCouponService = {
      apiBaseUrl: "https://67eb7353aa794fb3222a4c0e.mockapi.io/coupons",
      getCoupon: vi.fn(),
      applyCoupon: vi.fn(),
    };

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "order-123" }),
    });

    vi.stubGlobal("fetch", mockFetch);

    orderService = new OrderService(
      'https://67eb7353aa794fb3222a4c0e.mockapi.io/order',
      mockPaymentService,
      mockCouponService,
    );
  });

  const createValidOrderItems = (): OrderItem[] => [
    { id: "item1", productId: "prod1", price: 100, quantity: 2 },
    { id: "item2", productId: "prod2", price: 50, quantity: 1 },
  ];

  describe("process", () => {
    it("should process a valid order without coupon", async () => {
      const orderItems = createValidOrderItems();
      const order: Partial<Order> = {
        items: orderItems,
      };

      const result = await orderService.process(order);

      expect(mockPaymentService.buildPaymentMethod).toHaveBeenCalledWith(250);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://67eb7353aa794fb3222a4c0e.mockapi.io/order",
        expect.any(Object)
      );
      expect(mockPaymentService.payViaLink).toHaveBeenCalled();
      expect(result).toEqual({ id: "order-123" });
    });

    it("should apply coupon discount to order total price", async () => {
      const orderItems = createValidOrderItems();
      const order: Partial<Order> = {
        items: orderItems,
        couponId: "coupon-123",
      };

      const mockCoupon: CouponItem = {
        id: "coupon-123",
        code: "TEST50",
        discount: 50,
      };
      mockCouponService.getCoupon = vi.fn().mockResolvedValue(mockCoupon);
      mockCouponService.applyCoupon = vi.fn().mockReturnValue(200);

      await orderService.process(order);

      expect(mockCouponService.getCoupon).toHaveBeenCalledWith("coupon-123");
      expect(mockCouponService.applyCoupon).toHaveBeenCalledWith(
        250,
        mockCoupon
      );
      expect(mockPaymentService.buildPaymentMethod).toHaveBeenCalledWith(200);
    });

    it("should throw error when order items are empty", async () => {
      const order: Partial<Order> = {
        items: [],
      };

      await expect(orderService.process(order)).rejects.toThrow(
        "Order items are required"
      );
    });

    it("should throw error when order items contain invalid price", async () => {
      const order: Partial<Order> = {
        items: [{ id: "item1", productId: "prod1", price: 0, quantity: 2 }],
      };

      await expect(orderService.process(order)).rejects.toThrow(
        "Order items are invalid"
      );
    });

    it("should throw error when order items contain invalid quantity", async () => {
      const order: Partial<Order> = {
        items: [{ id: "item1", productId: "prod1", price: 100, quantity: 0 }],
      };

      await expect(orderService.process(order)).rejects.toThrow(
        "Order items are invalid"
      );
    });

    it("should throw error when coupon is invalid", async () => {
      const orderItems = createValidOrderItems();
      const order: Partial<Order> = {
        items: orderItems,
        couponId: "invalid-coupon",
      };

      mockCouponService.getCoupon = vi.fn().mockResolvedValue(null);

      await expect(orderService.process(order)).rejects.toThrow(
        "Invalid coupon"
      );
    });

    it("should throw error when order creation fails", async () => {
      const orderItems = createValidOrderItems();
      const order: Partial<Order> = {
        items: orderItems,
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(orderService.process(order)).rejects.toThrow(
        "Failed to create order"
      );
    });

    it("should handle concurrent order processing", async () => {
      const orderItems = createValidOrderItems();
      const orders = Array(5)
        .fill(0)
        .map(() => ({ items: orderItems }));

      const promises = orders.map((order) => orderService.process(order));
      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      expect(mockPaymentService.buildPaymentMethod).toHaveBeenCalledTimes(5);
      expect(mockFetch).toHaveBeenCalledTimes(5);
      expect(mockPaymentService.payViaLink).toHaveBeenCalledTimes(5);
    });

    it("should validate input and throw errors for potentially malicious input", async () => {
      const maliciousOrder: Partial<Order> = {
        items: [{ id: "item1", productId: "prod1", price: -100, quantity: 1 }],
      };

      await expect(orderService.process(maliciousOrder)).rejects.toThrow(
        "Order items are invalid"
      );

      const sqlInjectionOrder: Partial<Order> = {
        items: [
          {
            id: "1; DROP TABLE users;",
            productId: "prod1",
            price: 100,
            quantity: 1,
          },
        ],
      };

      const result = await orderService.process(sqlInjectionOrder);
      expect(result).toEqual({ id: "order-123" });
    });
  });
});
