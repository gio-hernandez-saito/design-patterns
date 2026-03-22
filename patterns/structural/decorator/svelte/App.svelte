<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Decorator 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   baseBevarage ($state)     → ConcreteComponent (기본 음료)
  //   toppings ($state Set)     → ConcreteDecorator들의 선택 상태
  //   $derived 계산값           → 데코레이터 체인이 누적한 결과 (설명 + 가격)
  //   wrapper 컴포넌트 개념     → snippet으로 시각적 데코레이터 레이어 표현
  //
  // 핵심 아이디어:
  //   TypeScript에서는 new Milk(new Syrup(new Espresso()))처럼 클래스 래핑으로 구현했지만,
  //   Svelte에서는 $state로 선택된 토핑 Set을 $derived로 누적 계산하는 방식으로 구현한다.
  //   각 토핑이 이전 결과에 가격과 설명을 "추가"하는 데코레이터 체인과 동일하게 동작한다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── ConcreteComponent: 기본 음료 정의 ────────────────────────────────────
  const beverages: Record<string, { name: string; cost: number; emoji: string }> = {
    espresso:  { name: '에스프레소',   cost: 1500, emoji: '☕' },
    drip:      { name: '드립 커피',    cost: 1200, emoji: '☕' },
    decaf:     { name: '디카페인',     cost: 1700, emoji: '☕' },
  }

  // ── ConcreteDecorator: 토핑 정의 ─────────────────────────────────────────
  // 각 토핑이 description과 cost를 "추가"하는 데코레이터다
  const toppingDefs: Array<{ id: string; name: string; cost: number; emoji: string }> = [
    { id: 'milk',      name: '우유',          cost: 300,  emoji: '🥛' },
    { id: 'syrup',     name: '바닐라 시럽',   cost: 500,  emoji: '🍯' },
    { id: 'whip',      name: '휘핑크림',      cost: 600,  emoji: '🍦' },
    { id: 'shot',      name: '샷 추가',       cost: 400,  emoji: '💪' },
    { id: 'soy',       name: '두유',          cost: 500,  emoji: '🌱' },
    { id: 'chocolate', name: '초콜릿 시럽',   cost: 500,  emoji: '🍫' },
  ]

  // ── $state: 현재 선택 상태 ───────────────────────────────────────────────
  let selectedBeverage = $state('espresso')
  // Set을 $state로 관리: 토핑 추가/제거가 반응형으로 동작
  let selectedToppings = $state<Set<string>>(new Set())

  // ── $derived: 데코레이터 체인 결과 자동 계산 ─────────────────────────────
  // TypeScript의 데코레이터 체인:
  //   new WhipCream(new Milk(new Espresso())).getDescription()
  //   new WhipCream(new Milk(new Espresso())).getCost()
  // Svelte에서는 $derived로 동일하게 누적 계산:
  let orderSummary = $derived.by(() => {
    const base = beverages[selectedBeverage]
    let description = base.name
    let cost = base.cost

    // 선택된 토핑을 순서대로 적용 (데코레이터 체인과 동일)
    for (const toppingId of selectedToppings) {
      const topping = toppingDefs.find(t => t.id === toppingId)
      if (!topping) continue
      description += ` + ${topping.name}`  // 데코레이터의 getDescription()
      cost += topping.cost                   // 데코레이터의 getCost()
    }

    return { description, cost, count: selectedToppings.size }
  })

  function toggleTopping(id: string) {
    const next = new Set(selectedToppings)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedToppings = next
  }

  // 주문 이력
  let orders = $state<Array<{ desc: string; cost: number }>>([])

  function placeOrder() {
    orders = [
      { desc: orderSummary.description, cost: orderSummary.cost },
      ...orders,
    ]
  }

  // 체인 시각화: 어떻게 누적되는지 보여주기
  let decoratorChain = $derived.by(() => {
    const base = beverages[selectedBeverage]
    const steps: Array<{ label: string; cost: number; cumulative: number }> = [
      { label: base.name, cost: base.cost, cumulative: base.cost },
    ]
    let cum = base.cost
    for (const toppingId of selectedToppings) {
      const t = toppingDefs.find(t => t.id === toppingId)
      if (!t) continue
      cum += t.cost
      steps.push({ label: `+ ${t.name}`, cost: t.cost, cumulative: cum })
    }
    return steps
  })
</script>

<main>
  <h1>Decorator 패턴</h1>
  <p class="desc">
    기본 음료(<strong>ConcreteComponent</strong>)에 토핑(<strong>Decorator</strong>)을 쌓아 올린다.
    각 토핑은 이전 가격에 자신의 가격을 더하고 설명을 추가한다.
  </p>

  <div class="layout">
    <!-- 주문 빌더 -->
    <section class="card">
      <h2>음료 선택 (ConcreteComponent)</h2>
      <div class="beverage-grid">
        {#each Object.entries(beverages) as [id, b]}
          <button
            class="bev-btn"
            class:active={selectedBeverage === id}
            onclick={() => (selectedBeverage = id)}
          >
            {b.emoji} {b.name}<br />
            <span class="price">{b.cost.toLocaleString()}원</span>
          </button>
        {/each}
      </div>

      <h2>토핑 선택 (Decorator 추가)</h2>
      <div class="toppings-grid">
        {#each toppingDefs as topping}
          <button
            class="topping-btn"
            class:active={selectedToppings.has(topping.id)}
            onclick={() => toggleTopping(topping.id)}
          >
            {topping.emoji} {topping.name}
            <span class="price">+{topping.cost.toLocaleString()}원</span>
          </button>
        {/each}
      </div>
    </section>

    <!-- 데코레이터 체인 시각화 + 주문 결과 -->
    <section class="card">
      <h2>데코레이터 체인 (누적 과정)</h2>
      <div class="chain">
        {#each decoratorChain as step, i}
          <div class="chain-step">
            <div class="chain-label">
              {#if i === 0}
                <span class="base-badge">BASE</span>
              {:else}
                <span class="decorator-badge">DECORATOR</span>
              {/if}
              {step.label}
            </div>
            <div class="chain-cost">
              {#if i > 0}+{step.cost}원 →{/if}
              <strong>{step.cumulative.toLocaleString()}원</strong>
            </div>
          </div>
          {#if i < decoratorChain.length - 1}
            <div class="chain-arrow">↓ 감싸기(wrap)</div>
          {/if}
        {/each}
      </div>

      <!-- 최종 주문 결과 -->
      <div class="order-result">
        <div class="order-desc">{orderSummary.description}</div>
        <div class="order-price">{orderSummary.cost.toLocaleString()}원</div>
        <button class="btn-order" onclick={placeOrder}>주문하기</button>
      </div>

      {#if orders.length > 0}
        <h3>주문 이력</h3>
        <ul class="order-history">
          {#each orders as order}
            <li>
              <span class="hist-desc">{order.desc}</span>
              <span class="hist-price">{order.cost.toLocaleString()}원</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>new WhipCream(new Milk(new Espresso()))</code> 클래스 중첩으로 데코레이터 체인 구성</li>
      <li><strong>Svelte:</strong> <code>$state</code> Set으로 선택된 토핑을 <code>$derived</code>로 누적 계산</li>
      <li><strong>시각화:</strong> Svelte snippet으로 데코레이터 레이어를 시각적으로 표현 가능</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #d97706; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.88rem; color: #374151; margin-top: 1rem; }
  .beverage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1.25rem; }
  .bev-btn {
    padding: 0.6rem 0.5rem; border: 2px solid #e2e8f0; border-radius: 8px;
    background: white; cursor: pointer; font-size: 0.85rem; text-align: center; transition: all 0.15s;
  }
  .bev-btn.active { border-color: #d97706; background: #fffbeb; }
  .toppings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .topping-btn {
    padding: 0.5rem 0.6rem; border: 2px solid #e2e8f0; border-radius: 7px;
    background: white; cursor: pointer; font-size: 0.82rem; display: flex;
    justify-content: space-between; align-items: center; transition: all 0.15s;
  }
  .topping-btn.active { border-color: #f59e0b; background: #fffbeb; }
  .price { font-size: 0.78rem; color: #6b7280; display: block; margin-top: 0.15rem; }
  .chain { display: flex; flex-direction: column; gap: 0; }
  .chain-step {
    display: flex; justify-content: space-between; align-items: center;
    background: white; border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 0.5rem 0.75rem; font-size: 0.85rem;
  }
  .chain-label { display: flex; align-items: center; gap: 0.5rem; }
  .chain-cost { font-size: 0.82rem; color: #374151; }
  .chain-arrow { text-align: center; color: #94a3b8; font-size: 0.78rem; padding: 0.15rem 0; }
  .base-badge { background: #dbeafe; color: #1d4ed8; font-size: 0.72rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; }
  .decorator-badge { background: #fef3c7; color: #b45309; font-size: 0.72rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; }
  .order-result {
    margin-top: 1rem; background: #1e293b; color: white; border-radius: 10px;
    padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;
  }
  .order-desc { font-size: 0.9rem; }
  .order-price { font-size: 1.4rem; font-weight: 700; color: #fbbf24; }
  .btn-order {
    background: #f59e0b; color: white; border: none; padding: 0.5rem 1rem;
    border-radius: 6px; cursor: pointer; font-size: 0.9rem; align-self: flex-start;
  }
  .btn-order:hover { background: #d97706; }
  .order-history { list-style: none; padding: 0; margin: 0; font-size: 0.82rem; }
  .order-history li { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #e2e8f0; }
  .hist-desc { color: #374151; }
  .hist-price { font-weight: 600; color: #d97706; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
