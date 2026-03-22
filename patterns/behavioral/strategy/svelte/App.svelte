<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   SortStrategy 타입           → Strategy 인터페이스
  //   bubbleSort/quickSort/merge  → ConcreteStrategy 함수들
  //   selectedStrategy ($state)  → Context (현재 사용 중인 전략)
  //   sortedData ($derived)       → Context.sort() 결과
  //
  // 핵심 아이디어:
  //   TypeScript에서는 Sorter 클래스에 strategy를 주입했지만,
  //   Svelte에서는 $state로 전략 함수 자체를 저장하고,
  //   $derived가 전략이 바뀔 때마다 자동으로 재정렬한다.
  //   전략 교체가 UI에 즉시 반영된다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── ConcreteStrategy 함수들 ───────────────────────────────────────────────
  // TypeScript의 SortStrategy 인터페이스를 함수 타입으로 구현

  function bubbleSort(data: number[]): number[] {
    const arr = [...data]
    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = 0; j < arr.length - 1 - i; j++) {
        if (arr[j] > arr[j + 1]) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
      }
    }
    return arr
  }

  function quickSort(data: number[]): number[] {
    const arr = [...data]
    function qs(a: number[], lo: number, hi: number) {
      if (lo >= hi) return
      const pivot = a[hi]; let i = lo - 1
      for (let j = lo; j < hi; j++) {
        if (a[j] <= pivot) { i++; [a[i], a[j]] = [a[j], a[i]] }
      }
      ;[a[i + 1], a[hi]] = [a[hi], a[i + 1]]
      const pi = i + 1
      qs(a, lo, pi - 1); qs(a, pi + 1, hi)
    }
    qs(arr, 0, arr.length - 1)
    return arr
  }

  function mergeSort(data: number[]): number[] {
    if (data.length <= 1) return [...data]
    function ms(arr: number[]): number[] {
      if (arr.length <= 1) return arr
      const mid = Math.floor(arr.length / 2)
      const left = ms(arr.slice(0, mid))
      const right = ms(arr.slice(mid))
      const result: number[] = []
      let i = 0, j = 0
      while (i < left.length && j < right.length) {
        result.push(left[i] <= right[j] ? left[i++] : right[j++])
      }
      return result.concat(left.slice(i), right.slice(j))
    }
    return ms([...data])
  }

  function jsBuiltinSort(data: number[]): number[] {
    return [...data].sort((a, b) => a - b)
  }

  // ── 전략 메타데이터 ────────────────────────────────────────────────────────
  const strategies = [
    { id: 'bubble',    name: '버블 정렬',   fn: bubbleSort,    complexity: 'O(n²)',      color: '#ef4444', desc: '인접한 요소를 반복 비교해 정렬. 단순하지만 느리다.' },
    { id: 'quick',     name: '퀵 정렬',     fn: quickSort,     complexity: 'O(n log n)', color: '#3b82f6', desc: '피벗 기준 분할 정복. 실무에서 가장 많이 쓰인다.' },
    { id: 'merge',     name: '머지 정렬',   fn: mergeSort,     complexity: 'O(n log n)', color: '#8b5cf6', desc: '절반씩 나눠 병합. 안정적이고 일정한 성능 보장.' },
    { id: 'builtin',   name: 'JS 기본 정렬', fn: jsBuiltinSort, complexity: 'O(n log n)', color: '#10b981', desc: 'Array.sort() — 브라우저 엔진의 최적화된 정렬.' },
  ]

  // ── $state: Context (현재 전략 선택) ─────────────────────────────────────
  let selectedStrategyId = $state('quick')
  let inputData = $state('64, 34, 25, 12, 22, 11, 90, 3, 55, 47')

  // $derived: 입력 데이터 파싱
  let parsedData = $derived(
    inputData.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
  )

  // $derived: 현재 전략 객체
  let currentStrategy = $derived(strategies.find(s => s.id === selectedStrategyId)!)

  // $derived: 전략 적용 결과 — 전략이나 데이터가 바뀌면 자동 재계산 ─────────
  // TypeScript의 sorter.sort(data)에 해당. 전략 교체 시 자동으로 재실행된다.
  let sortedData = $derived.by(() => {
    if (parsedData.length === 0) return []
    const start = performance.now()
    const result = currentStrategy.fn(parsedData)
    const elapsed = (performance.now() - start).toFixed(3)
    return { result, elapsed }
  })

  // 정렬 시각화: 각 값의 높이를 계산
  let maxVal = $derived(Math.max(...parsedData, 1))

  function randomData() {
    const nums = Array.from({ length: 12 }, () => Math.floor(Math.random() * 99) + 1)
    inputData = nums.join(', ')
  }
</script>

<main>
  <h1>Strategy 패턴</h1>
  <p class="desc">
    정렬 전략(<strong>ConcreteStrategy</strong>)을 <code>$state</code>로 교체하면
    <code>$derived</code>가 자동으로 새 전략으로 재정렬한다.
    <code>if/else</code> 없이 알고리즘을 동적으로 교체한다.
  </p>

  <div class="layout">
    <section class="card">
      <h2>전략 선택 (Context.setStrategy)</h2>
      <div class="strategy-list">
        {#each strategies as s}
          <button
            class="strategy-btn"
            class:active={selectedStrategyId === s.id}
            style="--color: {s.color}"
            onclick={() => (selectedStrategyId = s.id)}
          >
            <div class="s-header">
              <span class="s-name">{s.name}</span>
              <span class="s-complexity">{s.complexity}</span>
            </div>
            <div class="s-desc">{s.desc}</div>
          </button>
        {/each}
      </div>

      <h3>입력 데이터</h3>
      <textarea bind:value={inputData} rows="2" placeholder="숫자를 쉼표로 구분해 입력"></textarea>
      <button class="btn-random" onclick={randomData}>🎲 랜덤 생성</button>
    </section>

    <section class="card">
      <h2>정렬 결과 (자동 재계산)</h2>

      <!-- 현재 전략 표시 -->
      <div class="active-strategy" style="border-color: {currentStrategy.color}">
        <span style="color: {currentStrategy.color}; font-weight: 700">{currentStrategy.name}</span>
        <span class="complexity-badge" style="background: {currentStrategy.color}20; color: {currentStrategy.color}">
          {currentStrategy.complexity}
        </span>
        {#if sortedData && typeof sortedData === 'object'}
          <span class="elapsed">{sortedData.elapsed}ms</span>
        {/if}
      </div>

      <!-- 원본 데이터 시각화 -->
      <div class="viz-section">
        <div class="viz-label">원본 배열 ({parsedData.length}개)</div>
        <div class="bar-chart">
          {#each parsedData as val}
            <div class="bar original" style="height: {(val / maxVal) * 80}px" title={String(val)}>
              <span class="bar-val">{val}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- 정렬 후 시각화 -->
      {#if sortedData && typeof sortedData === 'object'}
        <div class="viz-section">
          <div class="viz-label">정렬 후 ({currentStrategy.name})</div>
          <div class="bar-chart">
            {#each sortedData.result as val}
              <div class="bar sorted" style="height: {(val / maxVal) * 80}px; background: {currentStrategy.color}" title={String(val)}>
                <span class="bar-val">{val}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="result-array">
          [{sortedData.result.join(', ')}]
        </div>
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>Sorter</code> 클래스에 <code>setStrategy()</code>로 전략 주입, <code>sort()</code> 호출</li>
      <li><strong>Svelte:</strong> <code>$state</code>로 전략 ID 저장, <code>$derived</code>가 전략 교체 시 자동 재정렬</li>
      <li><strong>핵심:</strong> 전략 교체(<code>$state</code> 변경)만으로 결과(<code>$derived</code>)가 자동 업데이트됨</li>
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
  h3 { font-size: 0.88rem; color: #374151; margin-top: 1rem; margin-bottom: 0.5rem; }
  .strategy-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .strategy-btn {
    text-align: left; padding: 0.6rem 0.8rem; border: 2px solid #e2e8f0;
    border-radius: 8px; background: white; cursor: pointer; transition: all 0.15s;
  }
  .strategy-btn.active { border-color: var(--color); background: color-mix(in srgb, var(--color) 8%, white); }
  .s-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
  .s-name { font-weight: 600; font-size: 0.9rem; color: #374151; }
  .s-complexity { font-size: 0.78rem; background: #f1f5f9; padding: 0.1rem 0.4rem; border-radius: 4px; color: #6b7280; }
  .s-desc { font-size: 0.78rem; color: #6b7280; }
  textarea { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; resize: vertical; box-sizing: border-box; }
  .btn-random { margin-top: 0.5rem; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  .active-strategy {
    display: flex; align-items: center; gap: 0.75rem; border: 2px solid;
    border-radius: 8px; padding: 0.6rem 0.8rem; margin-bottom: 1rem; transition: border-color 0.2s;
  }
  .complexity-badge { font-size: 0.78rem; padding: 0.15rem 0.5rem; border-radius: 4px; }
  .elapsed { font-size: 0.78rem; color: #94a3b8; margin-left: auto; }
  .viz-section { margin-bottom: 1rem; }
  .viz-label { font-size: 0.82rem; color: #6b7280; margin-bottom: 0.35rem; }
  .bar-chart { display: flex; align-items: flex-end; gap: 3px; height: 100px; }
  .bar {
    flex: 1; min-width: 18px; background: #e2e8f0; border-radius: 3px 3px 0 0;
    display: flex; align-items: flex-end; justify-content: center; position: relative;
    transition: height 0.3s ease;
  }
  .bar.sorted { background: #3b82f6; }
  .bar-val { font-size: 0.6rem; color: #374151; padding-bottom: 2px; writing-mode: vertical-rl; }
  .result-array {
    background: #1e293b; color: #86efac; font-family: monospace; font-size: 0.85rem;
    padding: 0.6rem 0.8rem; border-radius: 7px; word-break: break-all;
  }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
