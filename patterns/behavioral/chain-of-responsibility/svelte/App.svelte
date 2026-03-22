<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Chain of Responsibility 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   ValidationHandler 타입      → Handler 추상 클래스
  //   handlers 배열 ($state)      → ConcreteHandler 체인 구성
  //   runChain()                  → chain의 첫 번째 handle() 호출
  //   $derived chainResult        → 체인 실행 결과 자동 계산
  //
  // 핵심 아이디어:
  //   TypeScript에서는 SupportHandler 클래스에 setNext()로 체인을 구성했지만,
  //   Svelte에서는 핸들러 함수 배열을 $state로 관리하고,
  //   각 핸들러가 처리 여부를 반환해 다음 핸들러로 넘길지 결정한다.
  //   폼 검증 체인을 예시로 패턴을 시연한다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Handler 타입 정의 ─────────────────────────────────────────────────────
  type HandlerResult = { handled: boolean; passed: boolean; message: string; handlerName: string }

  interface ValidationHandler {
    name: string
    enabled: boolean
    // handle(): 처리 가능하면 결과 반환, 다음으로 넘기면 null
    handle: (value: string) => HandlerResult | null
  }

  // ── ConcreteHandler들: 폼 검증 체인 ─────────────────────────────────────

  // Handler 1: 빈값 검사
  function createEmptyHandler(): ValidationHandler {
    return {
      name: '빈값 검사',
      enabled: true,
      handle(value) {
        if (!value.trim()) {
          return { handled: true, passed: false, message: '값이 비어있습니다.', handlerName: this.name }
        }
        return null // 다음 핸들러로 넘김
      },
    }
  }

  // Handler 2: 길이 검사
  function createLengthHandler(min: number, max: number): ValidationHandler {
    return {
      name: `길이 검사 (${min}~${max}자)`,
      enabled: true,
      handle(value) {
        if (value.length < min) {
          return { handled: true, passed: false, message: `최소 ${min}자 이상이어야 합니다.`, handlerName: this.name }
        }
        if (value.length > max) {
          return { handled: true, passed: false, message: `최대 ${max}자 이하여야 합니다.`, handlerName: this.name }
        }
        return null
      },
    }
  }

  // Handler 3: 패턴 검사 (이메일 형식)
  function createPatternHandler(pattern: RegExp, errorMsg: string): ValidationHandler {
    return {
      name: '이메일 형식 검사',
      enabled: true,
      handle(value) {
        if (!pattern.test(value)) {
          return { handled: true, passed: false, message: errorMsg, handlerName: this.name }
        }
        return null
      },
    }
  }

  // Handler 4: 도메인 금지 목록
  function createBlocklistHandler(blocked: string[]): ValidationHandler {
    return {
      name: '금지 도메인 검사',
      enabled: true,
      handle(value) {
        const domain = value.split('@')[1] ?? ''
        if (blocked.some(b => domain.includes(b))) {
          return { handled: true, passed: false, message: `${domain}은 허용되지 않는 도메인입니다.`, handlerName: this.name }
        }
        return null
      },
    }
  }

  // Handler 5: 최종 통과
  function createPassHandler(): ValidationHandler {
    return {
      name: '최종 승인',
      enabled: true,
      handle(_value) {
        return { handled: true, passed: true, message: '모든 검증을 통과했습니다!', handlerName: this.name }
      },
    }
  }

  // ── $state: 체인 구성 ──────────────────────────────────────────────────────
  // TypeScript의 handler.setNext(next).setNext(next) 체이닝에 해당
  let handlers = $state<ValidationHandler[]>([
    createEmptyHandler(),
    createLengthHandler(5, 50),
    createPatternHandler(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '올바른 이메일 형식이 아닙니다.'),
    createBlocklistHandler(['spam.com', 'test.test']),
    createPassHandler(),
  ])

  // ── 입력값 ────────────────────────────────────────────────────────────────
  let inputValue = $state('')
  const samples = [
    { label: '빈값', value: '' },
    { label: '짧음', value: 'ab' },
    { label: '형식오류', value: 'notanemail' },
    { label: '스팸도메인', value: 'user@spam.com' },
    { label: '정상', value: 'user@example.com' },
  ]

  // ── $derived: 체인 실행 결과 ───────────────────────────────────────────────
  // TypeScript의 chain.handle(ticket)에 해당 — inputValue가 바뀔 때마다 자동 재실행
  let chainTrace = $derived.by(() => {
    const trace: HandlerResult[] = []
    for (const handler of handlers) {
      if (!handler.enabled) continue
      const result = handler.handle(inputValue)
      if (result) {
        trace.push(result)
        break // 핸들러가 처리했으면 체인 중단
      } else {
        // 처리하지 않고 다음으로 넘김
        trace.push({ handled: false, passed: true, message: '다음 핸들러로 전달', handlerName: handler.name })
      }
    }
    return trace
  })

  let finalResult = $derived(chainTrace.at(-1))
</script>

<main>
  <h1>Chain of Responsibility 패턴</h1>
  <p class="desc">
    각 검증 핸들러가 처리할 수 없으면 다음 핸들러로 요청을 전달한다.
    <code>$derived</code>로 입력값이 바뀔 때마다 체인이 자동으로 재실행된다.
  </p>

  <div class="layout">
    <!-- 입력 + 체인 구성 -->
    <section class="card">
      <h2>요청 (입력값)</h2>
      <input
        class="main-input"
        bind:value={inputValue}
        placeholder="이메일 주소를 입력하세요..."
      />

      <div class="samples">
        {#each samples as s}
          <button class="sample-btn" onclick={() => (inputValue = s.value)}>
            {s.label}
          </button>
        {/each}
      </div>

      <!-- 체인 구성 (핸들러 활성화/비활성화) -->
      <h3>체인 구성 (Handler 목록)</h3>
      <div class="handler-list">
        {#each handlers as handler, i}
          <div class="handler-item" class:disabled={!handler.enabled}>
            <span class="handler-num">{i + 1}</span>
            <span class="handler-name">{handler.name}</span>
            <button
              class="toggle-handler"
              class:active={handler.enabled}
              onclick={() => { handler.enabled = !handler.enabled }}
            >
              {handler.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {#if i < handlers.length - 1}
            <div class="chain-connector" class:disabled={!handler.enabled}>↓ 통과 시</div>
          {/if}
        {/each}
      </div>
    </section>

    <!-- 체인 실행 추적 -->
    <section class="card">
      <h2>체인 실행 추적</h2>
      {#if !inputValue && chainTrace.length === 0}
        <p class="empty">입력값을 입력하면 체인이 실행됩니다</p>
      {:else}
        <div class="trace">
          {#each chainTrace as step}
            <div class="trace-step" class:pass={step.handled && step.passed} class:fail={step.handled && !step.passed} class:skip={!step.handled}>
              <div class="trace-header">
                <span class="handler-tag">{step.handlerName}</span>
                {#if step.handled}
                  <span class="handled-badge" class:pass={step.passed} class:fail={!step.passed}>
                    {step.passed ? '✓ 통과' : '✗ 거부'}
                  </span>
                {:else}
                  <span class="skip-badge">→ 다음으로</span>
                {/if}
              </div>
              <div class="trace-msg">{step.message}</div>
            </div>
            {#if !step.handled || !chainTrace.at(-1)?.handled}
              <div class="trace-arrow">↓</div>
            {/if}
          {/each}
        </div>

        <!-- 최종 결과 -->
        {#if finalResult?.handled}
          <div class="final-result" class:pass={finalResult.passed} class:fail={!finalResult.passed}>
            {finalResult.passed ? '✅ 검증 통과!' : '❌ 검증 실패'}
            <div class="final-msg">{finalResult.message}</div>
          </div>
        {/if}
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>SupportHandler</code> 추상 클래스 + <code>setNext()</code>로 체인 연결</li>
      <li><strong>Svelte:</strong> 핸들러 함수 배열을 순서대로 실행, <code>null</code> 반환 시 다음으로 전달</li>
      <li><strong>반응형:</strong> <code>$derived</code>로 입력값 변경 시 체인 자동 재실행</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #f59e0b; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.88rem; color: #374151; margin-top: 1rem; margin-bottom: 0.5rem; }
  .main-input {
    width: 100%; box-sizing: border-box; padding: 0.5rem 0.75rem;
    border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; margin-bottom: 0.75rem;
  }
  .samples { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .sample-btn {
    background: white; border: 1px solid #e2e8f0; padding: 0.3rem 0.6rem;
    border-radius: 5px; cursor: pointer; font-size: 0.78rem;
  }
  .sample-btn:hover { background: #f1f5f9; }
  .handler-list { display: flex; flex-direction: column; }
  .handler-item {
    display: flex; align-items: center; gap: 0.5rem; background: white;
    border: 1px solid #e2e8f0; border-radius: 7px; padding: 0.45rem 0.6rem; font-size: 0.85rem;
  }
  .handler-item.disabled { opacity: 0.4; }
  .handler-num { width: 20px; height: 20px; background: #f59e0b; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; }
  .handler-name { flex: 1; }
  .toggle-handler { font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px; cursor: pointer; border: 1px solid #e2e8f0; background: #f1f5f9; color: #6b7280; }
  .toggle-handler.active { background: #dcfce7; border-color: #86efac; color: #166534; }
  .chain-connector { text-align: center; font-size: 0.72rem; color: #94a3b8; padding: 0.1rem 0; }
  .chain-connector.disabled { opacity: 0.4; }
  .trace { display: flex; flex-direction: column; }
  .trace-step {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.75rem; background: white;
  }
  .trace-step.pass { border-color: #86efac; background: #f0fdf4; }
  .trace-step.fail { border-color: #fca5a5; background: #fff1f2; }
  .trace-step.skip { border-color: #e2e8f0; background: #f8fafc; }
  .trace-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
  .handler-tag { font-size: 0.8rem; font-weight: 600; color: #374151; }
  .handled-badge { font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; }
  .handled-badge.pass { background: #dcfce7; color: #166534; }
  .handled-badge.fail { background: #fee2e2; color: #991b1b; }
  .skip-badge { font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: #f1f5f9; color: #6b7280; }
  .trace-msg { font-size: 0.78rem; color: #6b7280; }
  .trace-arrow { text-align: center; color: #94a3b8; padding: 0.15rem 0; font-size: 0.85rem; }
  .final-result {
    margin-top: 1rem; padding: 0.75rem 1rem; border-radius: 10px;
    font-weight: 700; font-size: 0.95rem;
  }
  .final-result.pass { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .final-result.fail { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
  .final-msg { font-weight: 400; font-size: 0.85rem; margin-top: 0.25rem; }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
