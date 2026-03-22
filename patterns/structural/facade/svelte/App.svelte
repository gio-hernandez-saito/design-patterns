<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Facade 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   tvState, ampState, streamingState, lightsState ($state) → 서브시스템 상태
  //   watchMovie(), endMovie(), listenToMusic() → Facade 메서드 (복잡한 순서를 단순화)
  //   $derived statusLog → 전체 시스템 상태 조회
  //
  // 핵심 아이디어:
  //   TypeScript에서는 HomeTheaterFacade 클래스가 서브시스템 인스턴스를 보유했지만,
  //   Svelte에서는 각 서브시스템의 상태를 $state로 관리하고,
  //   Facade 함수들이 여러 $state를 한 번에 조작해 복잡한 순서를 숨긴다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── 서브시스템 상태들 ($state) ────────────────────────────────────────────
  // 각 $state 객체가 하나의 서브시스템(TV, 앰프 등)에 해당한다

  // TV 서브시스템
  let tv = $state({ isOn: false, input: 'HDMI1', brightness: 80, mode: '일반' })

  // 앰프 서브시스템
  let amp = $state({ isOn: false, volume: 30, surroundMode: '스테레오' })

  // 스트리밍 박스 서브시스템
  let streaming = $state({ isOn: false, app: '', content: '' })

  // 스마트 조명 서브시스템
  let lights = $state({ isOn: true, brightness: 100, color: '흰색' })

  // 이벤트 로그
  let logs = $state<string[]>([])
  function addLog(msg: string) {
    logs = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logs.slice(0, 19)]
  }

  // ── Facade 메서드들: 복잡한 순서를 하나의 함수로 단순화 ──────────────────
  // 클라이언트는 이 함수들만 알면 된다 — 내부 서브시스템 조작 순서는 몰라도 됨

  function watchMovie(movieTitle: string, app = 'Netflix') {
    // 1단계: 조명 영화 모드 (순서 중요: 조명 먼저)
    lights.brightness = 10; lights.color = '주황'; lights.isOn = true
    addLog('조명 → 영화 모드 (밝기 10%, 주황)')

    // 2단계: TV 설정 (켜기 → 시네마 모드 → 입력 설정 순서)
    tv.isOn = true; tv.mode = '시네마'; tv.input = 'HDMI1'; tv.brightness = 60
    addLog('TV → 켜짐, 시네마 모드, HDMI1')

    // 3단계: 앰프 설정 (TV 이후에 활성화)
    amp.isOn = true; amp.surroundMode = '돌비 애트모스'; amp.volume = 40
    addLog('앰프 → 켜짐, 돌비 애트모스, 볼륨 40')

    // 4단계: 스트리밍 박스로 재생
    streaming.isOn = true; streaming.app = app; streaming.content = movieTitle
    addLog(`스트리밍 → ${app}에서 "${movieTitle}" 재생 시작`)
  }

  function endMovie() {
    // 역순 종료 (오디오 → 비디오 → 조명)
    streaming.content = ''; streaming.app = ''; streaming.isOn = false
    addLog('스트리밍 → 정지 및 종료')
    amp.isOn = false; addLog('앰프 → 종료')
    tv.isOn = false; tv.mode = '일반'; addLog('TV → 종료')
    lights.brightness = 80; lights.color = '흰색'; lights.isOn = true
    addLog('조명 → 일반 모드 복귀')
  }

  function listenToMusic(playlist: string) {
    lights.brightness = 60; lights.color = '보라'; lights.isOn = true
    addLog('조명 → 파티 모드 (보라)')
    amp.isOn = true; amp.surroundMode = '스테레오'; amp.volume = 60
    addLog('앰프 → 스테레오, 볼륨 60')
    streaming.isOn = true; streaming.app = 'Spotify'; streaming.content = playlist
    addLog(`스트리밍 → Spotify에서 "${playlist}" 재생`)
    // TV는 음악 감상 시 켜지 않는다
  }

  function shutdownAll() {
    streaming.isOn = false; streaming.app = ''; streaming.content = ''
    amp.isOn = false; tv.isOn = false
    lights.isOn = false; lights.brightness = 0
    addLog('전체 시스템 종료')
  }

  // ── 입력값 ────────────────────────────────────────────────────────────────
  let movieTitle = $state('인터스텔라')
  let streamingApp = $state('Netflix')
  let playlist = $state('재즈 플레이리스트')

  // ── $derived: 전체 상태 요약 ──────────────────────────────────────────────
  let systemStatus = $derived([
    { label: 'TV', icon: '📺', active: tv.isOn, detail: tv.isOn ? `${tv.mode} 모드, ${tv.input}` : '꺼짐' },
    { label: '앰프', icon: '🔊', active: amp.isOn, detail: amp.isOn ? `${amp.surroundMode}, 볼륨 ${amp.volume}` : '꺼짐' },
    { label: '스트리밍', icon: '📡', active: streaming.isOn, detail: streaming.isOn ? `${streaming.app}: ${streaming.content || '대기중'}` : '꺼짐' },
    { label: '조명', icon: '💡', active: lights.isOn, detail: lights.isOn ? `${lights.brightness}%, ${lights.color}` : '꺼짐' },
  ])
</script>

<main>
  <h1>Facade 패턴</h1>
  <p class="desc">
    복잡한 서브시스템(TV, 앰프, 스트리밍, 조명)을 단순한 Facade 메서드로 추상화한다.
    클라이언트는 <code>watchMovie()</code> 한 줄로 모든 기기를 제어한다.
  </p>

  <div class="layout">
    <!-- Facade 메서드 컨트롤 -->
    <section class="card">
      <h2>Facade 인터페이스 (단순화된 API)</h2>

      <div class="facade-section">
        <h3>영화 보기</h3>
        <div class="input-row">
          <input bind:value={movieTitle} placeholder="영화 제목" />
          <select bind:value={streamingApp}>
            <option>Netflix</option><option>Disney+</option><option>Watcha</option>
          </select>
        </div>
        <div class="btn-row">
          <button class="btn-watch" onclick={() => watchMovie(movieTitle, streamingApp)}>
            🎬 영화 시작
          </button>
          <button class="btn-end" onclick={endMovie}>⏹ 영화 종료</button>
        </div>
      </div>

      <div class="facade-section">
        <h3>음악 감상</h3>
        <input bind:value={playlist} placeholder="플레이리스트 이름" />
        <button class="btn-music" onclick={() => listenToMusic(playlist)}>
          🎵 음악 재생
        </button>
      </div>

      <div class="facade-section">
        <button class="btn-shutdown" onclick={shutdownAll}>⚡ 전체 종료</button>
      </div>

      <!-- 이벤트 로그 (내부 순서 시각화) -->
      <div class="log-box">
        <div class="log-header">내부 실행 순서 (클라이언트가 몰라도 되는 부분)</div>
        {#if logs.length === 0}
          <div class="empty">Facade 메서드를 실행하면 내부 순서가 표시됩니다</div>
        {:else}
          {#each logs as log}
            <div class="log-entry">{log}</div>
          {/each}
        {/if}
      </div>
    </section>

    <!-- 서브시스템 상태 (Facade가 숨기는 복잡성) -->
    <section class="card">
      <h2>서브시스템 상태 (복잡한 내부)</h2>
      <div class="systems">
        {#each systemStatus as sys}
          <div class="system-card" class:active={sys.active}>
            <div class="sys-header">
              <span class="sys-icon">{sys.icon}</span>
              <span class="sys-label">{sys.label}</span>
              <span class="sys-badge" class:on={sys.active}>{sys.active ? 'ON' : 'OFF'}</span>
            </div>
            <div class="sys-detail">{sys.detail}</div>
          </div>
        {/each}
      </div>

      <!-- 직접 서브시스템 조작 (고급 사용자용) -->
      <details class="advanced">
        <summary>직접 서브시스템 조작 (고급)</summary>
        <div class="advanced-controls">
          <label>TV 밝기: <input type="range" min="0" max="100" bind:value={tv.brightness} /> {tv.brightness}%</label>
          <label>앰프 볼륨: <input type="range" min="0" max="100" bind:value={amp.volume} /> {amp.volume}</label>
          <label>조명 밝기: <input type="range" min="0" max="100" bind:value={lights.brightness} /> {lights.brightness}%</label>
        </div>
      </details>
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>HomeTheaterFacade</code> 클래스가 4개 서브시스템 인스턴스를 보유하고 메서드로 조율</li>
      <li><strong>Svelte:</strong> 서브시스템을 <code>$state</code> 객체로 관리, Facade 함수들이 여러 <code>$state</code>를 순서대로 변경</li>
      <li><strong>반응형:</strong> 어떤 서브시스템 상태든 <code>$state</code>로 변경되면 UI가 즉시 업데이트됨</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #7c3aed; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.88rem; color: #374151; margin-top: 0; margin-bottom: 0.5rem; }
  .facade-section { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; }
  .input-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
  .input-row input { flex: 1; }
  input, select { padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; }
  .btn-row { display: flex; gap: 0.5rem; }
  .btn-watch { background: #7c3aed; color: white; border: none; padding: 0.45rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.88rem; }
  .btn-end { background: #6b7280; color: white; border: none; padding: 0.45rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.88rem; }
  .btn-music { background: #ec4899; color: white; border: none; padding: 0.45rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.88rem; margin-top: 0.5rem; }
  .btn-shutdown { background: #ef4444; color: white; border: none; padding: 0.45rem 1.2rem; border-radius: 6px; cursor: pointer; font-size: 0.88rem; width: 100%; }
  .log-box { margin-top: 1rem; background: #1e293b; border-radius: 8px; padding: 0.75rem; max-height: 200px; overflow-y: auto; }
  .log-header { color: #64748b; font-size: 0.75rem; margin-bottom: 0.5rem; font-weight: 600; }
  .log-entry { color: #94a3b8; font-size: 0.78rem; padding: 0.2rem 0; border-bottom: 1px solid #1e293b; font-family: monospace; }
  .empty { color: #475569; font-size: 0.8rem; }
  .systems { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
  .system-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; transition: all 0.2s; }
  .system-card.active { border-color: #7c3aed; background: #faf5ff; }
  .sys-header { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; }
  .sys-icon { font-size: 1.1rem; }
  .sys-label { font-weight: 600; font-size: 0.88rem; flex: 1; }
  .sys-badge { font-size: 0.72rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: #e2e8f0; color: #64748b; }
  .sys-badge.on { background: #ddd6fe; color: #6d28d9; }
  .sys-detail { font-size: 0.78rem; color: #6b7280; }
  .advanced { margin-top: 0.75rem; }
  .advanced summary { cursor: pointer; font-size: 0.85rem; color: #6b7280; }
  .advanced-controls { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.5rem; font-size: 0.85rem; }
  .advanced-controls label { display: flex; align-items: center; gap: 0.5rem; }
  .advanced-controls input[type=range] { flex: 1; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
