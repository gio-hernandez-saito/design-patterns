<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Builder 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   $state 폼 필드들    → ConcreteBuilder (단계별 설정 상태)
  //   $derived builtRequest → build() 결과 (Product)
  //   buildGetRequest()    → Director (사전 정의된 조합)
  //
  // 핵심 아이디어:
  //   TypeScript에서는 Builder 클래스의 메서드 체이닝으로 객체를 조립했지만,
  //   Svelte에서는 각 $state 변수가 Builder의 내부 필드 역할을 하고,
  //   $derived가 build() 호출 결과를 자동 계산한다.
  //   폼 입력값이 바뀔 때마다 자동으로 최신 Product가 계산된다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── ConcreteBuilder: 각 $state가 Builder의 단계별 설정 필드 ──────────────
  let method = $state('GET')
  let url = $state('')
  let contentType = $state('application/json')
  let accept = $state('application/json')
  let body = $state('')
  let timeout = $state(5000)
  let retries = $state(0)
  let authToken = $state('')

  // 오류 상태
  let error = $state('')

  // ── $derived: build() 호출 결과 — 폼이 바뀔 때마다 자동 재조립 ──────────
  // TypeScript에서는 builder.setMethod().setUrl()...build()를 수동으로 호출했지만,
  // $derived는 의존하는 $state가 바뀔 때마다 자동으로 재계산한다.
  let builtRequest = $derived.by(() => {
    // 필수값 검증 (Builder의 build()에서 하던 검증)
    if (!url.trim()) {
      error = 'URL은 필수입니다.'
      return null
    }
    error = ''

    // Product 조립: Builder의 build() 메서드에 해당
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = contentType
    if (accept) headers['Accept'] = accept
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    return {
      method,
      url: url.trim(),
      headers,
      body: method !== 'GET' && body ? JSON.parse(body) : null,
      timeout,
      retries,
    }
  })

  // JSON 표현 ($derived로 자동 업데이트)
  let requestJson = $derived(
    builtRequest ? JSON.stringify(builtRequest, null, 2) : ''
  )

  // ── Director: 자주 쓰는 조합을 미리 정의 ─────────────────────────────────
  function buildGetRequest(targetUrl: string) {
    method = 'GET'
    url = targetUrl
    body = ''
    contentType = 'application/json'
    accept = 'application/json'
    authToken = ''
    timeout = 5000
    retries = 0
  }

  function buildJsonPostRequest(targetUrl: string) {
    method = 'POST'
    url = targetUrl
    body = '{"name": "홍길동", "age": 25}'
    contentType = 'application/json'
    accept = 'application/json'
    timeout = 5000
    retries = 0
  }

  function buildResilientRequest(targetUrl: string) {
    method = 'GET'
    url = targetUrl
    body = ''
    accept = 'application/json'
    timeout = 10000
    retries = 3
  }

  function reset() {
    method = 'GET'; url = ''; contentType = 'application/json'
    accept = 'application/json'; body = ''; timeout = 5000
    retries = 0; authToken = ''
  }
</script>

<main>
  <h1>Builder 패턴</h1>
  <p class="desc">
    각 <code>$state</code> 폼 필드가 Builder의 단계별 설정이고,
    <code>$derived</code>가 <code>build()</code> 결과를 자동 계산한다.
  </p>

  <!-- Director 버튼들 -->
  <div class="director-bar">
    <span class="director-label">Director (사전 정의 조합):</span>
    <button onclick={() => buildGetRequest('https://api.example.com/users')}>GET 요청</button>
    <button onclick={() => buildJsonPostRequest('https://api.example.com/users')}>JSON POST 요청</button>
    <button onclick={() => buildResilientRequest('https://api.example.com/data')}>재시도 요청</button>
    <button class="btn-reset" onclick={reset}>초기화</button>
  </div>

  <div class="layout">
    <!-- Builder 단계별 설정 폼 -->
    <section class="card">
      <h2>Builder (단계별 설정)</h2>

      <div class="step">
        <span class="step-num">1</span>
        <label>HTTP 메서드:
          <select bind:value={method}>
            {#each ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as m}
              <option>{m}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="step">
        <span class="step-num">2</span>
        <label>URL (필수):
          <input bind:value={url} placeholder="https://api.example.com/endpoint" />
        </label>
      </div>

      <div class="step">
        <span class="step-num">3</span>
        <div class="sub-fields">
          <label>Content-Type: <input bind:value={contentType} /></label>
          <label>Accept: <input bind:value={accept} /></label>
          <label>Auth Token: <input bind:value={authToken} placeholder="(선택)" /></label>
        </div>
      </div>

      {#if method !== 'GET'}
        <div class="step">
          <span class="step-num">4</span>
          <label>Body (JSON):
            <textarea bind:value={body} rows="3" placeholder='{"key": "value"}'></textarea>
          </label>
        </div>
      {/if}

      <div class="step">
        <span class="step-num">{method !== 'GET' ? 5 : 4}</span>
        <div class="sub-fields">
          <label>Timeout (ms): <input type="number" bind:value={timeout} min="100" /></label>
          <label>Retries: <input type="number" bind:value={retries} min="0" max="10" /></label>
        </div>
      </div>
    </section>

    <!-- build() 결과 (Product) -->
    <section class="card">
      <h2>build() 결과 — Product</h2>
      {#if error}
        <div class="error">{error}</div>
      {/if}
      {#if builtRequest}
        <div class="method-badge" style="background: {method === 'GET' ? '#10b981' : method === 'POST' ? '#3b82f6' : '#f59e0b'}">
          {builtRequest.method}
        </div>
        <pre class="json">{requestJson}</pre>
      {:else}
        <p class="empty">URL을 입력하면 자동으로 요청 객체가 조립됩니다.</p>
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>builder.setMethod().setUrl()...build()</code> 체이닝으로 명시적 조립</li>
      <li><strong>Svelte:</strong> <code>$state</code> 필드 변경 → <code>$derived</code>가 자동으로 Product 재조립</li>
      <li><strong>Director:</strong> 미리 정의된 함수가 여러 <code>$state</code>를 한 번에 설정하는 방식으로 구현</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #0891b2; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.25rem; }
  .director-bar {
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
    background: #f1f5f9; border-radius: 10px; padding: 0.75rem 1rem;
    margin-bottom: 1.5rem; font-size: 0.88rem;
  }
  .director-label { font-weight: 600; color: #374151; }
  .director-bar button {
    background: white; border: 1px solid #cbd5e1; padding: 0.35rem 0.8rem;
    border-radius: 6px; cursor: pointer; font-size: 0.85rem;
  }
  .director-bar button:hover { background: #e0f2fe; border-color: #0891b2; }
  .btn-reset { color: #ef4444 !important; border-color: #fca5a5 !important; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.9rem; color: #374151; }
  .step { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 1rem; }
  .step-num {
    width: 24px; height: 24px; background: #0891b2; color: white;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 700; flex-shrink: 0; margin-top: 0.1rem;
  }
  .sub-fields { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.88rem; color: #374151; flex: 1; }
  input, select, textarea {
    padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px;
    font-size: 0.88rem; resize: vertical;
  }
  .method-badge {
    display: inline-block; color: white; font-weight: 700; font-size: 0.85rem;
    padding: 0.2rem 0.7rem; border-radius: 5px; margin-bottom: 0.75rem;
  }
  .json {
    background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px;
    font-size: 0.82rem; overflow: auto; max-height: 320px; white-space: pre-wrap;
  }
  .error { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.5rem 0.75rem; color: #dc2626; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.82rem; }
  .explanation { margin-top: 2rem; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
