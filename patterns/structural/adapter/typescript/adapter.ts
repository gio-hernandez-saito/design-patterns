// =============================================================================
// 어댑터 패턴 (Adapter Pattern)
// =============================================================================
// 목적: 호환되지 않는 인터페이스를 가진 객체들이 협력할 수 있도록 중간에서 변환해주는 패턴
//
// 역할 매핑:
//   PaymentProcessor (Target)     → 클라이언트가 기대하는 인터페이스
//   StripePaymentAdapter (Adapter) → Target을 구현하면서 Adaptee를 내부적으로 호출
//   StripeSDK (Adaptee)           → 이미 존재하는 외부 라이브러리 (인터페이스가 다름)
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Target: 클라이언트(우리 앱)가 사용하려는 인터페이스
// 내부 결제 시스템이 기대하는 표준 인터페이스를 정의한다.
// ─────────────────────────────────────────────────────────────────────────────

/** 결제 요청 데이터 구조 */
export interface PaymentRequest {
  amount: number;       // 결제 금액 (원화)
  currency: string;     // 통화 코드 (예: "KRW", "USD")
  orderId: string;      // 주문 ID
}

/** 결제 결과 데이터 구조 */
export interface PaymentResult {
  success: boolean;     // 결제 성공 여부
  transactionId: string; // 트랜잭션 ID
  message: string;      // 결과 메시지
}

/**
 * Target 인터페이스: 우리 앱이 기대하는 결제 처리기 인터페이스
 *
 * 어댑터 패턴의 핵심: 클라이언트는 오직 이 인터페이스만 알면 된다.
 * 어떤 결제 라이브러리를 쓰든 이 인터페이스로 통일된다.
 */
export interface PaymentProcessor {
  processPayment(request: PaymentRequest): PaymentResult;
  refund(transactionId: string, amount: number): boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adaptee: 외부 Stripe SDK (우리가 바꿀 수 없는 서드파티 라이브러리)
// 인터페이스가 우리 앱과 맞지 않아서 직접 쓰기 어렵다.
// ─────────────────────────────────────────────────────────────────────────────

/** Stripe SDK의 결제 요청 형식 (외부 라이브러리 형식) */
export interface StripeChargeParams {
  amount_in_cents: number;  // Stripe는 센트 단위 사용
  currency_code: string;    // Stripe의 통화 필드명이 다름
  metadata: {
    order_id: string;
  };
}

/** Stripe SDK의 결제 응답 형식 (외부 라이브러리 형식) */
export interface StripeChargeResponse {
  id: string;               // Stripe 내부 트랜잭션 ID
  status: "succeeded" | "failed" | "pending";
  failure_message: string | null;
}

/**
 * Adaptee: 실제 Stripe SDK 클래스
 * 외부 라이브러리이므로 우리가 수정할 수 없다.
 * 인터페이스가 우리 앱의 PaymentProcessor와 완전히 다르다.
 */
export class StripeSDK {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Stripe의 메서드명과 파라미터 형식이 우리 앱과 다르다.
  // "charge"라는 메서드명, 센트 단위 금액, 다른 필드 구조를 사용한다.
  createCharge(params: StripeChargeParams): StripeChargeResponse {
    // 실제 Stripe API 호출을 시뮬레이션한다.
    // 실제 구현에서는 HTTP 요청을 보낸다.
    const isSuccess = params.amount_in_cents > 0;

    return {
      id: `stripe_${params.metadata.order_id}_${Date.now()}`,
      status: isSuccess ? "succeeded" : "failed",
      failure_message: isSuccess ? null : "금액이 0 이하입니다",
    };
  }

  // Stripe의 환불 메서드도 인터페이스가 다르다.
  createRefund(chargeId: string, amount_in_cents: number): { success: boolean } {
    return {
      success: chargeId.startsWith("stripe_") && amount_in_cents > 0,
    };
  }

  getApiKey(): string {
    return this.apiKey;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter: Stripe SDK를 우리 인터페이스에 맞게 변환하는 어댑터
// Target(PaymentProcessor)을 구현하면서 내부적으로 Adaptee(StripeSDK)를 사용한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StripePaymentAdapter: 핵심 어댑터 클래스
 *
 * 왜 이렇게 하는가?
 * - Stripe SDK의 인터페이스(createCharge, 센트 단위)를 우리 앱의 인터페이스(processPayment, 원화)로 변환한다.
 * - 클라이언트 코드는 Stripe에 대해 전혀 알 필요가 없다.
 * - 나중에 Stripe 대신 Toss, PayPal로 교체해도 클라이언트 코드는 변경하지 않아도 된다.
 */
export class StripePaymentAdapter implements PaymentProcessor {
  // Adaptee를 내부에 보유한다. (객체 어댑터 방식 - 상속보다 구성(composition) 사용)
  private stripeSDK: StripeSDK;

  constructor(stripeApiKey: string) {
    // 어댑터가 Adaptee를 직접 생성한다.
    this.stripeSDK = new StripeSDK(stripeApiKey);
  }

  /**
   * Target 인터페이스 구현: processPayment
   * 우리 앱의 형식(원화, orderId) → Stripe 형식(센트, metadata)으로 변환
   */
  processPayment(request: PaymentRequest): PaymentResult {
    // 핵심 변환 로직: 원화를 센트로 변환 (KRW는 이미 최소 단위이지만 USD는 100을 곱해야 함)
    // 여기서는 예시를 위해 단순히 100을 곱한다.
    const amountInCents = request.currency === "KRW"
      ? request.amount  // 원화는 이미 최소 단위
      : Math.round(request.amount * 100);  // 달러 → 센트 변환

    // Adaptee의 메서드 형식에 맞게 데이터를 재구성한다.
    const stripeParams: StripeChargeParams = {
      amount_in_cents: amountInCents,
      currency_code: request.currency.toLowerCase(), // Stripe는 소문자 통화코드 사용
      metadata: {
        order_id: request.orderId,
      },
    };

    // Adaptee 호출
    const stripeResponse = this.stripeSDK.createCharge(stripeParams);

    // Stripe 응답 → 우리 앱 형식으로 변환
    return {
      success: stripeResponse.status === "succeeded",
      transactionId: stripeResponse.id,
      message: stripeResponse.failure_message ?? "결제가 완료되었습니다",
    };
  }

  /**
   * Target 인터페이스 구현: refund
   * 우리 앱의 환불 형식 → Stripe 환불 형식으로 변환
   */
  refund(transactionId: string, amount: number): boolean {
    // 마찬가지로 금액 단위 변환이 필요하다.
    const amountInCents = Math.round(amount * 100);
    const result = this.stripeSDK.createRefund(transactionId, amountInCents);
    return result.success;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 두 번째 예시: Toss 결제 어댑터 (다른 Adaptee를 같은 Target으로 감싸는 예시)
// 이 클래스는 어댑터 패턴의 진정한 힘을 보여준다:
// 완전히 다른 결제사도 같은 인터페이스로 사용할 수 있다.
// ─────────────────────────────────────────────────────────────────────────────

/** 또 다른 Adaptee: Toss 결제 SDK (가상) */
export class TossPaySDK {
  // Toss는 완전히 다른 메서드명과 구조를 사용한다.
  pay(orderNo: string, won: number): { code: number; txId: string } {
    return {
      code: won > 0 ? 200 : 400,
      txId: `toss_${orderNo}`,
    };
  }

  cancelPayment(txId: string): { cancelled: boolean } {
    return { cancelled: txId.startsWith("toss_") };
  }
}

/** Toss SDK를 우리 인터페이스로 변환하는 어댑터 */
export class TossPaymentAdapter implements PaymentProcessor {
  private tossSDK: TossPaySDK;

  constructor() {
    this.tossSDK = new TossPaySDK();
  }

  processPayment(request: PaymentRequest): PaymentResult {
    // Toss 형식으로 변환하여 호출
    const result = this.tossSDK.pay(request.orderId, request.amount);

    return {
      success: result.code === 200,
      transactionId: result.txId,
      message: result.code === 200 ? "Toss 결제 완료" : "Toss 결제 실패",
    };
  }

  refund(transactionId: string, _amount: number): boolean {
    const result = this.tossSDK.cancelPayment(transactionId);
    return result.cancelled;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 클라이언트: PaymentProcessor 인터페이스만 알면 어떤 결제사든 사용 가능
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 결제 서비스: 클라이언트 역할
 * PaymentProcessor 인터페이스에만 의존하므로 결제사 교체에 유연하다.
 */
export class PaymentService {
  // 구체적인 Stripe나 Toss가 아닌 인터페이스에 의존한다. (의존성 역전 원칙)
  private processor: PaymentProcessor;

  constructor(processor: PaymentProcessor) {
    this.processor = processor;
  }

  checkout(orderId: string, amount: number, currency: string): PaymentResult {
    return this.processor.processPayment({ orderId, amount, currency });
  }

  cancelOrder(transactionId: string, amount: number): boolean {
    return this.processor.refund(transactionId, amount);
  }
}
