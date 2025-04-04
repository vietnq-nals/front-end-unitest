import { Order, OrderItem } from "../models/order.model";
import { PaymentService } from "./payment.service";
import { CouponService } from "./coupon.service";

export interface IOrderService {
  process(order: Partial<Order>): Promise<Order>;
}

export class OrderService implements IOrderService {
  public apiBaseUrl: string;

  constructor(
    apiBaseUrl: string = 'https://67eb7353aa794fb3222a4c0e.mockapi.io/order',
    private readonly paymentService: PaymentService,
    private readonly couponService: CouponService
  ) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async process(order: Partial<Order>): Promise<Order> {
    this.validateOrder(order);

    let totalPrice = this.calculateTotalPrice(order.items!);

    if (order.couponId) {
      totalPrice = await this.applyDiscount(totalPrice, order.couponId);
    }

    const paymentMethod = this.paymentService.buildPaymentMethod(totalPrice);

    const orderPayload = {
      ...order,
      totalPrice,
      paymentMethod,
    };

    const createdOrder = await this.createOrder(orderPayload);

    await this.paymentService.payViaLink(createdOrder);

    return createdOrder;
  }

  private validateOrder(order: Partial<Order>): void {
    if (!order.items?.length) {
      throw new Error("Order items are required");
    }

    if (order.items.some((item) => item.price <= 0 || item.quantity <= 0)) {
      throw new Error("Order items are invalid");
    }

    const totalPrice = this.calculateTotalPrice(order.items);

    if (totalPrice <= 0) {
      throw new Error("Total price must be greater than 0");
    }
  }

  private calculateTotalPrice(items: OrderItem[]): number {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

  private async applyDiscount(
    totalPrice: number,
    couponId: string
  ): Promise<number> {
    const coupon = await this.couponService.getCoupon(couponId);

    if (!coupon) {
      throw new Error("Invalid coupon");
    }

    return this.couponService.applyCoupon(totalPrice, coupon);
  }

  private async createOrder(orderPayload: any): Promise<Order> {
    const orderResponse = await fetch(
      this.apiBaseUrl,
      {
        method: "POST",
        body: JSON.stringify(orderPayload),
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!orderResponse.ok) {
      throw new Error("Failed to create order");
    }

    return await orderResponse.json();
  }
}


