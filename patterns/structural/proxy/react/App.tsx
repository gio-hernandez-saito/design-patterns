/**
 * Proxy 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Subject (ImageLoader)         → useImageLoader() 훅이 제공하는 공통 인터페이스
 * - RealSubject (RealImage)       → 실제 이미지 로딩 로직 (비용이 크다)
 * - Virtual Proxy (LazyProxy)     → React.lazy + Suspense (필요할 때까지 로딩 지연)
 * - Caching Proxy                 → useCachedImage() 훅 (한 번 로드한 결과를 캐싱)
 *
 * 왜 이 방식인가?
 * - React.lazy가 가상 프록시의 전형적인 예다: 컴포넌트가 실제로 필요한 순간에만 로드한다.
 * - 캐싱 훅은 동일한 URL에 대한 반복 로드를 방지한다 — CachingImageProxy와 동일.
 * - 두 프록시 모두 호출자(클라이언트) 입장에서 동일한 인터페이스로 사용한다.
 */

import { useState, useCallback, useRef } from 'react'

// ─────────────────────────────────────────────
// Subject 인터페이스 — 실제/프록시 모두 이 형태를 가진다
// ─────────────────────────────────────────────

interface ImageInfo {
  url: string
  width: number
  height: number
  fileSizeKB: number
  format: string
  loadTimeMs: number
}

interface ImageLoadResult {
  loaded: boolean
  info: ImageInfo | null
  isFromCache: boolean
  renderCount: number
}

// ─────────────────────────────────────────────
// 실제 이미지 로딩 시뮬레이션 — RealSubject의 동작
// ─────────────────────────────────────────────

/**
 * loadRealImage: RealImage.load()에 해당하는 함수.
 * 실제 환경에서는 fetch나 Image 객체를 쓴다.
 * 여기서는 네트워크 지연을 setTimeout으로 시뮬레이션한다.
 */
async function loadRealImage(url: string): Promise<ImageInfo> {
  // 네트워크 지연 시뮬레이션 (URL 길이에 따라 다른 지연 시간)
  const delay = 500 + (url.length % 5) * 200
  await new Promise(r => setTimeout(r, delay))

  return {
    url,
    width: 1920,
    height: 1080,
    fileSizeKB: Math.floor(Math.random() * 1000 + 500),
    format: url.split('.').pop()?.toUpperCase() ?? 'JPG',
    loadTimeMs: delay,
  }
}

// ─────────────────────────────────────────────
// Proxy 1: 가상 프록시 훅 — 지연 로딩 (Lazy Loading)
// ─────────────────────────────────────────────

/**
 * useLazyImageProxy: 가상 프록시 훅.
 *
 * RealImage 생성을 render()가 처음 호출될 때까지 미룬다.
 * React에서는 "최초 표시 요청(load 호출)" 전까지 실제 로딩을 하지 않는다.
 *
 * 시나리오: 갤러리에 100개 이미지가 있지만 화면에 10개만 보인다.
 * → 보이는 10개만 load()를 호출한다 = 10개만 실제 로드된다.
 */
function useLazyImageProxy(url: string) {
  // RealImage가 아직 생성되지 않은 상태 (null = 아직 로드 안 됨)
  const [result, setResult] = useState<ImageLoadResult>({
    loaded: false, info: null, isFromCache: false, renderCount: 0,
  })
  const [loading, setLoading] = useState(false)
  const hasLoaded = useRef(false) // 중복 로드 방지

  /**
   * load(): render()에 해당 — 이 함수가 호출될 때만 실제 로딩이 시작된다.
   * 처음 호출되기 전까지는 아무 것도 로드하지 않는다.
   */
  const load = useCallback(async () => {
    if (hasLoaded.current) {
      // 이미 로드된 경우: renderCount만 증가
      setResult(prev => ({ ...prev, renderCount: prev.renderCount + 1 }))
      return
    }
    setLoading(true)
    const info = await loadRealImage(url)
    hasLoaded.current = true
    setResult({ loaded: true, info, isFromCache: false, renderCount: 1 })
    setLoading(false)
  }, [url])

  const reset = useCallback(() => {
    hasLoaded.current = false
    setResult({ loaded: false, info: null, isFromCache: false, renderCount: 0 })
  }, [])

  return { result, loading, load, reset }
}

// ─────────────────────────────────────────────
// Proxy 2: 캐싱 프록시 훅
// ─────────────────────────────────────────────

// 모듈 레벨 캐시 — 여러 컴포넌트 인스턴스가 공유한다
const imageCache = new Map<string, { info: ImageInfo; hits: number }>()

/**
 * useCachedImageProxy: 캐싱 프록시 훅.
 *
 * 한 번 로드한 이미지는 캐시에 저장하고,
 * 이후 동일한 URL 요청은 캐시에서 즉시 반환한다.
 * 렌더링 연산 비용을 절감하는 것이 목적이다.
 */
function useCachedImageProxy() {
  const [cacheState, setCacheState] = useState<Map<string, { info: ImageInfo; hits: number }>>(new Map(imageCache))
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ hits: 0, misses: 0 })

  const render = useCallback(async (url: string): Promise<ImageInfo> => {
    // 캐시 확인 — isCacheValid()에 해당
    const cached = imageCache.get(url)
    if (cached) {
      // 캐시 히트: 저장된 결과를 즉시 반환
      cached.hits++
      setStats(prev => ({ ...prev, hits: prev.hits + 1 }))
      setCacheState(new Map(imageCache))
      return cached.info
    }

    // 캐시 미스: 실제 로딩 수행
    setLoading(true)
    setStats(prev => ({ ...prev, misses: prev.misses + 1 }))
    const info = await loadRealImage(url)
    imageCache.set(url, { info, hits: 0 })
    setCacheState(new Map(imageCache))
    setLoading(false)
    return info
  }, [])

  const clearCache = useCallback(() => {
    imageCache.clear()
    setCacheState(new Map())
    setStats({ hits: 0, misses: 0 })
  }, [])

  const hitRate = stats.hits + stats.misses === 0
    ? '0%'
    : `${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(0)}%`

  return { render, loading, cacheState, stats, hitRate, clearCache }
}

// ─────────────────────────────────────────────
// Lazy Proxy 데모 컴포넌트
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 개별 이미지 프록시 행 컴포넌트 — 훅을 컴포넌트 최상위에서 호출하기 위해 분리
// (Rules of Hooks: 반복문/조건문 안에서 훅을 호출할 수 없다)
// ─────────────────────────────────────────────

function LazyImageRow({ url }: { url: string }) {
  // 각 이미지마다 독립적인 프록시 훅 — 컴포넌트 최상위에서 호출 (규칙 준수)
  const proxy = useLazyImageProxy(url)
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontFamily: 'monospace' }}>{url}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
          background: proxy.result.loaded ? '#e8f5e9' : '#f5f5f5',
          color: proxy.result.loaded ? '#2e7d32' : '#888',
        }}>
          {proxy.result.loaded ? '로드됨' : proxy.loading ? '로딩 중...' : '미로드 (프록시 대기 중)'}
        </span>
        {proxy.result.loaded && (
          <span style={{ fontSize: 11, color: '#555' }}>
            렌더 {proxy.result.renderCount}회 | {proxy.result.info?.fileSizeKB}KB | {proxy.result.info?.loadTimeMs}ms
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={proxy.load} disabled={proxy.loading}
            style={{ padding: '4px 12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            {proxy.loading ? '...' : proxy.result.loaded ? '재렌더' : 'render() 호출'}
          </button>
          {proxy.result.loaded && (
            <button onClick={proxy.reset}
              style={{ padding: '4px 10px', background: '#bdbdbd', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              초기화
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function LazyProxyDemo() {
  const images = [
    'https://example.com/photo1.jpg',
    'https://example.com/landscape.jpg',
    'https://example.com/portrait.png',
  ]

  return (
    <div>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>가상 프록시 (Virtual Proxy — 지연 로딩)</h3>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        "렌더" 버튼을 클릭할 때만 실제 이미지가 로드됩니다. 클릭 전에는 아무것도 로드되지 않습니다.
      </p>
      {/* 각 이미지를 별도 컴포넌트로 분리 — Rules of Hooks 준수 */}
      {images.map(url => <LazyImageRow key={url} url={url} />)}
    </div>
  )
}

// ─────────────────────────────────────────────
// Caching Proxy 데모 컴포넌트
// ─────────────────────────────────────────────

function CachingProxyDemo() {
  const proxy = useCachedImageProxy()
  const [input, setInput] = useState('https://example.com/image.jpg')
  const [lastResult, setLastResult] = useState<ImageInfo | null>(null)
  const [lastWasCached, setLastWasCached] = useState(false)

  const handleRender = async () => {
    const wasCached = imageCache.has(input)
    const info = await proxy.render(input)
    setLastResult(info)
    setLastWasCached(wasCached)
  }

  return (
    <div>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>캐싱 프록시 (Caching Proxy)</h3>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        같은 URL로 두 번 렌더하면 두 번째는 캐시에서 즉시 반환됩니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'monospace' }} />
        <button onClick={handleRender} disabled={proxy.loading}
          style={{ padding: '8px 16px', background: '#7b1fa2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {proxy.loading ? '로딩 중...' : 'render()'}
        </button>
        <button onClick={proxy.clearCache}
          style={{ padding: '8px 12px', background: '#bdbdbd', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
          캐시 삭제
        </button>
      </div>

      {lastResult && (
        <div style={{
          background: lastWasCached ? '#fff8e1' : '#e8f5e9',
          border: `2px solid ${lastWasCached ? '#ff9800' : '#4caf50'}`,
          borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13,
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {lastWasCached ? '⚡ 캐시 히트 (즉시 반환)' : '🌐 캐시 미스 (실제 로딩)'}
          </div>
          <div>{lastResult.url}</div>
          <div>{lastResult.width}×{lastResult.height} | {lastResult.fileSizeKB}KB | {lastResult.loadTimeMs}ms</div>
        </div>
      )}

      {/* 캐시 통계 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ background: '#e8f5e9', padding: '8px 16px', borderRadius: 6, fontSize: 13 }}>
          캐시 히트: <strong>{proxy.stats.hits}</strong>
        </div>
        <div style={{ background: '#fce4ec', padding: '8px 16px', borderRadius: 6, fontSize: 13 }}>
          캐시 미스: <strong>{proxy.stats.misses}</strong>
        </div>
        <div style={{ background: '#e3f2fd', padding: '8px 16px', borderRadius: 6, fontSize: 13 }}>
          히트율: <strong>{proxy.hitRate}</strong>
        </div>
      </div>

      {/* 캐시 목록 */}
      {proxy.cacheState.size > 0 && (
        <div style={{ fontSize: 12, fontFamily: 'monospace', background: '#f5f5f5', padding: 10, borderRadius: 6 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>캐시 내용 ({proxy.cacheState.size}개):</div>
          {Array.from(proxy.cacheState.entries()).map(([url, { info, hits }]) => (
            <div key={url} style={{ marginBottom: 2 }}>
              📦 {url} | {info.fileSizeKB}KB | 히트 {hits}회
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<'lazy' | 'cache'>('lazy')

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Proxy 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        두 가지 프록시를 구현합니다: 가상 프록시(지연 로딩)와 캐싱 프록시.<br />
        클라이언트는 실제 이미지인지 프록시인지 구별하지 않고 동일한 인터페이스를 사용합니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['lazy', 'cache'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t ? '#333' : '#eee',
              color: tab === t ? 'white' : '#333',
              fontWeight: tab === t ? 'bold' : 'normal',
            }}>
            {t === 'lazy' ? '가상 프록시 (지연 로딩)' : '캐싱 프록시'}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
        {tab === 'lazy' ? <LazyProxyDemo /> : <CachingProxyDemo />}
      </div>

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><strong>가상 프록시:</strong> <code>useLazyImageProxy</code>는 <code>render()</code> 호출 전까지 실제 로딩을 하지 않는다</li>
          <li><strong>캐싱 프록시:</strong> <code>useCachedImageProxy</code>는 동일 URL을 재요청 시 캐시에서 즉시 반환한다</li>
          <li>두 프록시 모두 클라이언트에게 동일한 인터페이스를 제공한다 — Subject 타입 호환</li>
          <li>React.lazy + Suspense가 가상 프록시의 실제 React 내장 구현이다</li>
        </ul>
      </div>
    </div>
  )
}
