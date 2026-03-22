/**
 * Strategy 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Strategy (SortStrategy 인터페이스) → SortStrategy 타입 (함수 + 이름)
 * - ConcreteStrategy                   → bubbleSort, quickSort, mergeSortFn 함수들
 * - Context (Sorter)                   → useSorter() 훅 (전략을 교체하고 실행)
 *
 * 왜 함수를 전략으로 쓰는가?
 * - TS에서 ConcreteStrategy는 sort() 메서드를 가진 클래스였다.
 * - React/함수형 프로그래밍에서는 함수 자체가 전략이다.
 * - setStrategy(bubbleSort) 한 줄로 런타임에 전략을 교체한다.
 * - 이는 TS의 sorter.setStrategy(new BubbleSortStrategy())와 완전히 동일하다.
 */

import { useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// Strategy 타입 — 함수로 표현된 전략
// ─────────────────────────────────────────────

interface SortStrategy {
  name: string
  description: string
  sort: (data: number[]) => number[]
  complexity: string
  color: string
}

// ─────────────────────────────────────────────
// ConcreteStrategy 함수들
// ─────────────────────────────────────────────

/**
 * ConcreteStrategy 1: 버블 정렬
 * 인접 요소를 비교/교환하는 O(n²) 알고리즘.
 */
const bubbleSortStrategy: SortStrategy = {
  name: '버블 정렬',
  description: '인접한 두 요소를 비교하며 교환합니다.',
  complexity: 'O(n²)',
  color: '#1976d2',
  sort(data: number[]): number[] {
    const arr = [...data]
    const n = arr.length
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        }
      }
    }
    return arr
  },
}

/**
 * ConcreteStrategy 2: 퀵 정렬
 * 피벗 기준 분할 정복, 평균 O(n log n).
 */
const quickSortStrategy: SortStrategy = {
  name: '퀵 정렬',
  description: '피벗을 기준으로 분할 정복합니다.',
  complexity: 'O(n log n)',
  color: '#388e3c',
  sort(data: number[]): number[] {
    const arr = [...data]
    function qs(low: number, high: number) {
      if (low >= high) return
      const pivot = arr[high]
      let i = low - 1
      for (let j = low; j < high; j++) {
        if (arr[j] <= pivot) { i++; [arr[i], arr[j]] = [arr[j], arr[i]] }
      }
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]
      const pi = i + 1
      qs(low, pi - 1)
      qs(pi + 1, high)
    }
    qs(0, arr.length - 1)
    return arr
  },
}

/**
 * ConcreteStrategy 3: 머지 정렬
 * 분할 후 병합, 안정적인 O(n log n).
 */
const mergeSortStrategy: SortStrategy = {
  name: '머지 정렬',
  description: '배열을 반씩 나눠 정렬 후 병합합니다.',
  complexity: 'O(n log n)',
  color: '#f57c00',
  sort(data: number[]): number[] {
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
      return result.concat(left.slice(i)).concat(right.slice(j))
    }
    return ms([...data])
  },
}

/**
 * ConcreteStrategy 4: 내장 정렬 (JavaScript 기본)
 */
const nativeSortStrategy: SortStrategy = {
  name: 'JS 기본 정렬',
  description: 'JavaScript 내장 Array.sort()를 사용합니다.',
  complexity: 'O(n log n)',
  color: '#7b1fa2',
  sort(data: number[]): number[] {
    return [...data].sort((a, b) => a - b)
  },
}

const ALL_STRATEGIES = [bubbleSortStrategy, quickSortStrategy, mergeSortStrategy, nativeSortStrategy]

// ─────────────────────────────────────────────
// Context 훅 — Sorter 역할
// ─────────────────────────────────────────────

/**
 * useSorter: Context 역할을 하는 훅.
 *
 * TS의 Sorter 클래스가 strategy를 내부에 보관하고
 * setStrategy()로 런타임에 교체했듯이,
 * 이 훅은 currentStrategy state를 관리하고 sort()를 실행한다.
 */
function useSorter(initial: SortStrategy = bubbleSortStrategy) {
  // 현재 전략 — 런타임에 교체 가능
  const [currentStrategy, setCurrentStrategy] = useState<SortStrategy>(initial)
  const [data, setData] = useState<number[]>([64, 34, 25, 12, 22, 11, 90])
  const [sortedData, setSortedData] = useState<number[] | null>(null)
  const [sortTime, setSortTime] = useState<number>(0)
  const [log, setLog] = useState<string[]>([])

  /**
   * sort(): 현재 전략으로 데이터를 정렬한다.
   * 전략이 교체되어도 이 함수는 변경되지 않는다 — Context의 핵심.
   */
  const sort = useCallback(() => {
    const start = performance.now()
    // 전략에게 위임 — 어떤 알고리즘인지 Context는 모른다
    const result = currentStrategy.sort(data)
    const elapsed = performance.now() - start
    setSortedData(result)
    setSortTime(elapsed)
    setLog(prev => [
      `[${currentStrategy.name}] [${data.join(', ')}] → [${result.join(', ')}] (${elapsed.toFixed(3)}ms)`,
      ...prev.slice(0, 4),
    ])
  }, [currentStrategy, data])

  const randomize = useCallback(() => {
    const arr = Array.from({ length: 8 }, () => Math.floor(Math.random() * 100))
    setData(arr)
    setSortedData(null)
  }, [])

  return {
    currentStrategy,
    setStrategy: setCurrentStrategy, // Sorter.setStrategy()에 해당
    data, setData, sortedData, sortTime, sort, randomize, log,
  }
}

// ─────────────────────────────────────────────
// 배열 시각화 컴포넌트
// ─────────────────────────────────────────────

function ArrayBar({ values, color, label }: { values: number[]; color: string; label: string }) {
  const max = Math.max(...values)
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
        {values.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%', background: color, borderRadius: '3px 3px 0 0',
              height: `${(v / max) * 70}px`, minHeight: 4,
            }} />
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  const sorter = useSorter()

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Strategy 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        정렬 전략을 런타임에 교체합니다. Context(useSorter)는 어떤 알고리즘인지 모르고 전략에게 위임합니다.
      </p>

      {/* 전략 선택 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>
          전략 선택 — Sorter.setStrategy() 호출
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ALL_STRATEGIES.map(s => (
            <button key={s.name} onClick={() => sorter.setStrategy(s)}
              style={{
                padding: '8px 16px', borderRadius: 6, border: `2px solid ${s.color}`, cursor: 'pointer', fontSize: 13,
                background: sorter.currentStrategy.name === s.name ? s.color : 'white',
                color: sorter.currentStrategy.name === s.name ? 'white' : s.color,
                fontWeight: sorter.currentStrategy.name === s.name ? 'bold' : 'normal',
              }}>
              {s.name}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>{s.complexity}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#666', background: '#f5f5f5', padding: '6px 12px', borderRadius: 4, display: 'inline-block' }}>
          현재 전략: <strong style={{ color: sorter.currentStrategy.color }}>{sorter.currentStrategy.name}</strong> — {sorter.currentStrategy.description}
        </div>
      </div>

      {/* 데이터 입력 */}
      <div style={{ marginBottom: 16, background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>정렬할 데이터</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={sorter.data.join(', ')}
            onChange={e => {
              const nums = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
              sorter.setData(nums)
              // 데이터 변경 시 결과 초기화
            }}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'monospace' }}
          />
          <button onClick={sorter.randomize}
            style={{ padding: '8px 16px', background: '#607d8b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            랜덤
          </button>
        </div>

        <ArrayBar values={sorter.data} color={sorter.currentStrategy.color} label="정렬 전" />

        <div style={{ margin: '12px 0' }}>
          <button onClick={sorter.sort}
            style={{
              padding: '10px 28px', background: sorter.currentStrategy.color,
              color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
            }}>
            sort() 실행 ({sorter.currentStrategy.name})
          </button>
          {sorter.sortTime > 0 && (
            <span style={{ marginLeft: 12, fontSize: 12, color: '#888' }}>
              실행 시간: {sorter.sortTime.toFixed(3)}ms
            </span>
          )}
        </div>

        {sorter.sortedData && (
          <ArrayBar values={sorter.sortedData} color={sorter.currentStrategy.color} label="정렬 후" />
        )}
      </div>

      {/* 실행 로그 */}
      {sorter.log.length > 0 && (
        <div style={{ background: '#1a1a1a', color: '#a5d6a7', padding: 12, borderRadius: 6, fontSize: 12, fontFamily: 'monospace', marginBottom: 16 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>실행 이력 (전략 변경 추적):</div>
          {sorter.log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>useSorter()</code>가 Context — 어떤 알고리즘인지 모르고 <code>strategy.sort()</code>에 위임한다</li>
          <li>전략 버튼 클릭 = <code>setStrategy()</code> — if/else 없이 런타임에 알고리즘 교체</li>
          <li>새 정렬 알고리즘 추가 시 <code>SortStrategy</code> 객체만 만들면 된다 — Context 코드 무변경</li>
          <li>실행 로그에서 전략 교체가 이력에 기록되는 것을 확인할 수 있다</li>
        </ul>
      </div>
    </div>
  )
}
