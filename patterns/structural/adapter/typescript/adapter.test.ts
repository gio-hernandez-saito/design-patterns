import { describe, it, expect, beforeEach } from "vitest";
import {
  StripeSDK,
  StripePaymentAdapter,
  TossPaySDK,
  TossPaymentAdapter,
  PaymentService,
  type PaymentRequest,
  type PaymentResult,
  type PaymentProcessor,
} from "./adapter.js";

// =============================================================================
// 어댑터 패턴 테스트
// 핵심 검증 사항:
// 1. 어댑터를 통해 외부 라이브러리를 우리 인터페이스로 사용할 수 있는지
// 2. 결제사를 교체해도 클라이언트 코드가 변경되지 않는지
// 3. 데이터 변환(원화→센트, 필드명 변환 등)이 올바르게 동작하는지
// =============================================================================

describe("Adaptee: StripeSDK (외부 라이브러리)", () => {
  it("센트 단위로 결제하면 성공 응답을 반환한다", () => {
    const stripe = new StripeSDK("sk_test_key");
    const response = stripe.createCharge({
      amount_in_cents: 10000,
      currency_code: "krw",
      metadata: { order_id: "order-001" },
    });

    expect(response.status).toBe("succeeded");
    expect(response.id).toContain("order-001");
  });

  it("금액이 0이면 실패 응답을 반환한다", () => {
    const stripe = new StripeSDK("sk_test_key");
    const response = stripe.createCharge({
      amount_in_cents: 0,
      currency_code: "krw",
      metadata: { order_id: "order-002" },
    });

    expect(response.status).toBe("failed");
    expect(response.failure_message).not.toBeNull();
  });
});

describe("Adapter: StripePaymentAdapter", () => {
  let adapter: StripePaymentAdapter;

  beforeEach(() => {
    // 어댑터를 생성한다. 내부적으로 StripeSDK를 포함한다.
    adapter = new StripePaymentAdapter("sk_test_key");
  });

  it("PaymentProcessor 인터페이스를 구현한다", () => {
    // 어댑터가 우리 앱의 인터페이스를 올바르게 구현하는지 확인
    expect(typeof adapter.processPayment).toBe("function");
    expect(typeof adapter.refund).toBe("function");
  });

  it("원화 결제 요청을 처리하고 성공 결과를 반환한다", () => {
    const request: PaymentRequest = {
      amount: 10000,
      currency: "KRW",
      orderId: "order-001",
    };

    const result = adapter.processPayment(request);

    // 어댑터가 Stripe 응답을 우리 형식으로 변환했는지 확인
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeTruthy();
    expect(result.message).toBe("결제가 완료되었습니다");
  });

  it("USD 결제 시 센트로 변환하여 처리한다", () => {
    const request: PaymentRequest = {
      amount: 10,        // 10달러
      currency: "USD",
      orderId: "order-002",
    };

    const result = adapter.processPayment(request);

    // USD는 내부적으로 1000센트로 변환된다
    expect(result.success).toBe(true);
    expect(result.transactionId).toContain("order-002");
  });

  it("Stripe의 트랜잭션 ID 형식으로 응답이 온다", () => {
    const request: PaymentRequest = {
      amount: 5000,
      currency: "KRW",
      orderId: "order-003",
    };

    const result = adapter.processPayment(request);

    // Stripe 어댑터의 트랜잭션 ID는 "stripe_"로 시작해야 한다
    expect(result.transactionId).toMatch(/^stripe_/);
  });

  it("환불 요청을 처리한다", () => {
    // 먼저 결제 후 트랜잭션 ID를 얻는다
    const result = adapter.processPayment({
      amount: 10000,
      currency: "KRW",
      orderId: "order-004",
    });

    // 해당 트랜잭션에 대한 환불을 요청한다
    const refunded = adapter.refund(result.transactionId, 10000);

    expect(refunded).toBe(true);
  });

  it("잘못된 트랜잭션 ID로 환불하면 실패한다", () => {
    const refunded = adapter.refund("invalid_tx_id", 10000);
    expect(refunded).toBe(false);
  });
});

describe("Adapter: TossPaymentAdapter", () => {
  let adapter: TossPaymentAdapter;

  beforeEach(() => {
    adapter = new TossPaymentAdapter();
  });

  it("TossSDK를 PaymentProcessor 인터페이스로 사용할 수 있다", () => {
    const request: PaymentRequest = {
      amount: 15000,
      currency: "KRW",
      orderId: "toss-order-001",
    };

    const result = adapter.processPayment(request);

    expect(result.success).toBe(true);
    expect(result.transactionId).toContain("toss_");
  });

  it("Toss 환불이 동작한다", () => {
    const result = adapter.processPayment({
      amount: 5000,
      currency: "KRW",
      orderId: "toss-order-002",
    });

    const refunded = adapter.refund(result.transactionId, 5000);
    expect(refunded).toBe(true);
  });
});

describe("Client: PaymentService (어댑터 교체 테스트)", () => {
  it("Stripe 어댑터로 결제 서비스를 사용할 수 있다", () => {
    // PaymentService는 구체적인 결제사를 모른다. 인터페이스만 안다.
    const stripeAdapter = new StripePaymentAdapter("sk_test_key");
    const service = new PaymentService(stripeAdapter);

    const result = service.checkout("order-001", 10000, "KRW");

    expect(result.success).toBe(true);
  });

  it("Toss 어댑터로 결제 서비스를 사용할 수 있다", () => {
    // 결제사만 교체했다. PaymentService 코드는 변경하지 않았다.
    const tossAdapter = new TossPaymentAdapter();
    const service = new PaymentService(tossAdapter);

    const result = service.checkout("order-002", 20000, "KRW");

    expect(result.success).toBe(true);
  });

  it("동일한 클라이언트 코드로 다른 결제사를 사용할 수 있다 (어댑터 패턴의 핵심)", () => {
    // 이것이 어댑터 패턴의 핵심 가치:
    // 클라이언트(PaymentService)는 변경 없이 다른 구현체를 사용한다.
    const adapters: PaymentProcessor[] = [
      new StripePaymentAdapter("sk_test_key"),
      new TossPaymentAdapter(),
    ];

    const results: PaymentResult[] = adapters.map((adapter) => {
      const service = new PaymentService(adapter);
      return service.checkout("order-999", 1000, "KRW");
    });

    // 모든 결제사가 같은 결과 형식을 반환해야 한다
    for (const result of results) {
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("transactionId");
      expect(result).toHaveProperty("message");
      expect(result.success).toBe(true);
    }
  });

  it("주문 취소(환불)가 동작한다", () => {
    const adapter = new StripePaymentAdapter("sk_test_key");
    const service = new PaymentService(adapter);

    const result = service.checkout("order-cancel-test", 5000, "KRW");
    const cancelled = service.cancelOrder(result.transactionId, 5000);

    expect(cancelled).toBe(true);
  });
});
