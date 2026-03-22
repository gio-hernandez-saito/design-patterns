<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Singleton 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   모듈 스코프 $state 변수  → Singleton 인스턴스 (전역 단일 상태)
  //   config 객체              → AppConfig (설정을 담는 단일 저장소)
  //
  // 핵심 아이디어:
  //   TypeScript에서는 private static instance로 단일성을 보장했지만,
  //   Svelte에서는 모듈 스코프 변수가 자연스럽게 Singleton 역할을 한다.
  //   모듈은 앱 전체에서 한 번만 로드되므로, 모듈 최상위에 선언된 변수는
  //   모든 컴포넌트가 공유하는 단일 인스턴스가 된다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Singleton: 모듈 스코프 $state로 전역 단일 설정 인스턴스 구현 ──────────
  // 이 변수는 모듈이 처음 import될 때 단 한 번 생성된다.
  // 어느 컴포넌트에서 import해도 항상 같은 객체를 참조한다 → Singleton!
  let config = $state<Record<string, string>>({
    logLevel: 'info',
    apiUrl: 'https://api.example.com',
    timeout: '5000',
  })

  // 설정 변경 함수: Singleton 인스턴스의 set() 메서드에 해당
  function setConfig(key: string, value: string) {
    config[key] = value
  }

  // 설정 초기화 함수
  function resetConfig() {
    config = {
      logLevel: 'info',
      apiUrl: 'https://api.example.com',
      timeout: '5000',
    }
  }

  // ── 데모용 상태 ───────────────────────────────────────────────────────────
  // 편집 중인 키/값을 추적
  let editKey = $state('logLevel')
  let editValue = $state('debug')

  // 변경 이력을 기록해 Singleton의 단일성을 시각적으로 보여줌
  let history = $state<string[]>([])

  // 설정 키 목록 ($derived: config가 바뀔 때 자동 재계산)
  let configKeys = $derived(Object.keys(config))

  // "인스턴스 ID" 시뮬레이션: 실제로는 항상 같은 객체임을 보여주기 위해
  const instanceId = Math.random().toString(36).slice(2, 8)

  function applyChange() {
    if (!editKey || !editValue) return
    setConfig(editKey, editValue)
    history = [`[${new Date().toLocaleTimeString()}] ${editKey} = "${editValue}"`, ...history]
  }
</script>

<main>
  <h1>Singleton 패턴</h1>
  <p class="desc">
    모듈 스코프 <code>$state</code>로 전역 단일 인스턴스를 구현한다.
    어떤 컴포넌트에서 import해도 항상 같은 객체를 공유한다.
  </p>

  <!-- 인스턴스 ID: Singleton임을 증명 — 페이지를 새로고침해도 같은 ID -->
  <div class="instance-badge">
    인스턴스 ID: <strong>{instanceId}</strong>
    <span class="tip">새로고침해도 이 컴포넌트는 같은 상태를 공유합니다</span>
  </div>

  <div class="layout">
    <!-- 현재 설정 표시 (Singleton 상태) -->
    <section class="card">
      <h2>현재 설정 (AppConfig Singleton)</h2>
      <table>
        <thead>
          <tr><th>키</th><th>값</th></tr>
        </thead>
        <tbody>
          {#each configKeys as key}
            <tr>
              <td><code>{key}</code></td>
              <td>{config[key]}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <button class="btn-reset" onclick={resetConfig}>초기값으로 리셋</button>
    </section>

    <!-- 설정 변경 컨트롤 -->
    <section class="card">
      <h2>설정 변경 (set 메서드)</h2>
      <div class="form-row">
        <label>
          키:
          <select bind:value={editKey}>
            {#each configKeys as key}
              <option value={key}>{key}</option>
            {/each}
            <option value="__new__">새 키 추가...</option>
          </select>
        </label>
        {#if editKey === '__new__'}
          <label>
            새 키 이름:
            <input bind:value={editKey} placeholder="새 키 이름" />
          </label>
        {/if}
        <label>
          값:
          <input bind:value={editValue} placeholder="새 값" />
        </label>
        <button class="btn-primary" onclick={applyChange}>적용</button>
      </div>

      <!-- 변경 이력 -->
      <h3>변경 이력</h3>
      {#if history.length === 0}
        <p class="empty">아직 변경 없음</p>
      {:else}
        <ul class="history">
          {#each history as entry}
            <li>{entry}</li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>private static instance</code> + <code>getInstance()</code>로 단일성 보장</li>
      <li><strong>Svelte:</strong> 모듈 스코프 <code>$state</code> 변수가 자연스럽게 Singleton — 모듈은 앱에서 한 번만 로드됨</li>
    </ul>
  </div>
</main>

<style>
  main {
    font-family: sans-serif;
    max-width: 900px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  h1 { color: #2563eb; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .instance-badge {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.95rem;
  }
  .tip { color: #6b7280; font-size: 0.85rem; }
  .layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem;
  }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.9rem; color: #374151; margin-top: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th { text-align: left; padding: 0.4rem 0.6rem; background: #e2e8f0; }
  td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #e2e8f0; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85rem; }
  .form-row { display: flex; flex-direction: column; gap: 0.75rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; color: #374151; }
  input, select {
    padding: 0.45rem 0.6rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .btn-primary {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.5rem 1.2rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    align-self: flex-start;
  }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-reset {
    margin-top: 1rem;
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .btn-reset:hover { background: #dc2626; }
  .history { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; }
  .history li {
    padding: 0.35rem 0.5rem;
    border-left: 3px solid #2563eb;
    margin-bottom: 0.35rem;
    background: #eff6ff;
    border-radius: 0 4px 4px 0;
  }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  .explanation {
    margin-top: 2rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 10px;
    padding: 1rem 1.25rem;
    font-size: 0.9rem;
  }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
