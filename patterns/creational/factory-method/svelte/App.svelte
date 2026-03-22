<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Factory Method 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   NotificationType ($state) → ConcreteCreator 선택 상태
  //   createNotification()      → Factory Method (어떤 Product를 만들지 결정)
  //   notificationConfig        → Product (알림 설정 객체)
  //   $derived로 계산된 결과   → Creator.notify() 호출 결과
  //
  // 핵심 아이디어:
  //   TypeScript에서는 추상 클래스와 서브클래스로 팩토리를 구현했지만,
  //   Svelte에서는 $state로 선택된 타입에 따라 $derived가 동적으로
  //   다른 "Product" 설정을 계산하는 방식으로 Factory Method를 표현한다.
  //   <svelte:component>를 쓰면 동적 컴포넌트 선택도 가능하다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Product 타입 정의 ─────────────────────────────────────────────────────
  type NotificationType = 'email' | 'sms' | 'push'

  interface NotificationConfig {
    channel: NotificationType
    label: string
    icon: string
    color: string
    // Factory Method가 생성하는 "send" 로직
    send: (recipient: string, message: string) => string
  }

  // ── ConcreteCreator: 팩토리 함수 (Factory Method 역할) ──────────────────
  // 어떤 타입을 선택하느냐에 따라 다른 Product(설정+동작)를 반환한다.
  // TypeScript의 createNotification() 추상 메서드에 해당한다.
  function createNotification(type: NotificationType): NotificationConfig {
    // 각 case가 ConcreteCreator 하나에 해당한다
    switch (type) {
      case 'email':
        return {
          channel: 'email',
          label: '이메일',
          icon: '📧',
          color: '#3b82f6',
          send: (recipient, message) => `[Email → ${recipient}] ${message}`,
        }
      case 'sms':
        return {
          channel: 'sms',
          label: 'SMS',
          icon: '📱',
          color: '#10b981',
          send: (recipient, message) => `[SMS → ${recipient}] ${message}`,
        }
      case 'push':
        return {
          channel: 'push',
          label: '푸시 알림',
          icon: '🔔',
          color: '#f59e0b',
          send: (recipient, message) => `[Push → ${recipient}] ${message}`,
        }
    }
  }

  // ── $state: 현재 선택된 Creator 타입 ─────────────────────────────────────
  let selectedType = $state<NotificationType>('email')
  let recipient = $state('user@example.com')
  let message = $state('안녕하세요! 새로운 알림입니다.')

  // ── $derived: Factory Method 결과 (Product 생성) ─────────────────────────
  // selectedType이 바뀔 때마다 Factory Method를 다시 호출해 새 Product를 얻는다.
  // 이것이 Svelte에서 Factory Method의 핵심: $derived가 자동으로 재계산한다.
  let notification = $derived(createNotification(selectedType))

  // 전송 결과 이력
  let results = $state<Array<{ icon: string; text: string; color: string }>>([])

  function sendNotification() {
    if (!recipient || !message) return
    const result = notification.send(recipient, message)
    results = [
      { icon: notification.icon, text: result, color: notification.color },
      ...results,
    ]
  }

  // 모든 채널로 동시 전송 (Factory Method의 유연성 시연)
  function sendAll() {
    const types: NotificationType[] = ['email', 'sms', 'push']
    const newResults = types.map((type) => {
      const n = createNotification(type)
      return { icon: n.icon, text: n.send(recipient, message), color: n.color }
    })
    results = [...newResults, ...results]
  }
</script>

<main>
  <h1>Factory Method 패턴</h1>
  <p class="desc">
    <code>createNotification(type)</code>이 팩토리 메서드 역할을 한다.
    선택된 타입에 따라 다른 알림 Product를 생성하고, <code>$derived</code>로 자동 반응한다.
  </p>

  <div class="layout">
    <!-- Creator 선택 (ConcreteCreator 선택) -->
    <section class="card">
      <h2>Creator 선택 (알림 채널)</h2>
      <div class="type-buttons">
        {#each (['email', 'sms', 'push'] as NotificationType[]) as type}
          {@const config = createNotification(type)}
          <button
            class="type-btn"
            class:active={selectedType === type}
            style="--color: {config.color}"
            onclick={() => (selectedType = type)}
          >
            {config.icon} {config.label}
          </button>
        {/each}
      </div>

      <!-- 현재 Product 정보 -->
      <div class="product-info" style="border-color: {notification.color}">
        <div class="product-icon">{notification.icon}</div>
        <div>
          <div class="product-label" style="color: {notification.color}">
            {notification.label} 알림 생성됨
          </div>
          <div class="product-channel">채널: <code>{notification.channel}</code></div>
        </div>
      </div>

      <!-- 알림 설정 -->
      <label>
        수신자:
        <input bind:value={recipient} placeholder="수신자 주소/번호/토큰" />
      </label>
      <label>
        메시지:
        <textarea bind:value={message} rows="2" placeholder="전송할 메시지"></textarea>
      </label>
      <div class="btn-row">
        <button class="btn-primary" style="background: {notification.color}" onclick={sendNotification}>
          {notification.icon} 전송
        </button>
        <button class="btn-secondary" onclick={sendAll}>모든 채널로 전송</button>
      </div>
    </section>

    <!-- 전송 결과 -->
    <section class="card">
      <h2>전송 결과</h2>
      {#if results.length === 0}
        <p class="empty">아직 전송된 알림이 없습니다</p>
      {:else}
        <ul class="results">
          {#each results as result}
            <li style="border-left-color: {result.color}">
              <span>{result.icon}</span>
              <span class="result-text">{result.text}</span>
            </li>
          {/each}
        </ul>
        <button class="btn-clear" onclick={() => (results = [])}>결과 지우기</button>
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> 추상 클래스 <code>NotificationCreator</code> + 서브클래스(<code>EmailCreator</code> 등)로 팩토리 구현</li>
      <li><strong>Svelte:</strong> <code>createNotification(type)</code> 함수가 팩토리 메서드 역할, <code>$derived</code>로 선택이 바뀔 때 자동 재생성</li>
      <li><strong>동적 컴포넌트:</strong> <code>&lt;svelte:component this=&#123;comp&#125; /&gt;</code>로 UI 컴포넌트도 Factory 방식으로 선택 가능</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #7c3aed; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.9rem; color: #374151; }
  .type-buttons { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .type-btn {
    padding: 0.5rem 1rem;
    border: 2px solid var(--color, #94a3b8);
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.15s;
  }
  .type-btn.active { background: var(--color, #94a3b8); color: white; }
  .product-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    transition: border-color 0.2s;
  }
  .product-icon { font-size: 2rem; }
  .product-label { font-weight: 600; font-size: 1rem; }
  .product-channel { font-size: 0.85rem; color: #6b7280; margin-top: 0.2rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; color: #374151; margin-bottom: 0.75rem; }
  input, textarea { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; resize: vertical; }
  .btn-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .btn-primary { color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: opacity 0.15s; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-secondary { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
  .btn-clear { margin-top: 0.75rem; background: transparent; border: 1px solid #e2e8f0; padding: 0.35rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; color: #94a3b8; }
  .results { list-style: none; padding: 0; margin: 0; }
  .results li { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.5rem 0.75rem; border-left: 3px solid; margin-bottom: 0.5rem; background: white; border-radius: 0 6px 6px 0; font-size: 0.85rem; }
  .result-text { word-break: break-all; }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.82rem; }
  .explanation { margin-top: 2rem; background: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
