/**
 * Builder 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Product (HttpRequest)          → 폼에서 구성되는 최종 요청 객체
 * - Builder (HttpRequestBuilder)   → useRequestBuilder() 커스텀 훅
 * - ConcreteBuilder                → 훅 내부의 set* 함수들 (메서드 체이닝 대신 개별 setter)
 * - Director                       → 빠른 설정 버튼들 (미리 정의된 조합)
 *
 * 왜 커스텀 훅인가?
 * - TS의 Builder는 set* 메서드를 호출해 단계별로 객체를 구성했다.
 * - React 훅은 useState로 각 부품 상태를 관리하고, build()가 최종 객체를 조립한다.
 * - "단계별로 복잡한 객체를 구성"하는 Builder의 본질이 그대로 유지된다.
 */

import { useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// Product 타입 — Builder가 최종적으로 만드는 객체
// ─────────────────────────────────────────────

interface HttpRequest {
  method: string
  url: string
  headers: Record<string, string>
  body: string
  timeout: number
  retries: number
}

// ─────────────────────────────────────────────
// Builder 훅 — 단계별로 HttpRequest를 구성한다
// ─────────────────────────────────────────────

/**
 * useRequestBuilder: Builder 패턴을 구현한 커스텀 훅.
 *
 * TS 구현에서는 builder.setMethod().setUrl().build() 처럼 체이닝했다.
 * React에서는 각 set* 함수가 useState를 업데이트하고,
 * build()가 현재 상태를 조합해 최종 HttpRequest 객체를 반환한다.
 */
function useRequestBuilder() {
  // 각 "부품"을 개별 state로 관리 — Builder의 내부 필드에 해당
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [body, setBody] = useState('')
  const [timeout, setTimeout] = useState(5000)
  const [retries, setRetries] = useState(0)

  // 헤더 추가 — Builder.setHeader()에 해당
  const addHeader = useCallback((key: string, value: string) => {
    setHeaders(prev => ({ ...prev, [key]: value }))
  }, [])

  // 헤더 제거
  const removeHeader = useCallback((key: string) => {
    setHeaders(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  /**
   * build(): 현재까지 설정된 부품들로 완성된 HttpRequest를 반환한다.
   * TS의 builder.build()와 완전히 동일한 역할이다.
   */
  const build = useCallback((): HttpRequest | null => {
    if (!url) return null // 필수 값 검증
    return { method, url, headers: { ...headers }, body, timeout, retries }
  }, [method, url, headers, body, timeout, retries])

  /**
   * reset(): 빌더를 초기 상태로 되돌린다.
   */
  const reset = useCallback(() => {
    setMethod('GET')
    setUrl('')
    setHeaders({})
    setBody('')
    setTimeout(5000)
    setRetries(0)
  }, [])

  return {
    // 현재 상태 (각 부품)
    method, url, headers, body, timeout, retries,
    // set* 함수들 (Builder의 메서드들)
    setMethod, setUrl, addHeader, removeHeader, setBody, setTimeout, setRetries,
    // 최종 조립 및 초기화
    build, reset,
  }
}

// ─────────────────────────────────────────────
// Director 함수들 — 자주 쓰는 요청 조합을 미리 정의
// ─────────────────────────────────────────────

/**
 * Director: TS의 HttpRequestDirector와 같은 역할.
 * 자주 사용하는 요청 설정을 빠르게 적용하는 preset 함수들.
 */
type BuilderSetters = ReturnType<typeof useRequestBuilder>

function applyGetPreset(b: BuilderSetters, url: string) {
  b.reset()
  b.setMethod('GET')
  b.setUrl(url)
  b.addHeader('Accept', 'application/json')
}

function applyJsonPostPreset(b: BuilderSetters, url: string) {
  b.reset()
  b.setMethod('POST')
  b.setUrl(url)
  b.addHeader('Content-Type', 'application/json')
  b.addHeader('Accept', 'application/json')
  b.setBody('{"key": "value"}')
}

function applyResilientPreset(b: BuilderSetters, url: string) {
  b.reset()
  b.setMethod('GET')
  b.setUrl(url)
  b.addHeader('Accept', 'application/json')
  b.setTimeout(10000)
  b.setRetries(3)
}

// ─────────────────────────────────────────────
// 헤더 편집기 서브컴포넌트
// ─────────────────────────────────────────────

function HeaderEditor({ headers, onAdd, onRemove }: {
  headers: Record<string, string>
  onAdd: (k: string, v: string) => void
  onRemove: (k: string) => void
}) {
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const handleAdd = () => {
    if (newKey && newVal) {
      onAdd(newKey, newVal)
      setNewKey('')
      setNewVal('')
    }
  }

  return (
    <div>
      {Object.entries(headers).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 13 }}>
          <span style={{ background: '#e8eaf6', padding: '2px 8px', borderRadius: 4 }}>{k}: {v}</span>
          <button onClick={() => onRemove(k)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#f44336' }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <input placeholder="키" value={newKey} onChange={e => setNewKey(e.target.value)}
          style={{ flex: 1, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
        <input placeholder="값" value={newVal} onChange={e => setNewVal(e.target.value)}
          style={{ flex: 2, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
        <button onClick={handleAdd}
          style={{ padding: '4px 10px', background: '#5c6bc0', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          추가
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App 컴포넌트
// ─────────────────────────────────────────────

export default function App() {
  const builder = useRequestBuilder()
  const [builtRequest, setBuiltRequest] = useState<HttpRequest | null>(null)
  const [error, setError] = useState('')

  const handleBuild = () => {
    const result = builder.build()
    if (!result) {
      setError('URL은 필수입니다.')
      setBuiltRequest(null)
    } else {
      setError('')
      setBuiltRequest(result)
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Builder 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        useRequestBuilder 훅이 Builder 역할을 합니다. 단계별로 요청을 구성한 뒤 build()로 완성합니다.
      </p>

      {/* Director 프리셋 버튼들 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>Director 프리셋 (자주 쓰는 조합 자동 설정)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'GET 요청', fn: () => applyGetPreset(builder, 'https://api.example.com/users') },
            { label: 'JSON POST', fn: () => applyJsonPostPreset(builder, 'https://api.example.com/data') },
            { label: '재시도 요청', fn: () => applyResilientPreset(builder, 'https://api.external.com/data') },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn}
              style={{ padding: '8px 16px', background: '#7986cb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              {label}
            </button>
          ))}
          <button onClick={builder.reset}
            style={{ padding: '8px 16px', background: '#bdbdbd', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            초기화
          </button>
        </div>
      </div>

      {/* Builder 단계별 설정 폼 */}
      <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px' }}>Builder — 단계별 구성</h3>

        {/* setMethod */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 'bold' }}>
            1단계: setMethod()
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
              <button key={m} onClick={() => builder.setMethod(m)}
                style={{
                  padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: builder.method === m ? '#1976d2' : '#ddd',
                  color: builder.method === m ? 'white' : '#333',
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* setUrl */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 'bold' }}>
            2단계: setUrl() <span style={{ color: '#f44336' }}>*필수</span>
          </label>
          <input value={builder.url} onChange={e => builder.setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
        </div>

        {/* addHeader */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 'bold' }}>
            3단계: setHeader() (여러 번 호출 가능)
          </label>
          <HeaderEditor headers={builder.headers} onAdd={builder.addHeader} onRemove={builder.removeHeader} />
        </div>

        {/* setBody (POST/PUT만 표시) */}
        {['POST', 'PUT', 'PATCH'].includes(builder.method) && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 'bold' }}>
              4단계: setBody()
            </label>
            <textarea value={builder.body} onChange={e => builder.setBody(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
          </div>
        )}

        {/* setTimeout, setRetries */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 'bold' }}>
              5단계: setTimeout() (ms)
            </label>
            <input type="number" value={builder.timeout} onChange={e => builder.setTimeout(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 'bold' }}>
              6단계: setRetries()
            </label>
            <input type="number" value={builder.retries} onChange={e => builder.setRetries(Number(e.target.value))}
              min={0}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* build() 호출 */}
        <button onClick={handleBuild}
          style={{ padding: '10px 28px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
          build() — 요청 생성
        </button>
        {error && <span style={{ color: '#f44336', marginLeft: 12, fontSize: 13 }}>{error}</span>}
      </div>

      {/* 완성된 Product 표시 */}
      {builtRequest && (
        <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', color: '#2e7d32' }}>완성된 HttpRequest (Product)</h3>
          <pre style={{ margin: 0, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(builtRequest, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>useRequestBuilder()</code> 훅이 Builder — set* 함수들이 단계별 설정 메서드</li>
          <li><code>build()</code>가 현재 상태를 조합해 완성된 Product를 반환한다</li>
          <li>프리셋 버튼들이 Director — 자주 쓰는 조합을 미리 정의한다</li>
          <li>필수 값(URL)이 없으면 build()가 실패한다 — 유효성 검증</li>
        </ul>
      </div>
    </div>
  )
}
