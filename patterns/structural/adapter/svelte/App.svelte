<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Adapter 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   PaymentProcessor (Target)     → processPayment / refund 함수 시그니처
  //   stripeAdapter / tossAdapter   → Adapter (Target 인터페이스를 구현하는 래핑 함수)
  //   stripeSDK / tossSDK           → Adaptee (외부 라이브러리 시뮬레이션)
  //   $state selectedProcessor      → 현재 사용 중인 어댑터 선택
  //
  // 핵심 아이디어:
  //   클라이언트(UI)는 항상 같은 인터페이스(processPayment)를 호출하지만,
  //   선택된 어댑터에 따라 내부적으로 다른 SDK를 사용한다.
  //   어댑터 교체 시 클라이언트 코드(UI 로직)는 변경할 필요가 없다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Adaptee 1: Stripe SDK (외부 라이브러리 시뮬레이션) ───────────────────
  const stripeSDK = {
    // Stripe는 센트 단위, 소문자 통화코드, metadata 구조를 사용한다
    createCharge(params: { amount_in_cents: number; currency_code: string; metadata: { order_id: string } }) {
      const ok = params.amount_in_cents > 0
      return {
        id: `stripe_${params.metadata.order_id}_${Date.now()}`,
        status: ok ? 'succeeded' : 'failed',
        failure_message: ok ? null : '금액이 0 이하입니다',
      }
    },
    createRefund(chargeId: string, amount_in_cents: number) {
      return { success: chargeId.startsWith('stripe_') && amount_in_cents > 0 }
    },
  }

  // ── Adaptee 2: Toss SDK (다른 인터페이스를 가진 외부 라이브러리) ─────────
  const tossSDK = {
    // Toss는 완전히 다른 메서드명과 구조를 사용한다
    pay(orderNo: string, won: number) {
      return { code: won > 0 ? 200 : 400, txId: `toss_${orderNo}` }
    },
    cancelPayment(txId: string) {
      return { cancelled: txId.startsWith('toss_') }
    },
  }

  // ── Target 인터페이스 타입 ────────────────────────────────────────────────
  interface PaymentResult {
    success: boolean
    transactionId: string
    message: string
  }

  // ── Adapter 1: Stripe SDK → Target 인터페이스 변환 ───────────────────────
  // TypeScript의 StripePaymentAdapter 클래스 역할을 함수로 구현한다
  const stripeAdapter = {
    name: 'Stripe',
    logo: '💳',
    color: '#635bff',
    processPayment(orderId: string, amount: number, currency: string): PaymentResult {
      // 핵심 변환: 원화를 센트로, 필드명을 Stripe 형식으로 변환
      const amountInCents = currency === 'KRW' ? amount : Math.round(amount * 100)
      const res = stripeSDK.createCharge({
        amount_in_cents: amountInCents,
        currency_code: currency.toLowerCase(), // Stripe는 소문자 사용
        metadata: { order_id: orderId },
      })
      return {
        success: res.status === 'succeeded',
        transactionId: res.id,
        message: res.failure_message ?? '결제 완료',
      }
    },
    refund(transactionId: string, amount: number): boolean {
      return stripeSDK.createRefund(transactionId, Math.round(amount * 100)).success
    },
  }

  // ── Adapter 2: Toss SDK → Target 인터페이스 변환 ─────────────────────────
  const tossAdapter = {
    name: 'Toss',
    logo: '💙',
    color: '#0064ff',
    processPayment(orderId: string, amount: number, _currency: string): PaymentResult {
      // 핵심 변환: Toss의 pay() 메서드와 응답 형식으로 변환
      const res = tossSDK.pay(orderId, amount)
      return {
        success: res.code === 200,
        transactionId: res.txId,
        message: res.code === 200 ? 'Toss 결제 완료' : 'Toss 결제 실패',
      }
    },
    refund(transactionId: string, _amount: number): boolean {
      return tossSDK.cancelPayment(transactionId).cancelled
    },
  }

  const adapters = [stripeAdapter, tossAdapter]

  // ── $state: UI 상태 ───────────────────────────────────────────────────────
  let selectedAdapterName = $state<string>('Stripe')
  let orderId = $state('ORDER-001')
  let amount = $state(15000)
  let currency = $state('KRW')
  let results = $state<Array<{ type: string; result: PaymentResult | boolean; adapter: string; color: string }>>([])

  // $derived: 선택된 어댑터 객체 (이것이 어댑터 패턴의 핵심 — 클라이언트는 같은 인터페이스 사용)
  let currentAdapter = $derived(adapters.find(a => a.name === selectedAdapterName)!)

  function pay() {
    const result = currentAdapter.processPayment(orderId, amount, currency)
    results = [{ type: '결제', result, adapter: currentAdapter.name, color: currentAdapter.color }, ...results]
    if (result.success) {
      // 결제 성공 시 환불 테스트용 ID 저장
      lastTxId = result.transactionId
    }
  }

  let lastTxId = $state('')

  function refund() {
    if (!lastTxId) return
    const result = currentAdapter.refund(lastTxId, amount)
    results = [{ type: '환불', result, adapter: currentAdapter.name, color: currentAdapter.color }, ...results]
  }
</script>

<main>
  <h1>Adapter 패턴</h1>
  <p class="desc">
    클라이언트(UI)는 항상 같은 <code>processPayment()</code>를 호출하지만,
    선택된 어댑터에 따라 내부적으로 다른 SDK가 사용된다. 어댑터 교체 시 UI 로직은 변경되지 않는다.
  </p>

  <div class="layout">
    <section class="card">
      <h2>어댑터 선택 (결제사 교체)</h2>
      <div class="adapter-buttons">
        {#each adapters as adapter}
          <button
            class="adapter-btn"
            class:active={selectedAdapterName === adapter.name}
            style="--color: {adapter.color}"
            onclick={() => (selectedAdapterName = adapter.name)}
          >
            {adapter.logo} {adapter.name}
          </button>
        {/each}
      </div>

      <div class="active-adapter" style="border-color: {currentAdapter.color}">
        <div class="adapter-icon">{currentAdapter.logo}</div>
        <div>
          <div style="font-weight: 600; color: {currentAdapter.color}">{currentAdapter.name} Adapter 활성</div>
          <div class="adapter-note">내부적으로 {currentAdapter.name} SDK 사용 중</div>
        </div>
      </div>

      <label>주문 ID: <input bind:value={orderId} /></label>
      <label>금액:
        <div class="amount-row">
          <input type="number" bind:value={amount} min="1" />
          <select bind:value={currency}>
            <option>KRW</option>
            <option>USD</option>
          </select>
        </div>
      </label>

      <div class="btn-row">
        <button class="btn-pay" style="background: {currentAdapter.color}" onclick={pay}>결제 요청</button>
        <button class="btn-refund" onclick={refund} disabled={!lastTxId}>환불 요청</button>
      </div>
      {#if lastTxId}
        <div class="tx-id">마지막 TX: <code>{lastTxId}</code></div>
      {/if}
    </section>

    <section class="card">
      <h2>결과 (클라이언트는 항상 같은 인터페이스 사용)</h2>
      {#if results.length === 0}
        <p class="empty">결제를 실행하면 결과가 여기 표시됩니다</p>
      {:else}
        <ul class="results">
          {#each results as r}
            <li style="border-left-color: {r.color}">
              <div class="result-header">
                <span class="badge" style="background: {r.color}">{r.type}</span>
                <span class="adapter-tag">{r.adapter}</span>
              </div>
              {#if typeof r.result === 'boolean'}
                <div class:success={r.result} class:fail={!r.result}>
                  {r.result ? '환불 성공' : '환불 실패'}
                </div>
              {:else}
                <div class:success={r.result.success} class:fail={!r.result.success}>
                  {r.result.message}
                </div>
                <div class="tx">{r.result.transactionId}</div>
              {/if}
            </li>
          {/each}
        </ul>
        <button class="btn-clear" onclick={() => results = []}>지우기</button>
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>StripePaymentAdapter implements PaymentProcessor</code> 클래스로 어댑터 구현</li>
      <li><strong>Svelte:</strong> 어댑터를 동일한 인터페이스를 가진 객체 리터럴로 구현, <code>$derived</code>로 선택</li>
      <li><strong>교체:</strong> <code>$state</code>로 어댑터를 바꾸면 UI는 그대로, 내부 SDK만 교체됨</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #0891b2; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.9rem; color: #374151; }
  .adapter-buttons { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
  .adapter-btn {
    flex: 1; padding: 0.6rem; border: 2px solid var(--color); border-radius: 8px;
    background: white; cursor: pointer; font-size: 0.9rem; transition: all 0.15s;
  }
  .adapter-btn.active { background: var(--color); color: white; }
  .active-adapter {
    display: flex; gap: 0.75rem; align-items: center;
    border: 2px solid; border-radius: 10px; padding: 0.75rem;
    margin-bottom: 1rem; transition: border-color 0.2s;
  }
  .adapter-icon { font-size: 1.8rem; }
  .adapter-note { font-size: 0.82rem; color: #6b7280; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.88rem; color: #374151; margin-bottom: 0.75rem; }
  input, select { padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; }
  .amount-row { display: flex; gap: 0.5rem; }
  .amount-row input { flex: 1; }
  .btn-row { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
  .btn-pay { color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
  .btn-refund { background: white; border: 1px solid #cbd5e1; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
  .btn-refund:disabled { opacity: 0.4; cursor: not-allowed; }
  .tx-id { margin-top: 0.5rem; font-size: 0.8rem; color: #6b7280; }
  .results { list-style: none; padding: 0; margin: 0; }
  .results li { border-left: 3px solid; padding: 0.6rem 0.75rem; margin-bottom: 0.5rem; background: white; border-radius: 0 6px 6px 0; font-size: 0.85rem; }
  .result-header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; }
  .badge { color: white; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.78rem; }
  .adapter-tag { color: #6b7280; font-size: 0.78rem; }
  .success { color: #059669; font-weight: 600; }
  .fail { color: #dc2626; font-weight: 600; }
  .tx { color: #94a3b8; font-size: 0.78rem; margin-top: 0.2rem; word-break: break-all; }
  .btn-clear { margin-top: 0.75rem; background: transparent; border: 1px solid #e2e8f0; padding: 0.3rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; color: #94a3b8; }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
