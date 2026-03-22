/**
 * Facade 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - 서브시스템 (TV, Amplifier 등) → 각각의 개별 상태와 제어 훅 (useTV, useAmplifier 등)
 * - Facade (HomeTheaterFacade)    → useHomeTheater() 훅 — 복잡한 서브시스템을 단순한 인터페이스로 통합
 * - Client                        → ControlPanel 컴포넌트 — Facade 훅만 사용
 *
 * 왜 useFacade 훅인가?
 * - TS에서 클라이언트는 HomeTheaterFacade.watchMovie() 하나만 호출하면 됐다.
 * - React에서 useHomeTheater()가 복잡한 상태 관리(TV, 앰프, 스트리밍, 조명)를
 *   하나의 훅으로 추상화해 클라이언트 컴포넌트에게 단순한 API만 노출한다.
 */

import { useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// 서브시스템 상태 타입들
// ─────────────────────────────────────────────

interface TVState { isOn: boolean; input: string; brightness: number }
interface AmpState { isOn: boolean; volume: number; surroundMode: string }
interface StreamingState { isOn: boolean; app: string; content: string }
interface LightsState { isOn: boolean; brightness: number; color: string }

// ─────────────────────────────────────────────
// Facade 훅 — 복잡한 서브시스템을 단순한 인터페이스로 통합
// ─────────────────────────────────────────────

/**
 * useHomeTheater: Facade 패턴을 구현한 커스텀 훅.
 *
 * 클라이언트 컴포넌트에게는 watchMovie(), endMovie() 같은 단순한 메서드만 노출한다.
 * TV, 앰프, 스트리밍, 조명의 복잡한 상태 관리는 모두 이 훅 내부에 숨겨져 있다.
 *
 * 왜 하나의 훅인가?
 * - 클라이언트가 4개의 서브시스템 훅을 따로 import해 초기화 순서를 알아야 한다면
 *   Facade가 없는 것과 다름없다.
 * - useHomeTheater() 하나로 모든 복잡성이 캡슐화된다.
 */
function useHomeTheater() {
  // 각 서브시스템의 상태 (클라이언트에게는 노출되지 않는다)
  const [tv, setTV] = useState<TVState>({ isOn: false, input: 'HDMI1', brightness: 80 })
  const [amp, setAmp] = useState<AmpState>({ isOn: false, volume: 30, surroundMode: '스테레오' })
  const [streaming, setStreaming] = useState<StreamingState>({ isOn: false, app: '', content: '' })
  const [lights, setLights] = useState<LightsState>({ isOn: true, brightness: 100, color: '흰색' })
  const [log, setLog] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-7), `> ${msg}`]) // 최근 8개 유지
  }, [])

  /**
   * watchMovie(): Facade 메서드 — 복잡한 여러 단계를 하나의 호출로 통합.
   *
   * 클라이언트는 이 순서(조명 → TV → 앰프 → 스트리밍)를 알 필요가 없다.
   * 순서가 바뀌거나 단계가 추가되어도 클라이언트 코드는 변경되지 않는다.
   */
  const watchMovie = useCallback((title: string, appName: string = 'Netflix') => {
    addLog('영화 모드 시작...')
    // 1단계: 조명 설정
    setLights({ isOn: true, brightness: 10, color: '주황' })
    addLog('조명: 영화 모드 (주황 10%)')
    // 2단계: TV 켜기
    setTV({ isOn: true, input: 'HDMI1', brightness: 60 })
    addLog('TV: 켜짐, 시네마 모드')
    // 3단계: 앰프 설정
    setAmp({ isOn: true, volume: 40, surroundMode: '돌비 애트모스' })
    addLog('앰프: 돌비 애트모스, 볼륨 40')
    // 4단계: 스트리밍
    setStreaming({ isOn: true, app: appName, content: title })
    addLog(`${appName}: "${title}" 재생 중`)
  }, [addLog])

  /**
   * endMovie(): 모든 기기를 안전하게 종료.
   * 역순으로 종료하는 것이 중요 — 클라이언트가 이 순서를 몰라도 된다.
   */
  const endMovie = useCallback(() => {
    setStreaming({ isOn: false, app: '', content: '' })
    setAmp({ isOn: false, volume: 30, surroundMode: '스테레오' })
    setTV({ isOn: false, input: 'HDMI1', brightness: 80 })
    setLights({ isOn: true, brightness: 80, color: '흰색' })
    addLog('영화 종료, 모든 기기 정리됨')
  }, [addLog])

  /**
   * listenToMusic(): 음악 감상 모드
   */
  const listenToMusic = useCallback((playlist: string) => {
    setLights({ isOn: true, brightness: 60, color: '보라' })
    setAmp({ isOn: true, volume: 60, surroundMode: '스테레오' })
    setStreaming({ isOn: true, app: 'Spotify', content: playlist })
    // TV는 켜지 않는다
    addLog(`음악 모드: "${playlist}" 재생 중`)
  }, [addLog])

  /**
   * shutdownAll(): 전체 시스템 종료
   */
  const shutdownAll = useCallback(() => {
    setStreaming({ isOn: false, app: '', content: '' })
    setAmp({ isOn: false, volume: 30, surroundMode: '스테레오' })
    setTV({ isOn: false, input: 'HDMI1', brightness: 80 })
    setLights({ isOn: false, brightness: 0, color: '흰색' })
    addLog('전체 시스템 종료')
  }, [addLog])

  // Facade가 노출하는 인터페이스 — 단순하고 명확한 메서드들만
  return {
    // 단순화된 Facade 메서드들 (클라이언트 사용)
    watchMovie, endMovie, listenToMusic, shutdownAll,
    // 현재 상태 (모니터링 목적 — 클라이언트가 직접 서브시스템을 제어하지 않는다)
    tv, amp, streaming, lights, log,
  }
}

// ─────────────────────────────────────────────
// 서브시스템 상태 표시 컴포넌트 (읽기 전용)
// ─────────────────────────────────────────────

function SystemStatus({ label, isOn, details }: { label: string; isOn: boolean; details: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, border: `2px solid ${isOn ? '#4caf50' : '#ddd'}`,
      background: isOn ? '#e8f5e9' : '#fafafa', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOn ? '#4caf50' : '#bdbdbd', display: 'inline-block' }} />
        <strong style={{ fontSize: 13 }}>{label}</strong>
      </div>
      {isOn && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{details}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App — Facade 훅만 사용하는 클라이언트
// ─────────────────────────────────────────────

export default function App() {
  // 클라이언트: useHomeTheater() 하나만 알면 된다
  const theater = useHomeTheater()
  const [movieTitle, setMovieTitle] = useState('인터스텔라')
  const [playlist, setPlaylist] = useState('재즈 명곡 모음')

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Facade 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        <code>useHomeTheater()</code> 하나로 TV, 앰프, 스트리밍, 조명을 통합 제어합니다.<br />
        클라이언트는 복잡한 서브시스템 초기화 순서를 알 필요가 없습니다.
      </p>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* 왼쪽: Facade 컨트롤 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>
            Facade 인터페이스 (클라이언트가 사용하는 단순한 메서드들)
          </div>

          {/* 영화 보기 */}
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>watchMovie()</div>
            <input value={movieTitle} onChange={e => setMovieTitle(e.target.value)}
              placeholder="영화 제목"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => theater.watchMovie(movieTitle, 'Netflix')}
                style={{ flex: 1, padding: '8px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Netflix로 보기
              </button>
              <button onClick={() => theater.watchMovie(movieTitle, 'Watcha')}
                style={{ flex: 1, padding: '8px', background: '#7b1fa2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Watcha로 보기
              </button>
            </div>
          </div>

          {/* 음악 감상 */}
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>listenToMusic()</div>
            <input value={playlist} onChange={e => setPlaylist(e.target.value)}
              placeholder="플레이리스트"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', marginBottom: 8 }} />
            <button onClick={() => theater.listenToMusic(playlist)}
              style={{ width: '100%', padding: '8px', background: '#388e3c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              음악 재생
            </button>
          </div>

          {/* 종료 버튼들 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={theater.endMovie}
              style={{ flex: 1, padding: '10px', background: '#f57c00', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              endMovie()
            </button>
            <button onClick={theater.shutdownAll}
              style={{ flex: 1, padding: '10px', background: '#616161', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              shutdownAll()
            </button>
          </div>

          {/* 로그 */}
          {theater.log.length > 0 && (
            <div style={{ marginTop: 12, background: '#1a1a1a', color: '#4caf50', padding: 12, borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}>
              {theater.log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        {/* 오른쪽: 서브시스템 상태 (읽기 전용 모니터링) */}
        <div style={{ width: 220 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>
            서브시스템 상태 (Facade가 제어)
          </div>
          <SystemStatus label="TV" isOn={theater.tv.isOn}
            details={`입력: ${theater.tv.input} | 밝기: ${theater.tv.brightness}%`} />
          <SystemStatus label="앰프" isOn={theater.amp.isOn}
            details={`볼륨: ${theater.amp.volume} | ${theater.amp.surroundMode}`} />
          <SystemStatus label="스트리밍" isOn={theater.streaming.isOn}
            details={`${theater.streaming.app}: "${theater.streaming.content}"`} />
          <SystemStatus label="조명" isOn={theater.lights.isOn}
            details={`밝기: ${theater.lights.brightness}% | 색상: ${theater.lights.color}`} />
        </div>
      </div>

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>useHomeTheater()</code>가 Facade — 4개 서브시스템을 단순한 API로 통합</li>
          <li>클라이언트는 TV/앰프/스트리밍/조명의 초기화 순서를 전혀 모른다</li>
          <li>Facade는 서브시스템을 완전히 숨기지 않는다 — 상태는 읽기 전용으로 노출</li>
          <li>새 기능(프레젠테이션 모드 등) 추가 시 Facade에만 메서드를 추가한다</li>
        </ul>
      </div>
    </div>
  )
}
