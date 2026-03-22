<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // State 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   MachineState 타입          → VendingMachineState 인터페이스
  //   currentState ($state)      → Context (VendingMachine) 현재 상태
  //   각 transition 함수         → ConcreteState의 메서드들
  //   $derived statusInfo        → 현재 상태에 따른 UI 설정
  //
  // 핵심 아이디어:
  //   TypeScript에서는 각 상태 클래스가 machine.setState()를 호출해 전이했지만,
  //   Svelte에서는 $state로 현재 상태명을 관리하고,
  //   각 액션 함수가 currentState를 변경해 상태 전이를 구현한다.
  //   $derived로 현재 상태에 따른 UI 설정이 자동으로 계산된다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── 상태 타입 정의 ────────────────────────────────────────────────────────
  type MachineState = 'idle' | 'coin_inserted' | 'item_selected' | 'dispensing'

  // ── $state: Context (자판기 상태) ─────────────────────────────────────────
  let currentState = $state<MachineState>('idle')
  let insertedAmount = $state(0)
  let selectedItem = $state('')
  let eventLog = $state<Array<{ type: 'info' | 'error' | 'success'; msg: string }>>([])

  function addLog(type: 'info' | 'error' | 'success', msg: string) {
    eventLog = [{ type, msg }, ...eventLog.slice(0, 14)]
  }

  // ── 상품 목록 ─────────────────────────────────────────────────────────────
  const items = [
    { name: '콜라',     price: 1500, emoji: '🥤' },
    { name: '커피',     price: 1000, emoji: '☕' },
    { name: '물',       price: 800,  emoji: '💧' },
    { name: '에너지드링크', price: 2000, emoji: '⚡' },
  ]

  // ── $derived: 현재 상태에 따른 UI 설정 ────────────────────────────────────
  // TypeScript의 stateName과 각 ConcreteState의 동작을 $derived로 표현
  let stateConfig = $derived((() => {
    const configs: Record<MachineState, { label: string; color: string; icon: string; desc: string }> = {
      idle:          { label: '대기 중',    color: '#94a3b8', icon: '⏸️',  desc: '동전을 투입하세요' },
      coin_inserted: { label: '동전 투입됨', color: '#f59e0b', icon: '💰', desc: '상품을 선택하세요' },
      item_selected: { label: '상품 선택됨', color: '#3b82f6', icon: '✅', desc: '배출 버튼을 누르세요' },
      dispensing:    { label: '배출 중',    color: '#10b981', icon: '🎉', desc: '상품이 나오고 있습니다...' },
    }
    return configs[currentState]
  })())

  // ── 가능한 액션 ($derived로 현재 상태에 따라 자동 계산) ────────────────────
  let canInsertCoin = $derived(currentState === 'idle' || currentState === 'coin_inserted')
  let canSelectItem = $derived(currentState === 'coin_inserted')
  let canDispense   = $derived(currentState === 'item_selected')
  let canCancel     = $derived(currentState === 'coin_inserted' || currentState === 'item_selected')

  // ── ConcreteState 동작: 각 함수가 상태 전이를 담당 ───────────────────────

  // IdleState.insertCoin() + CoinInsertedState.insertCoin()
  function insertCoin(amount: number) {
    if (!canInsertCoin) { addLog('error', '지금은 동전을 투입할 수 없습니다.'); return }
    insertedAmount += amount
    addLog('info', `${amount}원 투입됨. 총 ${insertedAmount}원`)
    // 상태 전이: idle → coin_inserted (또는 이미 coin_inserted면 유지)
    if (currentState === 'idle') currentState = 'coin_inserted'
  }

  // CoinInsertedState.selectItem()
  function selectItem(item: typeof items[0]) {
    if (!canSelectItem) { addLog('error', '먼저 동전을 투입하세요.'); return }
    if (insertedAmount < item.price) {
      addLog('error', `잔액 부족: ${item.price}원 필요, ${insertedAmount}원 보유`)
      return
    }
    selectedItem = item.name
    addLog('info', `"${item.name}" 선택됨 (${item.price}원)`)
    // 상태 전이: coin_inserted → item_selected
    currentState = 'item_selected'
  }

  // ItemSelectedState.dispense()
  async function dispense() {
    if (!canDispense) { addLog('error', '상품을 먼저 선택하세요.'); return }
    addLog('info', `"${selectedItem}" 배출 중...`)
    // 상태 전이: item_selected → dispensing
    currentState = 'dispensing'

    // 배출 완료 시뮬레이션 (1.5초 후)
    await new Promise(r => setTimeout(r, 1500))
    addLog('success', `"${selectedItem}" 배출 완료!`)
    // 상태 전이: dispensing → idle (초기화)
    insertedAmount = 0
    selectedItem = ''
    currentState = 'idle'
  }

  // CoinInsertedState.cancel() / ItemSelectedState.cancel()
  function cancel() {
    if (!canCancel) { addLog('error', '취소할 수 없는 상태입니다.'); return }
    const refund = insertedAmount
    addLog('info', `${refund}원 반환됨. 취소 완료.`)
    insertedAmount = 0
    selectedItem = ''
    // 상태 전이: → idle
    currentState = 'idle'
  }

  const coinAmounts = [500, 1000, 2000]
</script>

<main>
  <h1>State 패턴</h1>
  <p class="desc">
    자판기의 상태(<code>$state</code>)에 따라 버튼의 활성/비활성이 자동으로 바뀐다.
    <code>$derived</code>로 현재 상태가 허용하는 액션을 자동 계산한다.
  </p>

  <div class="layout">
    <!-- 자판기 UI -->
    <section class="card vending">
      <h2>자판기 (Context)</h2>

      <!-- 현재 상태 표시 -->
      <div class="state-display" style="background: {stateConfig.color}20; border-color: {stateConfig.color}">
        <span class="state-icon">{stateConfig.icon}</span>
        <div>
          <div class="state-label" style="color: {stateConfig.color}">{stateConfig.label}</div>
          <div class="state-desc">{stateConfig.desc}</div>
        </div>
        <div class="amount-display">
          <div class="amount-label">투입금액</div>
          <div class="amount-value">{insertedAmount}원</div>
        </div>
      </div>

      <!-- 상태 전이 다이어그램 -->
      <div class="state-flow">
        {#each (['idle', 'coin_inserted', 'item_selected', 'dispensing'] as MachineState[]) as s}
          <div class="flow-state" class:active={currentState === s} style="--c: {(['idle','coin_inserted','item_selected','dispensing'] as const).findIndex(x=>x===s) === 0 ? '#94a3b8' : (['idle','coin_inserted','item_selected','dispensing'] as const).findIndex(x=>x===s) === 1 ? '#f59e0b' : (['idle','coin_inserted','item_selected','dispensing'] as const).findIndex(x=>x===s) === 2 ? '#3b82f6' : '#10b981'}">
            {s === 'idle' ? '대기' : s === 'coin_inserted' ? '투입됨' : s === 'item_selected' ? '선택됨' : '배출중'}
          </div>
          {#if s !== 'dispensing'}<span class="flow-arr">→</span>{/if}
        {/each}
      </div>

      <!-- 동전 투입 -->
      <div class="control-section">
        <h3>동전 투입 (insertCoin)</h3>
        <div class="coin-btns">
          {#each coinAmounts as amt}
            <button class="coin-btn" disabled={!canInsertCoin} onclick={() => insertCoin(amt)}>
              {amt}원
            </button>
          {/each}
        </div>
      </div>

      <!-- 상품 선택 -->
      <div class="control-section">
        <h3>상품 선택 (selectItem)</h3>
        <div class="item-grid">
          {#each items as item}
            <button
              class="item-btn"
              disabled={!canSelectItem || insertedAmount < item.price}
              onclick={() => selectItem(item)}
            >
              <span class="item-emoji">{item.emoji}</span>
              <span class="item-name">{item.name}</span>
              <span class="item-price">{item.price}원</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- 배출 / 취소 -->
      <div class="bottom-btns">
        <button class="btn-dispense" disabled={!canDispense} onclick={dispense}>
          🎁 배출 (dispense)
        </button>
        <button class="btn-cancel" disabled={!canCancel} onclick={cancel}>
          ↩ 취소/반환
        </button>
      </div>
    </section>

    <!-- 이벤트 로그 -->
    <section class="card">
      <h2>이벤트 로그 (상태 전이 기록)</h2>
      {#if eventLog.length === 0}
        <p class="empty">동작을 실행하면 상태 전이가 기록됩니다</p>
      {:else}
        <ul class="event-log">
          {#each eventLog as entry}
            <li class={entry.type}>
              {entry.type === 'success' ? '✅' : entry.type === 'error' ? '❌' : 'ℹ️'}
              {entry.msg}
            </li>
          {/each}
        </ul>
      {/if}

      <div class="state-table">
        <h3>상태별 허용 액션</h3>
        <table>
          <thead><tr><th>상태</th><th>투입</th><th>선택</th><th>배출</th><th>취소</th></tr></thead>
          <tbody>
            <tr class:highlight={currentState==='idle'}>
              <td>대기</td><td>✓</td><td>✗</td><td>✗</td><td>✗</td>
            </tr>
            <tr class:highlight={currentState==='coin_inserted'}>
              <td>투입됨</td><td>✓</td><td>✓</td><td>✗</td><td>✓</td>
            </tr>
            <tr class:highlight={currentState==='item_selected'}>
              <td>선택됨</td><td>✗</td><td>✗</td><td>✓</td><td>✓</td>
            </tr>
            <tr class:highlight={currentState==='dispensing'}>
              <td>배출중</td><td>✗</td><td>✗</td><td>✗</td><td>✗</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> 각 상태를 클래스로 구현, <code>machine.setState(new IdleState())</code>로 전이</li>
      <li><strong>Svelte:</strong> <code>$state currentState</code>로 상태명을 관리, 전이는 단순 대입</li>
      <li><strong>조건:</strong> <code>$derived canInsertCoin</code> 등으로 현재 상태의 허용 액션을 자동 계산</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #10b981; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.88rem; color: #374151; margin: 0.75rem 0 0.4rem; }
  .state-display {
    display: flex; align-items: center; gap: 0.75rem; border: 2px solid;
    border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; transition: all 0.3s;
  }
  .state-icon { font-size: 1.6rem; }
  .state-label { font-weight: 700; font-size: 1rem; }
  .state-desc { font-size: 0.82rem; color: #6b7280; margin-top: 0.1rem; }
  .amount-display { margin-left: auto; text-align: right; }
  .amount-label { font-size: 0.72rem; color: #94a3b8; }
  .amount-value { font-size: 1.2rem; font-weight: 700; color: #374151; }
  .state-flow { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 1rem; font-size: 0.78rem; flex-wrap: wrap; }
  .flow-state {
    padding: 0.25rem 0.6rem; border-radius: 20px; background: #f1f5f9; color: #6b7280;
    transition: all 0.2s;
  }
  .flow-state.active { background: var(--c); color: white; font-weight: 700; }
  .flow-arr { color: #cbd5e1; }
  .control-section { margin-bottom: 1rem; }
  .coin-btns { display: flex; gap: 0.5rem; }
  .coin-btn {
    flex: 1; padding: 0.5rem; background: #fbbf24; color: white; border: none;
    border-radius: 50%; font-weight: 700; cursor: pointer; font-size: 0.85rem; aspect-ratio: 1;
    transition: opacity 0.15s;
  }
  .coin-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
  .item-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .item-btn {
    display: flex; flex-direction: column; align-items: center; padding: 0.6rem;
    background: white; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer;
    transition: all 0.15s; font-size: 0.85rem;
  }
  .item-btn:not(:disabled):hover { border-color: #10b981; background: #f0fdf4; }
  .item-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .item-emoji { font-size: 1.4rem; }
  .item-name { font-weight: 600; font-size: 0.82rem; margin: 0.1rem 0; }
  .item-price { font-size: 0.78rem; color: #6b7280; }
  .bottom-btns { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
  .btn-dispense { flex: 2; background: #10b981; color: white; border: none; padding: 0.6rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
  .btn-dispense:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
  .btn-cancel { flex: 1; background: white; border: 1px solid #e2e8f0; padding: 0.6rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; color: #6b7280; }
  .btn-cancel:disabled { opacity: 0.4; cursor: not-allowed; }
  .event-log { list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto; }
  .event-log li { padding: 0.35rem 0.5rem; font-size: 0.82rem; border-radius: 5px; margin-bottom: 0.3rem; }
  .event-log li.info { background: #f1f5f9; color: #374151; }
  .event-log li.error { background: #fff1f2; color: #991b1b; }
  .event-log li.success { background: #f0fdf4; color: #166534; }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  .state-table { margin-top: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  th { background: #f1f5f9; padding: 0.4rem 0.5rem; text-align: center; }
  td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #e2e8f0; text-align: center; }
  td:first-child { text-align: left; font-weight: 600; }
  tr.highlight { background: #f0fdf4; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
