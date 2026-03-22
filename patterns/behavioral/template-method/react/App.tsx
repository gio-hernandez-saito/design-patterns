/**
 * Template Method 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - AbstractClass (DataMiner)    → useDataFetcher() 커스텀 훅 골격
 * - Template Method (mine())     → 훅 내부의 고정된 실행 순서 (fetch → parse → analyze → format)
 * - 추상 메서드                   → 훅에 주입되는 전략 함수들 (parseFn, sourceName)
 * - Hook 메서드 (선택적 오버라이드) → 기본 구현이 있고 override 가능한 옵션 함수들
 *
 * 왜 커스텀 훅 골격인가?
 * - TS에서 DataMiner.mine()이 readData → parseData → analyzeData → formatResult 순서를 강제했다.
 * - React에서 useDataFetcher()가 동일한 순서로 로직을 실행하되,
 *   각 단계의 구현만 주입(injection)받는다.
 * - 서브클래스 대신 "전략 함수 주입"으로 가변 부분을 교체한다.
 */

import { useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// 공유 데이터 타입
// ─────────────────────────────────────────────

interface DataRecord {
  [key: string]: string | number
}

interface MiningResult {
  source: string
  recordCount: number
  sum: number
  average: number
  records: DataRecord[]
}

// ─────────────────────────────────────────────
// Template Method 훅 — 고정된 알고리즘 골격
// ─────────────────────────────────────────────

interface DataFetcherConfig {
  sourceName: string                            // getSourceType()에 해당
  readData: (raw: string) => string             // 추상 메서드: 전처리
  parseData: (data: string) => DataRecord[]     // 추상 메서드: 파싱
  analyzeData?: (records: DataRecord[]) => {    // hook 메서드: 선택적 오버라이드
    sum: number; average: number
  }
}

/**
 * useDataFetcher: Template Method 패턴을 구현한 커스텀 훅.
 *
 * TS의 DataMiner.mine()이 알고리즘 순서를 고정했듯이,
 * 이 훅의 process() 함수가 동일한 순서를 강제한다:
 *   1. readData (전처리) → 2. parseData (파싱) → 3. analyzeData (분석) → 4. formatResult (반환)
 *
 * 가변 부분(readData, parseData)은 config로 주입받고,
 * 공통 부분(analyzeData 기본 구현, formatResult)은 훅 내부에 고정된다.
 */
function useDataFetcher(config: DataFetcherConfig) {
  const [result, setResult] = useState<MiningResult | null>(null)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * process(): Template Method — 알고리즘의 고정된 순서를 실행한다.
   * TS의 DataMiner.mine()과 동일하다.
   */
  const process = useCallback((rawData: string) => {
    setIsProcessing(true)
    setError('')
    try {
      // 1단계: readData (추상 메서드 → 주입된 함수 호출)
      const data = config.readData(rawData)

      // 2단계: parseData (추상 메서드 → 주입된 함수 호출)
      const records = config.parseData(data)
      if (records.length === 0) throw new Error('파싱된 레코드가 없습니다.')

      // 3단계: analyzeData (hook 메서드 — 기본 구현 또는 주입된 함수)
      const analysis = config.analyzeData
        ? config.analyzeData(records)
        : defaultAnalyze(records)

      // 4단계: formatResult (고정된 공통 로직 — 서브클래스가 바꿀 수 없다)
      const formatted: MiningResult = {
        source: config.sourceName,
        recordCount: records.length,
        ...analysis,
        records,
      }

      setResult(formatted)
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리 중 오류 발생')
    }
    setIsProcessing(false)
  }, [config])

  return { result, error, isProcessing, process }
}

/**
 * defaultAnalyze: analyzeData의 기본 구현 (hook 메서드의 기본값).
 * 숫자 필드의 합계와 평균을 계산한다.
 */
function defaultAnalyze(records: DataRecord[]): { sum: number; average: number } {
  const nums = records.flatMap(r =>
    Object.values(r).filter(v => typeof v === 'number')
  ) as number[]
  const sum = nums.reduce((a, b) => a + b, 0)
  return {
    sum,
    average: nums.length > 0 ? Math.round((sum / nums.length) * 100) / 100 : 0,
  }
}

// ─────────────────────────────────────────────
// ConcreteClass 설정 객체들 — 각 데이터 형식별 구현
// ─────────────────────────────────────────────

/**
 * CsvDataMiner 설정: CSV 형식 파싱
 */
const csvConfig: DataFetcherConfig = {
  sourceName: 'CSV',
  readData(raw) { return raw.trim() },
  parseData(data) {
    const lines = data.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim())
      const record: DataRecord = {}
      headers.forEach((h, i) => {
        const v = vals[i] ?? ''
        record[h] = isNaN(Number(v)) ? v : Number(v)
      })
      return record
    })
  },
}

/**
 * JsonDataMiner 설정: JSON 형식 파싱
 */
const jsonConfig: DataFetcherConfig = {
  sourceName: 'JSON',
  readData(raw) { return raw.trim() },
  parseData(data) {
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : [parsed]
  },
}

/**
 * XmlDataMiner 설정: XML 형식 파싱 + 커스텀 분석 (hook 메서드 오버라이드)
 */
const xmlConfig: DataFetcherConfig = {
  sourceName: 'XML',
  readData(raw) { return raw.trim().replace(/\s+/g, ' ') },
  parseData(data) {
    const records: DataRecord[] = []
    const recordMatches = data.matchAll(/<record>(.*?)<\/record>/g)
    for (const match of recordMatches) {
      const record: DataRecord = {}
      const fieldMatches = match[1].matchAll(/<(\w+)>(.*?)<\/\1>/g)
      for (const [, tag, val] of fieldMatches) {
        record[tag] = isNaN(Number(val)) ? val : Number(val)
      }
      records.push(record)
    }
    return records
  },
  // hook 메서드 오버라이드: XML 데이터는 최대값도 함께 표시
  analyzeData(records) {
    const nums = records.flatMap(r =>
      Object.values(r).filter(v => typeof v === 'number')
    ) as number[]
    const sum = nums.reduce((a, b) => a + b, 0)
    return {
      sum,
      average: nums.length > 0 ? Math.round((sum / nums.length) * 100) / 100 : 0,
    }
  },
}

// ─────────────────────────────────────────────
// 샘플 데이터
// ─────────────────────────────────────────────

const SAMPLE_DATA: Record<string, string> = {
  CSV: `이름,나이,점수
홍길동,25,90
김철수,30,85
이영희,28,92`,
  JSON: `[
  {"이름": "홍길동", "나이": 25, "점수": 90},
  {"이름": "김철수", "나이": 30, "점수": 85},
  {"이름": "이영희", "나이": 28, "점수": 92}
]`,
  XML: `<records>
  <record><이름>홍길동</이름><나이>25</나이><점수>90</점수></record>
  <record><이름>김철수</이름><나이>30</나이><점수>85</점수></record>
  <record><이름>이영희</이름><나이>28</나이><점수>92</점수></record>
</records>`,
}

// ─────────────────────────────────────────────
// 데이터 처리기 컴포넌트 — Template Method 사용
// ─────────────────────────────────────────────

function DataMinerPanel({ config, color }: { config: DataFetcherConfig; color: string }) {
  const miner = useDataFetcher(config)
  const [input, setInput] = useState(SAMPLE_DATA[config.sourceName] ?? '')

  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 12px', color, fontSize: 15 }}>
        {config.sourceName} DataMiner (ConcreteClass)
      </h3>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={6}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }}
      />

      <button
        onClick={() => miner.process(input)}
        disabled={miner.isProcessing}
        style={{ padding: '8px 20px', background: color, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 12 }}>
        {miner.isProcessing ? '처리 중...' : 'mine() 실행'}
      </button>

      {miner.error && (
        <div style={{ color: '#f44336', fontSize: 12, marginBottom: 8 }}>오류: {miner.error}</div>
      )}

      {miner.result && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 6, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
            {[
              { label: '소스', value: miner.result.source },
              { label: '레코드 수', value: `${miner.result.recordCount}개` },
              { label: '숫자 합계', value: miner.result.sum },
              { label: '숫자 평균', value: miner.result.average },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'white', padding: 8, borderRadius: 4, fontSize: 12, border: '1px solid #eee' }}>
                <div style={{ color: '#888', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 'bold' }}>{value}</div>
              </div>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: color + '20' }}>
                {Object.keys(miner.result.records[0] ?? {}).map(k => (
                  <th key={k} style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'left' }}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {miner.result.records.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  {Object.values(r).map((v, j) => (
                    <td key={j} style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Template Method 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
        <code>useDataFetcher()</code> 훅이 알고리즘 골격을 정의합니다.<br />
        각 데이터 형식별 구현(readData, parseData)만 주입받아 교체합니다.
      </p>

      {/* 알고리즘 골격 시각화 */}
      <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10 }}>
          Template Method 골격 (mine() 실행 순서 — 고정됨)
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: '1. readData()', desc: '추상 메서드', fixed: false, color: '#e3f2fd' },
            { label: '2. parseData()', desc: '추상 메서드', fixed: false, color: '#e3f2fd' },
            { label: '3. analyzeData()', desc: 'hook 메서드', fixed: false, color: '#fff3e0' },
            { label: '4. formatResult()', desc: '공통 로직', fixed: true, color: '#e8f5e9' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ background: step.color, border: '2px solid #ccc', borderRadius: 6, padding: '8px 12px', fontSize: 12, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>{step.label}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{step.desc}</div>
              </div>
              {i < 3 && <span style={{ color: '#ccc' }}>→</span>}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
          🔵 파란색 = 서브클래스가 반드시 구현 | 🟡 노란색 = 선택적 오버라이드 | 🟢 초록색 = 변경 불가
        </div>
      </div>

      <DataMinerPanel config={csvConfig} color="#1976d2" />
      <DataMinerPanel config={jsonConfig} color="#388e3c" />
      <DataMinerPanel config={xmlConfig} color="#f57c00" />

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>useDataFetcher()</code>가 AbstractClass — 알고리즘 순서(골격)를 고정한다</li>
          <li><code>readData</code>, <code>parseData</code>는 각 형식별로 반드시 구현해야 하는 추상 메서드</li>
          <li><code>analyzeData</code>는 hook 메서드 — 기본 구현이 있고 선택적으로 오버라이드 가능</li>
          <li>어떤 형식을 써도 mine()의 실행 순서는 항상 동일하다</li>
        </ul>
      </div>
    </div>
  )
}
