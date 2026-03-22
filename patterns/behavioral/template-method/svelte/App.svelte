<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Template Method 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   DataMinerConfig 타입        → AbstractClass (골격 정의)
  //   csvMiner / jsonMiner / xmlMiner → ConcreteClass (단계별 구현)
  //   mine() 함수                → Template Method (고정된 알고리즘 골격)
  //   selectedMiner ($state)      → 현재 사용할 ConcreteClass 선택
  //   $derived miningResult       → mine() 실행 결과 자동 계산
  //
  // 핵심 아이디어:
  //   TypeScript에서는 추상 클래스의 mine()이 골격을 정의하고 서브클래스가 추상 메서드를 구현했지만,
  //   Svelte에서는 각 Miner를 "단계별 함수를 가진 객체"로 표현하고,
  //   공통 mine() 함수가 그 단계들을 순서대로 호출한다.
  //   $derived로 miner나 입력이 바뀌면 자동으로 재실행된다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── AbstractClass 역할: 공통 골격 타입 정의 ──────────────────────────────
  interface DataRecord { [key: string]: string | number }

  interface DataMinerConfig {
    id: string
    name: string
    icon: string
    color: string
    sampleData: string
    // 추상 메서드들 (서브클래스가 구현)
    readData: (raw: string) => string
    parseData: (data: string) => DataRecord[]
    getSourceType: () => string
  }

  // ── Template Method: 데이터 마이닝 골격 ─────────────────────────────────
  // TypeScript의 mine() 메서드에 해당. 순서는 고정, 세부 구현은 config 객체에 위임.
  function mine(config: DataMinerConfig, rawData: string) {
    // 1단계: 데이터 읽기 (readData 추상 메서드)
    const data = config.readData(rawData)

    // 2단계: 파싱 (parseData 추상 메서드)
    const records = config.parseData(data)

    // 3단계: 분석 (analyzeData — hook 메서드, 공통 구현 사용)
    const numericValues = records
      .flatMap(r => Object.values(r).filter(v => typeof v === 'number'))
      .map(Number)
    const sum = numericValues.reduce((a, b) => a + b, 0)
    const avg = numericValues.length > 0 ? sum / numericValues.length : 0

    // 4단계: 결과 반환 (formatResult — 공통 구현)
    return {
      source: config.getSourceType(),
      recordCount: records.length,
      sum,
      average: Math.round(avg * 100) / 100,
      records,
    }
  }

  // ── ConcreteClass 1: CSV 마이너 ───────────────────────────────────────────
  const csvMiner: DataMinerConfig = {
    id: 'csv', name: 'CSV 마이너', icon: '📊', color: '#10b981',
    sampleData: 'name,age,score\n홍길동,25,90\n김철수,30,85\n이영희,22,95',
    readData: (raw) => raw.trim(),
    parseData(data) {
      const lines = data.split('\n').filter(l => l.trim())
      if (lines.length < 2) return []
      const headers = lines[0].split(',').map(h => h.trim())
      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const record: DataRecord = {}
        headers.forEach((h, i) => {
          const v = values[i] ?? ''
          record[h] = isNaN(Number(v)) ? v : Number(v)
        })
        return record
      })
    },
    getSourceType: () => 'CSV',
  }

  // ── ConcreteClass 2: JSON 마이너 ──────────────────────────────────────────
  const jsonMiner: DataMinerConfig = {
    id: 'json', name: 'JSON 마이너', icon: '🔧', color: '#3b82f6',
    sampleData: '[{"name":"홍길동","age":25,"score":90},{"name":"김철수","age":30,"score":85}]',
    readData: (raw) => raw.trim(),
    parseData(data) {
      try {
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch { return [] }
    },
    getSourceType: () => 'JSON',
  }

  // ── ConcreteClass 3: XML 마이너 ───────────────────────────────────────────
  const xmlMiner: DataMinerConfig = {
    id: 'xml', name: 'XML 마이너', icon: '📄', color: '#f59e0b',
    sampleData: '<records><record><name>홍길동</name><age>25</age><score>90</score></record><record><name>김철수</name><age>30</age><score>85</score></record></records>',
    readData: (raw) => raw.trim().replace(/\s+/g, ' '),
    parseData(data) {
      const records: DataRecord[] = []
      for (const match of data.matchAll(/<record>(.*?)<\/record>/g)) {
        const record: DataRecord = {}
        for (const field of match[1].matchAll(/<(\w+)>(.*?)<\/\1>/g)) {
          const [, tag, val] = field
          record[tag] = isNaN(Number(val)) ? val : Number(val)
        }
        records.push(record)
      }
      return records
    },
    getSourceType: () => 'XML',
  }

  const miners = [csvMiner, jsonMiner, xmlMiner]

  // ── $state: 선택된 ConcreteClass ──────────────────────────────────────────
  let selectedMinerId = $state('csv')
  let currentMiner = $derived(miners.find(m => m.id === selectedMinerId)!)
  let rawInput = $state(csvMiner.sampleData)

  // miner 변경 시 샘플 데이터 자동 로드
  $effect(() => {
    rawInput = currentMiner.sampleData
  })

  // ── $derived: Template Method 실행 결과 자동 계산 ─────────────────────────
  // selectedMinerId나 rawInput이 바뀌면 자동으로 mine()을 재실행한다
  let miningResult = $derived.by(() => {
    try {
      return { result: mine(currentMiner, rawInput), error: null }
    } catch (e) {
      return { result: null, error: String(e) }
    }
  })

  // 템플릿 메서드 단계 시각화
  const steps = [
    { num: 1, label: 'readData()', desc: '원시 데이터 전처리', abstract: true },
    { num: 2, label: 'parseData()', desc: '포맷에 맞게 파싱', abstract: true },
    { num: 3, label: 'analyzeData()', desc: '숫자 필드 분석 (hook)', abstract: false },
    { num: 4, label: 'formatResult()', desc: '결과 구조화', abstract: false },
  ]
</script>

<main>
  <h1>Template Method 패턴</h1>
  <p class="desc">
    <code>mine()</code>이 알고리즘 골격을 정의한다.
    각 Miner가 <code>readData()</code>와 <code>parseData()</code>만 다르게 구현하면
    나머지 단계는 공통 로직이 처리한다.
  </p>

  <div class="layout">
    <!-- ConcreteClass 선택 + 입력 -->
    <section class="card">
      <h2>ConcreteClass 선택</h2>
      <div class="miner-btns">
        {#each miners as miner}
          <button
            class="miner-btn"
            class:active={selectedMinerId === miner.id}
            style="--color: {miner.color}"
            onclick={() => (selectedMinerId = miner.id)}
          >
            {miner.icon} {miner.name}
          </button>
        {/each}
      </div>

      <!-- Template Method 단계 시각화 -->
      <div class="template-steps">
        <div class="tpl-title">mine() — Template Method 골격</div>
        {#each steps as step}
          <div class="tpl-step" class:abstract={step.abstract} style="--color: {currentMiner.color}">
            <span class="step-num">{step.num}</span>
            <div>
              <div class="step-fn">{step.label}</div>
              <div class="step-desc">{step.desc}</div>
            </div>
            {#if step.abstract}
              <span class="abstract-badge" style="background: {currentMiner.color}20; color: {currentMiner.color}">서브클래스 구현</span>
            {:else}
              <span class="hook-badge">공통 구현</span>
            {/if}
          </div>
        {/each}
      </div>

      <h3>입력 데이터</h3>
      <textarea bind:value={rawInput} rows="5" class="data-input"></textarea>
    </section>

    <!-- 실행 결과 -->
    <section class="card">
      <h2>mine() 실행 결과</h2>

      {#if miningResult.error}
        <div class="error">{miningResult.error}</div>
      {:else if miningResult.result}
        {@const r = miningResult.result}
        <div class="result-header" style="border-color: {currentMiner.color}">
          <span class="source-badge" style="background: {currentMiner.color}">{r.source}</span>
          <span class="record-count">{r.recordCount}개 레코드</span>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">레코드 수</div>
            <div class="stat-value">{r.recordCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">합계</div>
            <div class="stat-value">{r.sum}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">평균</div>
            <div class="stat-value">{r.average}</div>
          </div>
        </div>

        <h3>파싱된 레코드</h3>
        {#if r.records.length > 0}
          <table class="records-table">
            <thead>
              <tr>
                {#each Object.keys(r.records[0]) as key}
                  <th>{key}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each r.records as record}
                <tr>
                  {#each Object.values(record) as val}
                    <td>{val}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="empty">파싱된 레코드 없음</p>
        {/if}
      {/if}
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> 추상 클래스 <code>DataMiner</code>를 상속해 <code>parseData()</code> 오버라이드</li>
      <li><strong>Svelte:</strong> 각 Miner를 "단계 함수를 가진 객체"로 표현, 공통 <code>mine()</code>이 순서 제어</li>
      <li><strong>반응형:</strong> <code>$derived</code>로 Miner 교체나 데이터 변경 시 자동으로 재실행</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #6d28d9; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.88rem; color: #374151; margin: 0.75rem 0 0.4rem; }
  .miner-btns { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .miner-btn {
    flex: 1; padding: 0.5rem; border: 2px solid var(--color); border-radius: 8px;
    background: white; cursor: pointer; font-size: 0.85rem; transition: all 0.15s;
  }
  .miner-btn.active { background: var(--color); color: white; }
  .template-steps { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; }
  .tpl-title { font-size: 0.82rem; font-weight: 700; color: #374151; margin-bottom: 0.5rem; }
  .tpl-step {
    display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.5rem;
    border-radius: 6px; margin-bottom: 0.3rem; background: #f8fafc;
  }
  .tpl-step.abstract { background: color-mix(in srgb, var(--color) 8%, white); }
  .step-num {
    width: 22px; height: 22px; background: #e2e8f0; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
  }
  .tpl-step.abstract .step-num { background: var(--color); color: white; }
  .step-fn { font-size: 0.82rem; font-weight: 600; font-family: monospace; }
  .step-desc { font-size: 0.75rem; color: #6b7280; }
  .abstract-badge { font-size: 0.72rem; padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: auto; white-space: nowrap; }
  .hook-badge { font-size: 0.72rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: #f1f5f9; color: #94a3b8; margin-left: auto; white-space: nowrap; }
  .data-input {
    width: 100%; box-sizing: border-box; padding: 0.5rem; border: 1px solid #cbd5e1;
    border-radius: 6px; font-family: monospace; font-size: 0.78rem; resize: vertical;
  }
  .result-header { display: flex; align-items: center; gap: 0.75rem; border: 2px solid; border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 1rem; }
  .source-badge { color: white; padding: 0.2rem 0.6rem; border-radius: 5px; font-size: 0.82rem; font-weight: 700; }
  .record-count { font-size: 0.85rem; color: #374151; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
  .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.6rem; text-align: center; }
  .stat-label { font-size: 0.75rem; color: #6b7280; }
  .stat-value { font-size: 1.2rem; font-weight: 700; color: #374151; }
  .records-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .records-table th { background: #f1f5f9; padding: 0.4rem 0.5rem; text-align: left; }
  .records-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #e2e8f0; }
  .error { background: #fff1f2; border: 1px solid #fca5a5; border-radius: 7px; padding: 0.6rem 0.75rem; color: #dc2626; font-size: 0.85rem; }
  .empty { color: #94a3b8; font-size: 0.85rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
