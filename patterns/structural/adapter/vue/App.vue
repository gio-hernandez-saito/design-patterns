<script setup lang="ts">
/**
 * Adapter 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   usePaymentProcessor() (composable) → Target 인터페이스: 앱이 기대하는 결제 API
 *   useStripeAdapter()                  → Adapter: Stripe SDK를 Target 인터페이스로 래핑
 *   useTossAdapter()                    → Adapter: Toss SDK를 Target 인터페이스로 래핑
 *   StripeSDK / TossPaySDK (내부 객체)  → Adaptee: 인터페이스가 다른 외부 SDK
 *   PaymentForm (컴포넌트)              → Client: Target 인터페이스만 사용
 *
 * 왜 이렇게 구현하는가?
 *   Vue에서 어댑터는 "외부 라이브러리 래핑 composable"로 자연스럽게 표현된다.
 *   컴포넌트는 useStripeAdapter/useTossAdapter를 구별하지 않고
 *   동일한 processPayment/refund 인터페이스만 사용한다.
 *   결제사를 바꿔도 컴포넌트 코드는 전혀 변경하지 않아도 된다.
 */

import { ref, reactive } from 'vue'

// ─── Target 인터페이스 타입 ───────────────────────────────────────────────────
interface PaymentRequest {
  amount: number
  currency: string
  orderId: string
}

interface PaymentResult {
  success: boolean
  transactionId: string
  message: string
}

// ─── Adaptee 1: Stripe SDK (인터페이스가 다른 외부 라이브러리) ─────────────────
// 실제 Stripe SDK처럼 메서드명과 파라미터 형식이 우리 앱과 다르다.
class StripeSDK {
  constructor(private apiKey: string) {}

  createCharge(params: { amount_in_cents: number; currency_code: string; metadata: { order_id: string } }) {
    const isSuccess = params.amount_in_cents > 0
    return {
      id: `stripe_${params.metadata.order_id}_${Date.now()}`,
      status: isSuccess ? 'succeeded' : 'failed',
      failure_message: isSuccess ? null : '금액이 0 이하입니다',
    }
  }

  createRefund(chargeId: string, amount_in_cents: number): { success: boolean } {
    return { success: chargeId.startsWith('stripe_') && amount_in_cents > 0 }
  }
}

// ─── Adaptee 2: Toss SDK (또 다른 외부 라이브러리) ────────────────────────────
class TossPaySDK {
  pay(orderNo: string, won: number): { code: number; txId: string } {
    return { code: won > 0 ? 200 : 400, txId: `toss_${orderNo}` }
  }
  cancelPayment(txId: string): { cancelled: boolean } {
    return { cancelled: txId.startsWith('toss_') }
  }
}

// ─── Adapter 1: Stripe composable ────────────────────────────────────────────
/**
 * useStripeAdapter: Stripe SDK를 우리 앱 인터페이스로 래핑하는 어댑터 composable
 *
 * 클라이언트는 이 composable을 통해 Stripe를 사용하지만
 * Stripe의 API 형식(센트 단위, createCharge 등)을 전혀 알 필요가 없다.
 */
function useStripeAdapter() {
  const sdk = new StripeSDK('sk_test_example')

  function processPayment(request: PaymentRequest): PaymentResult {
    // 핵심 변환: 원화 → 센트, orderId → metadata 형식 변환
    const amountInCents = request.currency === 'KRW'
      ? request.amount
      : Math.round(request.amount * 100)

    const stripeResponse = sdk.createCharge({
      amount_in_cents: amountInCents,
      currency_code: request.currency.toLowerCase(),
      metadata: { order_id: request.orderId },
    })

    return {
      success: stripeResponse.status === 'succeeded',
      transactionId: stripeResponse.id,
      message: stripeResponse.failure_message ?? '결제가 완료되었습니다',
    }
  }

  function refund(transactionId: string, amount: number): boolean {
    const amountInCents = Math.round(amount * 100)
    return sdk.createRefund(transactionId, amountInCents).success
  }

  return { processPayment, refund, name: 'Stripe' }
}

// ─── Adapter 2: Toss composable ───────────────────────────────────────────────
/**
 * useTossAdapter: Toss SDK를 동일한 인터페이스로 래핑하는 어댑터 composable
 *
 * useStripeAdapter와 완전히 다른 내부 구현이지만
 * 클라이언트에게는 동일한 processPayment/refund 인터페이스를 제공한다.
 */
function useTossAdapter() {
  const sdk = new TossPaySDK()

  function processPayment(request: PaymentRequest): PaymentResult {
    // Toss 형식으로 변환: 전혀 다른 메서드명(pay)과 파라미터 사용
    const result = sdk.pay(request.orderId, request.amount)
    return {
      success: result.code === 200,
      transactionId: result.txId,
      message: result.code === 200 ? 'Toss 결제 완료' : 'Toss 결제 실패',
    }
  }

  function refund(transactionId: string, _amount: number): boolean {
    return sdk.cancelPayment(transactionId).cancelled
  }

  return { processPayment, refund, name: 'Toss' }
}

// ─── 데모 상태 ────────────────────────────────────────────────────────────────
// 클라이언트가 사용할 어댑터 (런타임에 교체 가능)
type AdapterType = 'stripe' | 'toss'
const selectedAdapter = ref<AdapterType>('stripe')

// 현재 어댑터 — 교체해도 processPayment/refund 인터페이스는 동일하다
const adapters = {
  stripe: useStripeAdapter(),
  toss: useTossAdapter(),
}

const form = reactive({ orderId: 'ORDER-001', amount: 50000, currency: 'KRW' })
const results = ref<Array<{ provider: string; result: PaymentResult; type: 'payment' | 'refund' }>>([])

function checkout() {
  // 클라이언트 코드: 어떤 어댑터인지 상관없이 동일한 인터페이스 사용
  const adapter = adapters[selectedAdapter.value]
  const result = adapter.processPayment({ ...form })
  results.value.unshift({ provider: adapter.name, result, type: 'payment' })
}

function doRefund(txId: string) {
  const adapter = adapters[selectedAdapter.value]
  const success = adapter.refund(txId, form.amount)
  results.value.unshift({
    provider: adapter.name,
    result: { success, transactionId: txId, message: success ? '환불 완료' : '환불 실패' },
    type: 'refund',
  })
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Adapter 패턴</h1>
    <p style="color: #555;">
      <code>useStripeAdapter()</code>와 <code>useTossAdapter()</code>는 완전히 다른 SDK를
      동일한 <code>processPayment / refund</code> 인터페이스로 래핑한다.
      결제사를 바꿔도 컴포넌트 코드는 전혀 변경하지 않아도 된다.
    </p>

    <!-- 어댑터 선택 -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0;">결제사 선택 (어댑터 교체)</h3>
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
        <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" value="stripe" v-model="selectedAdapter" />
          <span style="font-weight: bold; color: #6772e5;">Stripe 어댑터</span>
        </label>
        <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" value="toss" v-model="selectedAdapter" />
          <span style="font-weight: bold; color: #0064ff;">Toss 어댑터</span>
        </label>
      </div>
      <div style="background: #f5f5f5; border-radius: 4px; padding: 0.75rem; font-size: 0.85rem; color: #555;">
        현재 어댑터: <strong>{{ adapters[selectedAdapter].name }}</strong> —
        내부적으로 {{ selectedAdapter === 'stripe' ? 'createCharge()를 센트 단위로' : 'pay()를 원화로' }} 호출하지만,
        컴포넌트는 항상 <code>processPayment()</code>만 호출한다.
      </div>
    </div>

    <!-- 결제 폼 (Client — Target 인터페이스만 사용) -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0;">결제 정보</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
        <div>
          <label style="font-size: 0.85rem; font-weight: bold;">주문 ID</label>
          <input v-model="form.orderId" style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-top: 4px;" />
        </div>
        <div>
          <label style="font-size: 0.85rem; font-weight: bold;">금액</label>
          <input type="number" v-model="form.amount" style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-top: 4px;" />
        </div>
        <div>
          <label style="font-size: 0.85rem; font-weight: bold;">통화</label>
          <select v-model="form.currency" style="width: 100%; box-sizing: border-box; padding: 7px; border: 1px solid #ccc; border-radius: 4px; margin-top: 4px;">
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      <button @click="checkout" style="background: #2b6cb0; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 1rem;">
        결제 (processPayment)
      </button>
    </div>

    <!-- 결과 목록 -->
    <div v-if="results.length">
      <h3>거래 결과</h3>
      <div v-for="(r, i) in results" :key="i" :style="{
        border: '1px solid ' + (r.result.success ? '#9ae6b4' : '#fc8181'),
        background: r.result.success ? '#f0fff4' : '#fff5f5',
        borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem',
      }">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>
            <strong>{{ r.provider }}</strong>
            <span style="font-size:0.8rem;color:#666;margin-left:0.5rem;">[{{ r.type === 'payment' ? '결제' : '환불' }}]</span>
          </span>
          <span :style="{ color: r.result.success ? '#276749' : '#c53030', fontWeight: 'bold' }">
            {{ r.result.success ? '성공' : '실패' }}
          </span>
        </div>
        <div style="font-size: 0.85rem; color: #555; margin-top: 4px;">
          거래 ID: <code>{{ r.result.transactionId }}</code>
        </div>
        <div style="font-size: 0.85rem; color: #555;">{{ r.result.message }}</div>
        <button
          v-if="r.type === 'payment' && r.result.success"
          @click="doRefund(r.result.transactionId)"
          style="margin-top: 6px; padding: 4px 10px; font-size: 0.8rem; cursor: pointer; border: 1px solid #ccc; border-radius: 4px;"
        >
          환불 (refund)
        </button>
      </div>
    </div>
    <div v-else style="color: #888; font-style: italic;">결제 버튼을 눌러 어댑터 동작을 확인하세요.</div>
  </div>
</template>
