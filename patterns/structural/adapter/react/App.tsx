/**
 * Adapter 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Target (PaymentProcessor)     → usePayment() 훅이 제공하는 공통 인터페이스
 * - Adaptee (StripeSDK, TossSDK)  → 각 결제사의 다른 인터페이스 (함수 시그니처가 다름)
 * - Adapter                       → useStripeAdapter(), useTossAdapter() 커스텀 훅
 * - Client                        → CheckoutPanel 컴포넌트 (어떤 결제사인지 모른다)
 *
 * 왜 커스텀 훅 어댑터인가?
 * - 외부 결제 SDK는 우리 앱의 훅 인터페이스와 다른 함수 시그니처를 가진다.
 * - 각 어댑터 훅이 외부 SDK 호출을 내부에서 수행하고,
 *   우리 앱 표준 인터페이스(processPayment, refund)를 노출한다.
 * - CheckoutPanel은 usePayment 인터페이스만 알면 어떤 결제사든 사용 가능하다.
 */

import { useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// Target 인터페이스 — 우리 앱이 기대하는 결제 훅 형태
// ─────────────────────────────────────────────

interface PaymentResult {
  success: boolean
  transactionId: string
  message: string
}

/**
 * Target 인터페이스: 모든 어댑터 훅이 이 형태를 반환해야 한다.
 * 클라이언트(CheckoutPanel)는 이 타입만 알면 된다.
 */
interface PaymentHook {
  providerName: string
  processPayment(orderId: string, amount: number, currency: string): PaymentResult
  refund(transactionId: string, amount: number): boolean
}

// ─────────────────────────────────────────────
// Adaptee 1: Stripe SDK (우리가 바꿀 수 없는 외부 SDK 시뮬레이션)
// ─────────────────────────────────────────────

/**
 * Adaptee: Stripe의 실제 API 형식
 * 우리 앱과 인터페이스가 다르다 — 센트 단위, 다른 필드명, 다른 응답 구조
 */
const stripeSDK = {
  createCharge(params: { amount_in_cents: number; currency_code: string; metadata: { order_id: string } }) {
    const ok = params.amount_in_cents > 0
    return {
      id: `stripe_${params.metadata.order_id}_${Date.now()}`,
      status: ok ? 'succeeded' : 'failed',
      failure_message: ok ? null : '금액 오류',
    }
  },
  createRefund(chargeId: string, amount_in_cents: number) {
    return { success: chargeId.startsWith('stripe_') && amount_in_cents > 0 }
  },
}

/**
 * Adapter 1: useStripeAdapter
 * Stripe SDK의 인터페이스 → 우리 앱의 PaymentHook 인터페이스로 변환.
 * 핵심 변환 로직: 원화/달러 → 센트, orderId → metadata.order_id
 */
function useStripeAdapter(): PaymentHook {
  return {
    providerName: 'Stripe',
    processPayment(orderId, amount, currency) {
      // 어댑터의 핵심: 우리 형식 → Stripe 형식으로 변환
      const amountInCents = currency === 'KRW' ? amount : Math.round(amount * 100)
      const response = stripeSDK.createCharge({
        amount_in_cents: amountInCents,
        currency_code: currency.toLowerCase(),
        metadata: { order_id: orderId },
      })
      // Stripe 응답 → 우리 형식으로 변환
      return {
        success: response.status === 'succeeded',
        transactionId: response.id,
        message: response.failure_message ?? '결제 완료',
      }
    },
    refund(transactionId, amount) {
      return stripeSDK.createRefund(transactionId, Math.round(amount * 100)).success
    },
  }
}

// ─────────────────────────────────────────────
// Adaptee 2: Toss SDK (완전히 다른 인터페이스)
// ─────────────────────────────────────────────

const tossSDK = {
  // Toss는 메서드명, 파라미터 순서, 응답 형식이 모두 다르다
  pay(orderNo: string, won: number) {
    return { code: won > 0 ? 200 : 400, txId: `toss_${orderNo}` }
  },
  cancelPayment(txId: string) {
    return { cancelled: txId.startsWith('toss_') }
  },
}

/**
 * Adapter 2: useTossAdapter
 * Toss SDK → PaymentHook 인터페이스 변환.
 * 완전히 다른 Adaptee도 같은 Target 인터페이스로 감쌀 수 있음을 보여준다.
 */
function useTossAdapter(): PaymentHook {
  return {
    providerName: 'Toss Pay',
    processPayment(orderId, amount) {
      // Toss 형식으로 변환해 호출
      const result = tossSDK.pay(orderId, amount)
      return {
        success: result.code === 200,
        transactionId: result.txId,
        message: result.code === 200 ? 'Toss 결제 완료' : 'Toss 결제 실패',
      }
    },
    refund(transactionId) {
      return tossSDK.cancelPayment(transactionId).cancelled
    },
  }
}

// ─────────────────────────────────────────────
// Client 컴포넌트 — PaymentHook 인터페이스만 사용
// ─────────────────────────────────────────────

/**
 * CheckoutPanel: 클라이언트 역할.
 * payment prop으로 PaymentHook을 주입받는다.
 * Stripe인지 Toss인지 전혀 알 필요가 없다 — 어댑터 패턴의 핵심 이점.
 */
function CheckoutPanel({ payment }: { payment: PaymentHook }) {
  const [orderId] = useState(`ORDER-${Date.now().toString().slice(-6)}`)
  const [amount, setAmount] = useState(15000)
  const [currency, setCurrency] = useState('KRW')
  const [logs, setLogs] = useState<string[]>([])
  const [lastTxId, setLastTxId] = useState('')

  const addLog = (msg: string) => setLogs(prev => [...prev, msg])

  const handlePay = useCallback(() => {
    // 어떤 결제사인지 모르고 그냥 호출한다 — Target 인터페이스만 사용
    const result = payment.processPayment(orderId, amount, currency)
    if (result.success) {
      setLastTxId(result.transactionId)
      addLog(`✅ ${payment.providerName} 결제 성공: ${result.transactionId}`)
    } else {
      addLog(`❌ ${payment.providerName} 결제 실패: ${result.message}`)
    }
  }, [payment, orderId, amount, currency])

  const handleRefund = useCallback(() => {
    if (!lastTxId) { addLog('먼저 결제를 진행하세요.'); return }
    const ok = payment.refund(lastTxId, amount)
    addLog(ok ? `↩️ 환불 성공: ${lastTxId}` : `❌ 환불 실패`)
    if (ok) setLastTxId('')
  }, [payment, lastTxId, amount])

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 12px' }}>결제 처리 (어댑터: {payment.providerName})</h3>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>금액</label>
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
            style={{ width: 100, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>통화</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4 }}>
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>주문 ID</label>
          <code style={{ fontSize: 12 }}>{orderId}</code>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={handlePay}
          style={{ padding: '8px 20px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          결제하기
        </button>
        <button onClick={handleRefund} disabled={!lastTxId}
          style={{ padding: '8px 20px', background: lastTxId ? '#f44336' : '#bdbdbd', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          환불하기
        </button>
      </div>
      {logs.length > 0 && (
        <div style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'toss'>('stripe')

  // 어댑터를 선택 — 같은 인터페이스를 구현한 서로 다른 어댑터
  const stripeAdapter = useStripeAdapter()
  const tossAdapter = useTossAdapter()
  const payment = selectedProvider === 'stripe' ? stripeAdapter : tossAdapter

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Adapter 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        커스텀 훅 어댑터가 서로 다른 결제 SDK를 동일한 인터페이스로 변환합니다.<br />
        CheckoutPanel은 어떤 결제사를 쓰는지 전혀 알 필요가 없습니다.
      </p>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>결제사 선택 (어댑터 교체)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['stripe', 'toss'] as const).map(p => (
            <button key={p} onClick={() => setSelectedProvider(p)}
              style={{
                padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: selectedProvider === p ? '#333' : '#eee',
                color: selectedProvider === p ? 'white' : '#333',
                fontWeight: selectedProvider === p ? 'bold' : 'normal',
              }}>
              {p === 'stripe' ? 'Stripe' : 'Toss Pay'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0' }}>
          어댑터만 교체 — CheckoutPanel 코드는 전혀 바뀌지 않습니다
        </p>
      </div>

      {/* 클라이언트 컴포넌트: payment prop 타입만 알 뿐 어떤 어댑터인지 모른다 */}
      <CheckoutPanel payment={payment} />

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>useStripeAdapter()</code>, <code>useTossAdapter()</code>가 Adapter — 서로 다른 SDK를 같은 인터페이스로 감싼다</li>
          <li><code>CheckoutPanel</code>은 <code>PaymentHook</code> 타입만 알면 된다 — 결제사 독립적</li>
          <li>새 결제사(PayPal 등) 추가 시 새 어댑터 훅만 만들면 된다 — 기존 코드 무변경</li>
        </ul>
      </div>
    </div>
  )
}
