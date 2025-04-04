import { CouponItem } from "../models/coupon.model";

export interface ICouponService {
  apiBaseUrl: string;
  getCoupon(couponId: string): Promise<CouponItem | null>;
  applyCoupon(price: number, coupon: CouponItem): number;
}

export class CouponService implements ICouponService {
  public apiBaseUrl: string;

  constructor(apiBaseUrl: string = 'https://67eb7353aa794fb3222a4c0e.mockapi.io/coupons') {
    this.apiBaseUrl = apiBaseUrl;
  }

  async getCoupon(couponId: string): Promise<CouponItem | null> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/${couponId}`
      );
      const coupon = await response.json();

      return coupon;
    } catch (error) {
      console.error("Error fetching coupon:", error);
      throw new Error("Invalid coupon");
    }
  }

  applyCoupon(price: number, coupon: CouponItem): number {
    return Math.max(0, price - coupon.discount);
  }
}
