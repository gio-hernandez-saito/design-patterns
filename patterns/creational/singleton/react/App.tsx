/**
 * Singleton 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Singleton 인스턴스  → useRef로 보관하는 단일 config 객체
 * - 전역 진입점        → AppConfigContext (Provider가 단 하나만 존재)
 * - getInstance()      → useAppConfig() 커스텀 훅
 *
 * 왜 Context + useRef인가?
 * - Context는 컴포넌트 트리 어디서든 같은 객체에 접근하게 해준다 (전역 진입점).
 * - useRef는 리렌더링 사이에서도 동일한 객체 참조를 유지한다 (단일 인스턴스).
 * - 두 가지를 조합하면 TS의 static instance와 동일한 효과가 React 방식으로 구현된다.
 */

import { createContext, useContext, useRef, useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// 설정 타입 정의
// ─────────────────────────────────────────────

interface AppConfig {
  logLevel: string
  apiUrl: string
  timeout: string
}

interface AppConfigStore {
  get(key: keyof AppConfig): string
  set(key: keyof AppConfig, value: string): void
  getAll(): AppConfig
}

// ─────────────────────────────────────────────
// Context 정의 — Singleton의 "전역 진입점" 역할
// ─────────────────────────────────────────────

/**
 * AppConfigContext: Singleton 패턴에서의 "전역 진입점"에 해당한다.
 * Provider가 트리 최상단에 하나만 위치하므로, 어디서든 같은 인스턴스에 접근한다.
 */
const AppConfigContext = createContext<AppConfigStore | null>(null)

/**
 * useAppConfig: Singleton의 getInstance()에 해당하는 커스텀 훅.
 * Context에서 유일한 설정 객체를 꺼내 반환한다.
 */
function useAppConfig(): AppConfigStore {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('AppConfigProvider 내부에서 사용해야 합니다')
  return ctx
}

// ─────────────────────────────────────────────
// Provider — Singleton 인스턴스를 생성하고 제공하는 컴포넌트
// ─────────────────────────────────────────────

/**
 * AppConfigProvider: Singleton 인스턴스를 딱 한 번 생성해 트리에 제공한다.
 *
 * useRef를 쓰는 이유:
 * - useState와 달리 값이 바뀌어도 리렌더링을 유발하지 않는다.
 * - 컴포넌트가 재렌더링되어도 ref.current는 같은 객체를 가리킨다.
 * → 이것이 "단일 인스턴스"를 보장하는 메커니즘이다.
 */
function AppConfigProvider({ children }: { children: React.ReactNode }) {
  // useRef로 config 데이터를 보관: 리렌더링이 일어나도 같은 객체가 유지된다
  const configRef = useRef<AppConfig>({
    logLevel: 'info',
    apiUrl: 'https://api.example.com',
    timeout: '5000',
  })

  // UI 갱신을 위한 강제 리렌더 트리거 (set이 호출됐을 때만 화면을 갱신한다)
  const [, forceRender] = useState(0)

  // store 객체 자체도 useRef로 고정 — 매 렌더마다 새 객체가 생성되지 않게 한다
  const storeRef = useRef<AppConfigStore>({
    get(key) {
      return configRef.current[key]
    },
    set(key, value) {
      configRef.current = { ...configRef.current, [key]: value }
      forceRender(n => n + 1) // 변경 후 화면 갱신
    },
    getAll() {
      return { ...configRef.current }
    },
  })

  return (
    <AppConfigContext.Provider value={storeRef.current}>
      {children}
    </AppConfigContext.Provider>
  )
}

// ─────────────────────────────────────────────
// 하위 컴포넌트 A — useAppConfig()로 Singleton 접근
// ─────────────────────────────────────────────

/**
 * ComponentA: Singleton(AppConfigContext)에 접근해 설정을 읽고 변경하는 컴포넌트.
 * Provider와의 거리(depth)와 관계없이 항상 같은 인스턴스를 가리킨다.
 */
function ComponentA() {
  // getInstance() 에 해당: 항상 동일한 singleton 인스턴스를 반환
  const config = useAppConfig()
  const [localLog, setLocalLog] = useState<string[]>([])

  const handleChange = useCallback((key: keyof AppConfig, value: string) => {
    config.set(key, value)
    setLocalLog(prev => [...prev, `ComponentA → ${key} = "${value}" 로 변경`])
  }, [config])

  return (
    <div style={{ border: '1px solid #4caf50', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 12px', color: '#4caf50' }}>컴포넌트 A (Singleton 접근)</h3>
      <div style={{ marginBottom: 12 }}>
        <strong>현재 logLevel:</strong> {config.get('logLevel')}
        <button
          onClick={() => handleChange('logLevel', config.get('logLevel') === 'info' ? 'debug' : 'info')}
          style={{ marginLeft: 8, padding: '4px 12px', cursor: 'pointer' }}
        >
          토글
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <strong>현재 apiUrl:</strong> {config.get('apiUrl')}
        <button
          onClick={() => handleChange('apiUrl', 'https://api.changed.com')}
          style={{ marginLeft: 8, padding: '4px 12px', cursor: 'pointer' }}
        >
          변경
        </button>
      </div>
      {localLog.length > 0 && (
        <div style={{ background: '#f1f8e9', padding: 8, borderRadius: 4, fontSize: 12 }}>
          {localLog.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 하위 컴포넌트 B — 같은 Singleton 인스턴스를 공유함을 증명
// ─────────────────────────────────────────────

/**
 * ComponentB: ComponentA와 다른 위치에서 같은 Singleton을 참조한다.
 * A에서 변경한 값이 B에도 즉시 반영되는 것이 Singleton의 핵심 동작이다.
 */
function ComponentB() {
  const config = useAppConfig()

  // 전체 설정을 표로 보여준다
  const all = config.getAll()

  return (
    <div style={{ border: '1px solid #2196f3', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 12px', color: '#2196f3' }}>컴포넌트 B (같은 Singleton 인스턴스)</h3>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>
        A에서 변경한 값이 여기서도 동일하게 보입니다 — 같은 인스턴스이기 때문입니다.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#e3f2fd' }}>
            <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ddd' }}>키</th>
            <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #ddd' }}>값</th>
          </tr>
        </thead>
        <tbody>
          {(Object.entries(all) as [keyof AppConfig, string][]).map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '6px 10px', border: '1px solid #ddd' }}>{k}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #ddd' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App 컴포넌트
// ─────────────────────────────────────────────

export default function App() {
  return (
    <AppConfigProvider>
      {/* Provider가 단 하나 — Singleton 인스턴스가 여기서 생성된다 */}
      <div style={{ fontFamily: 'sans-serif', maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Singleton 패턴 — React</h1>
        <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
          Context + useRef로 전역 단일 인스턴스를 구현합니다.<br />
          컴포넌트 A에서 설정을 변경하면, 같은 인스턴스를 바라보는 컴포넌트 B에도 즉시 반영됩니다.
        </p>

        <ComponentA />
        <ComponentB />

        <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13 }}>
          <strong>패턴 포인트:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><code>AppConfigProvider</code>가 Singleton 인스턴스를 딱 한 번 생성한다</li>
            <li><code>useRef</code>가 리렌더링 사이에서도 동일한 객체 참조를 보장한다</li>
            <li><code>useAppConfig()</code>는 TS의 <code>getInstance()</code>와 동일한 역할이다</li>
            <li>어떤 depth의 컴포넌트에서 호출해도 항상 같은 인스턴스를 반환한다</li>
          </ul>
        </div>
      </div>
    </AppConfigProvider>
  )
}
