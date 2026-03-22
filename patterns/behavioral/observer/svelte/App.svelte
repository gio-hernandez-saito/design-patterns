<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Observer 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   $state currentNews           → ConcreteSubject (NewsAgency) 상태
  //   subscribers ($state 배열)    → Observer 목록
  //   $effect                      → 구독자들이 상태 변화를 자동으로 감지하는 메커니즘
  //   receivedNews (각 구독자)      → ConcreteObserver의 update() 호출 결과
  //
  // 핵심 아이디어:
  //   TypeScript에서는 Subject.notify()가 구독자들의 update()를 명시적으로 호출했지만,
  //   Svelte의 $effect는 $state 변화를 자동으로 감지해 구독자에게 알림을 보내는
  //   반응형 Observer 패턴을 자연스럽게 표현한다.
  //   $effect = 자동 구독 + 자동 알림의 조합이다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── ConcreteSubject: 뉴스 발행자 상태 ────────────────────────────────────
  // TypeScript의 NewsAgency 클래스가 가지던 상태를 $state로 관리
  let currentHeadline = $state('')
  let currentBody = $state('')
  let publishCount = $state(0)

  // ── Observer 구독자 타입 ──────────────────────────────────────────────────
  interface Subscriber {
    id: number
    name: string
    type: 'email' | 'mobile' | 'web'
    icon: string
    active: boolean
    // 수신한 뉴스 이력 (ConcreteObserver의 receivedNews)
    inbox: Array<{ headline: string; body: string; receivedAt: string }>
  }

  // ── $state: 구독자 목록 (Subject의 subscribers Set에 해당) ────────────────
  let subscribers = $state<Subscriber[]>([
    { id: 1, name: '홍길동 (이메일)', type: 'email',  icon: '📧', active: true,  inbox: [] },
    { id: 2, name: '김철수 (모바일)', type: 'mobile', icon: '📱', active: true,  inbox: [] },
    { id: 3, name: '이영희 (웹)',     type: 'web',    icon: '🌐', active: false, inbox: [] },
  ])

  // ── $effect: Observer 패턴의 핵심 — 상태 변화 시 자동으로 알림 ───────────
  // TypeScript의 notify() 메서드 호출과 동일한 효과를 $effect로 구현한다.
  // currentHeadline이 바뀌면 이 effect가 자동으로 실행된다 → 자동 notify!
  $effect(() => {
    if (!currentHeadline) return

    // 활성 구독자들에게만 알림 전달 (TypeScript의 subscriber.update() 호출에 해당)
    const time = new Date().toLocaleTimeString()
    subscribers = subscribers.map(sub => {
      if (!sub.active) return sub
      // ConcreteObserver의 update() 메서드 실행
      return {
        ...sub,
        inbox: [
          { headline: currentHeadline, body: currentBody, receivedAt: time },
          ...sub.inbox,
        ],
      }
    })
  })

  // ── 발행 함수 (Subject.publish()) ─────────────────────────────────────────
  function publish(headline: string, body: string) {
    if (!headline) return
    currentHeadline = headline
    currentBody = body
    publishCount++
  }

  // 구독/해제 (Subject.subscribe() / unsubscribe())
  function toggleSubscription(id: number) {
    subscribers = subscribers.map(sub =>
      sub.id === id ? { ...sub, active: !sub.active } : sub
    )
  }

  // 새 구독자 추가
  let newSubName = $state('')
  let newSubType = $state<'email' | 'mobile' | 'web'>('email')
  const typeIcons = { email: '📧', mobile: '📱', web: '🌐' }

  function addSubscriber() {
    if (!newSubName) return
    subscribers = [...subscribers, {
      id: Date.now(),
      name: newSubName,
      type: newSubType,
      icon: typeIcons[newSubType],
      active: true,
      inbox: [],
    }]
    newSubName = ''
  }

  // 샘플 뉴스 데이터
  const sampleNews = [
    { headline: '🚀 Svelte 5 정식 출시!', body: 'Runes 시스템으로 반응형 프로그래밍이 더 간단해졌습니다.' },
    { headline: '🌏 AI 기술 혁신 발표', body: '새로운 언어 모델이 프로그래밍 생산성을 3배 향상시킵니다.' },
    { headline: '📊 디자인 패턴의 부활', body: 'GoF 패턴이 현대 프레임워크와 어떻게 결합되는지 알아보세요.' },
  ]

  let headline = $state(sampleNews[0].headline)
  let body = $state(sampleNews[0].body)
  let selectedSub = $state<number | null>(null)
</script>

<main>
  <h1>Observer 패턴</h1>
  <p class="desc">
    <code>$effect</code>가 <code>$state</code> 변화를 감지해 구독자들에게 자동으로 알림을 보낸다.
    이것이 Svelte의 반응형 Observer 패턴이다.
  </p>

  <div class="layout">
    <!-- Subject: 뉴스 발행 -->
    <section class="card">
      <h2>Subject — 뉴스 발행사 (ConcreteSubject)</h2>

      <div class="sample-btns">
        {#each sampleNews as news}
          <button class="sample-btn" onclick={() => { headline = news.headline; body = news.body }}>
            {news.headline.slice(0, 12)}...
          </button>
        {/each}
      </div>

      <label>헤드라인: <input bind:value={headline} placeholder="뉴스 제목" /></label>
      <label>내용: <textarea bind:value={body} rows="2" placeholder="뉴스 본문"></textarea></label>

      <button class="btn-publish" onclick={() => publish(headline, body)}>
        📢 발행 (notify 자동 실행)
      </button>
      <div class="publish-count">총 발행 횟수: <strong>{publishCount}</strong>번</div>

      <!-- 구독자 관리 -->
      <h3>구독자 관리</h3>
      <div class="subscriber-list">
        {#each subscribers as sub}
          <div class="sub-item" class:inactive={!sub.active}>
            <span>{sub.icon} {sub.name}</span>
            <div class="sub-right">
              <span class="inbox-count">{sub.inbox.length}개</span>
              <button
                class="toggle-btn"
                class:subscribed={sub.active}
                onclick={() => toggleSubscription(sub.id)}
              >
                {sub.active ? '구독 중' : '구독 해제됨'}
              </button>
            </div>
          </div>
        {/each}
      </div>

      <!-- 새 구독자 추가 -->
      <div class="add-sub">
        <input bind:value={newSubName} placeholder="새 구독자 이름" />
        <select bind:value={newSubType}>
          <option value="email">이메일</option>
          <option value="mobile">모바일</option>
          <option value="web">웹</option>
        </select>
        <button class="btn-add" onclick={addSubscriber}>추가</button>
      </div>
    </section>

    <!-- Observer: 구독자 받은 편지함 -->
    <section class="card">
      <h2>Observer — 구독자 받은 편지함</h2>
      <div class="sub-tabs">
        {#each subscribers as sub}
          <button
            class="sub-tab"
            class:active={selectedSub === sub.id}
            class:inactive={!sub.active}
            onclick={() => selectedSub = selectedSub === sub.id ? null : sub.id}
          >
            {sub.icon} {sub.inbox.length}
          </button>
        {/each}
      </div>

      {#if selectedSub !== null}
        {@const sub = subscribers.find(s => s.id === selectedSub)}
        {#if sub}
          <div class="inbox-header">
            {sub.icon} <strong>{sub.name}</strong>
            <span class="status-tag" class:active={sub.active}>{sub.active ? '구독 중' : '해제됨'}</span>
          </div>
          {#if sub.inbox.length === 0}
            <p class="empty">수신된 뉴스 없음</p>
          {:else}
            <ul class="inbox">
              {#each sub.inbox as news}
                <li>
                  <div class="news-headline">{news.headline}</div>
                  <div class="news-body">{news.body}</div>
                  <div class="news-time">{news.receivedAt}</div>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      {:else}
        <p class="empty">탭을 클릭해 구독자의 받은 편지함을 확인하세요</p>
        <div class="all-inboxes">
          {#each subscribers as sub}
            <div class="inbox-summary" class:inactive={!sub.active}>
              <span>{sub.icon} {sub.name}</span>
              <span class="inbox-count">{sub.inbox.length}개 수신</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>notify()</code>가 구독자 루프를 돌며 <code>update()</code> 명시 호출</li>
      <li><strong>Svelte:</strong> <code>$effect</code>가 <code>$state</code> 변화를 자동 감지 → Observer 패턴 내장</li>
      <li><strong>핵심:</strong> Svelte의 반응형 시스템 자체가 Observer 패턴을 구현하고 있다</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #dc2626; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.88rem; color: #374151; margin-top: 1rem; margin-bottom: 0.5rem; }
  .sample-btns { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
  .sample-btn { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.3rem 0.6rem; border-radius: 5px; cursor: pointer; font-size: 0.78rem; }
  .sample-btn:hover { background: #e2e8f0; }
  label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.88rem; color: #374151; margin-bottom: 0.6rem; }
  input, select, textarea { padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; resize: vertical; }
  .btn-publish { background: #dc2626; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; width: 100%; }
  .btn-publish:hover { background: #b91c1c; }
  .publish-count { font-size: 0.82rem; color: #6b7280; margin-top: 0.4rem; text-align: right; }
  .subscriber-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem; }
  .sub-item {
    display: flex; justify-content: space-between; align-items: center;
    background: white; border: 1px solid #e2e8f0; border-radius: 7px; padding: 0.5rem 0.75rem; font-size: 0.85rem;
  }
  .sub-item.inactive { opacity: 0.5; }
  .sub-right { display: flex; align-items: center; gap: 0.5rem; }
  .inbox-count { font-size: 0.78rem; color: #6b7280; background: #f1f5f9; padding: 0.1rem 0.4rem; border-radius: 10px; }
  .toggle-btn { font-size: 0.78rem; padding: 0.2rem 0.6rem; border-radius: 5px; cursor: pointer; border: 1px solid #e2e8f0; background: white; }
  .toggle-btn.subscribed { background: #dcfce7; border-color: #86efac; color: #166534; }
  .add-sub { display: flex; gap: 0.4rem; }
  .add-sub input { flex: 1; }
  .btn-add { background: #374151; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  .sub-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .sub-tab {
    padding: 0.35rem 0.8rem; border: 2px solid #e2e8f0; border-radius: 20px;
    background: white; cursor: pointer; font-size: 0.85rem; transition: all 0.15s;
  }
  .sub-tab.active { border-color: #dc2626; background: #fef2f2; }
  .sub-tab.inactive { opacity: 0.5; }
  .inbox-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.9rem; }
  .status-tag { font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 10px; background: #e2e8f0; color: #6b7280; }
  .status-tag.active { background: #dcfce7; color: #166534; }
  .inbox { list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto; }
  .inbox li { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.6rem 0.75rem; margin-bottom: 0.5rem; }
  .news-headline { font-weight: 600; font-size: 0.88rem; color: #374151; }
  .news-body { font-size: 0.82rem; color: #6b7280; margin-top: 0.2rem; }
  .news-time { font-size: 0.75rem; color: #94a3b8; margin-top: 0.3rem; }
  .all-inboxes { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.5rem; }
  .inbox-summary {
    display: flex; justify-content: space-between; background: white;
    border: 1px solid #e2e8f0; border-radius: 7px; padding: 0.5rem 0.75rem; font-size: 0.85rem;
  }
  .inbox-summary.inactive { opacity: 0.5; }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
