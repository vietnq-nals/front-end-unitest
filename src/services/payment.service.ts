import { PaymentMethod } from "../models/payment.model";
import { Order } from "../models/order.model";

export interface IPaymentService {
  buildPaymentMethod(totalPrice: number): string;
  payViaLink(order: Order): Promise<void>;
}

export class PaymentService implements IPaymentService {
  private readonly PAYMENT_METHODS = [
    PaymentMethod.CREDIT,
    PaymentMethod.PAYPAY,
    PaymentMethod.AUPAY,
  ];

  private readonly PAYPAY_MAX_AMOUNT = 500000;
  private readonly AUPAY_MAX_AMOUNT = 300000;

  constructor(
    private readonly paymentUrl: string = "https://payment.example.com/pay"
  ) {}

  buildPaymentMethod(totalPrice: number): string {
    const filteredMethods = this.PAYMENT_METHODS.filter((method) => {
      switch (method) {
        case PaymentMethod.PAYPAY:
          return totalPrice <= this.PAYPAY_MAX_AMOUNT;
        case PaymentMethod.AUPAY:
          return totalPrice <= this.AUPAY_MAX_AMOUNT;
        default:
          return true;
      }
    });

    return filteredMethods.join(",");
  }

  async payViaLink(order: Order): Promise<void> {
    if (typeof window !== "undefined") {
      window.open(`${this.paymentUrl}?orderId=${order.id}`, "_blank");
    }
  }
}
