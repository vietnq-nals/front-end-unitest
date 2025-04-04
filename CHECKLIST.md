# Test Cases Checklist

## PaymentService Tests
- **buildPaymentMethod**
  - Include all payment methods for small amounts
  - Handle price values of 0
  - Handle floating point price values
  - Validate exclude AUPAY for amounts exceeding AUPAY limit
  - Validate exclude PAYPAY for amounts exceeding PAYPAY limit
  - Handle edge case at AUPAY limit exactly
  - Handle edge case at PAYPAY limit exactly
  - Handle extremely large price values
  - Handle negative price values
- **payViaLink**
  - Open payment link with order ID
  - Handle orders with special characters in ID
  - Handle undefined window (server-side rendering)
  - Should be safe against potential XSS in order ID

## CouponService Tests
- **getCoupon**
  - Return coupon when API call is successful
  - Throw error when coupon fetch is not found
  - Handle high traffic with multiple concurrent requests
- **applyCoupon**
  - Subtract discount from price
  - Return 0 when discount is greater than price
  - Handle edge case with price equal to discount
  - Handle large discount values
  - Handle negative price values
  - Handle NaN price values
  - Handle floating point price values

## OrderService Tests
- **process**
  - Handle empty order items.
  - Handle invalid order items.
  - Handle total price less than or equal to 0.
  - Validate coupon application (valid and invalid).
  - Ensure total price does not go below 0 after applying a coupon.
