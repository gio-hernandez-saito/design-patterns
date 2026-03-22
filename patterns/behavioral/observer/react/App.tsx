/**
 * Observer 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Subject (NewsAgency)           → useNewsPublisher() 훅 (구독자 목록 관리 + 알림 발행)
 * - Observer (NewsSubscriber)      → useObserver() 훅 (구독/해제 + 업데이트 수신)
 * - ConcreteObserver               → SubscriberPanel 컴포넌트 (UI로 수신 결과 표시)
 *
 * 왜 커스텀 이벤트 훅인가?
 * - TS에서 Subject는 subscribers Set을 관리하고 notify()로 update()를 호출했다.
 * - React에서 useNewsPublisher()는 useState로 구독자 목록을 관리하고
 *   publish()가 호출되면 모든 구독자의 상태를 업데이트한다.
 * - React의 상태 흐름(단방향 데이터)이 Observer의 "변경 시 알림" 패턴과 자연스럽게 맞는다.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

interface NewsItem {
  headline: string
  body: string
  publishedAt: string
}

interface SubscriberCallback {
  id: string
  name: string
  type: 'email' | 'mobile' | 'web'
  onUpdate: (news: NewsItem) => void
}

// ─────────────────────────────────────────────
// Subject 훅 — ConcreteSubject (NewsAgency) 역할
// ─────────────────────────────────────────────

/**
 * useNewsPublisher: Subject 역할을 하는 훅.
 *
 * TS의 NewsAgency가 subscribers Set을 관리했듯이,
 * 이 훅은 구독자 콜백 목록을 ref로 관리한다.
 * (ref를 쓰는 이유: 구독자 목록 변경이 리렌더링을 유발하면 안 되기 때문)
 */
function useNewsPublisher() {
  const subscribersRef = useRef<Map<string, SubscriberCallback>>(new Map())
  const [publishLog, setPublishLog] = useState<string[]>([])
  const [subscriberCount, setSubscriberCount] = useState(0)

  /**
   * subscribe(): 구독자를 등록한다.
   * TS의 agency.subscribe(subscriber)와 동일.
   */
  const subscribe = useCallback((subscriber: SubscriberCallback) => {
    subscribersRef.current.set(subscriber.id, subscriber)
    setSubscriberCount(subscribersRef.current.size)
  }, [])

  /**
   * unsubscribe(): 구독을 해제한다.
   */
  const unsubscribe = useCallback((id: string) => {
    subscribersRef.current.delete(id)
    setSubscriberCount(subscribersRef.current.size)
  }, [])

  /**
   * publish(): 새 뉴스를 발행하고 모든 구독자에게 알린다.
   *
   * TS의 agency.publish() → notify() → subscriber.update() 흐름과 동일하다.
   * 상태를 변경한 즉시 모든 구독자의 콜백을 호출한다.
   */
  const publish = useCallback((headline: string, body: string) => {
    const news: NewsItem = {
      headline,
      body,
      publishedAt: new Date().toLocaleTimeString(),
    }

    // notify(): 등록된 모든 구독자에게 알린다
    subscribersRef.current.forEach(sub => sub.onUpdate(news))

    setPublishLog(prev => [
      `[${news.publishedAt}] "${headline}" → ${subscribersRef.current.size}명에게 발송`,
      ...prev.slice(0, 4),
    ])
  }, [])

  return { subscribe, unsubscribe, publish, publishLog, subscriberCount }
}

// ─────────────────────────────────────────────
// Observer 훅 — ConcreteObserver 역할
// ─────────────────────────────────────────────

/**
 * useObserver: Observer 역할을 하는 훅.
 * 구독자로 등록하고 update()가 호출되면 받은 뉴스를 내부 상태에 저장한다.
 */
function useObserver(
  publisher: ReturnType<typeof useNewsPublisher>,
  id: string,
  name: string,
  type: 'email' | 'mobile' | 'web'
) {
  const [receivedNews, setReceivedNews] = useState<NewsItem[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)

  // subscribe 함수는 publisher가 바뀌어도 동일해야 하므로 useCallback 적용
  const subscribe = useCallback(() => {
    publisher.subscribe({
      id,
      name,
      type,
      // update() 콜백: 새 뉴스가 오면 내부 상태에 추가한다
      onUpdate: (news) => {
        setReceivedNews(prev => [news, ...prev.slice(0, 4)])
      },
    })
    setIsSubscribed(true)
  }, [publisher, id, name, type])

  const unsubscribe = useCallback(() => {
    publisher.unsubscribe(id)
    setIsSubscribed(false)
  }, [publisher, id])

  return { receivedNews, isSubscribed, subscribe, unsubscribe }
}

// ─────────────────────────────────────────────
// ConcreteObserver 컴포넌트
// ─────────────────────────────────────────────

const TYPE_CONFIG = {
  email:  { label: '📧 이메일 구독자', color: '#1976d2', bg: '#e3f2fd' },
  mobile: { label: '📱 모바일 구독자', color: '#388e3c', bg: '#e8f5e9' },
  web:    { label: '🌐 웹 구독자',     color: '#f57c00', bg: '#fff3e0' },
}

/**
 * SubscriberPanel: ConcreteObserver에 해당하는 컴포넌트.
 * 구독/해제를 제어하고 수신된 뉴스를 표시한다.
 */
function SubscriberPanel({ observer, type }: {
  observer: ReturnType<typeof useObserver>
  type: 'email' | 'mobile' | 'web'
}) {
  const cfg = TYPE_CONFIG[type]

  return (
    <div style={{
      border: `2px solid ${observer.isSubscribed ? cfg.color : '#ddd'}`,
      borderRadius: 8, padding: 12,
      background: observer.isSubscribed ? cfg.bg : '#fafafa',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: cfg.color }}>{cfg.label}</strong>
        <button
          onClick={observer.isSubscribed ? observer.unsubscribe : observer.subscribe}
          style={{
            padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12,
            background: observer.isSubscribed ? '#f44336' : cfg.color,
            color: 'white', fontWeight: 'bold',
          }}
        >
          {observer.isSubscribed ? '구독 해제' : '구독'}
        </button>
      </div>

      {observer.receivedNews.length === 0 ? (
        <div style={{ fontSize: 12, color: '#aaa' }}>
          {observer.isSubscribed ? '뉴스를 기다리는 중...' : '구독하면 뉴스를 받습니다'}
        </div>
      ) : (
        <div>
          {observer.receivedNews.map((news, i) => (
            <div key={i} style={{
              fontSize: 12, padding: '6px 8px', borderRadius: 4,
              background: i === 0 ? 'white' : 'transparent',
              border: i === 0 ? `1px solid ${cfg.color}` : 'none',
              marginBottom: 4, opacity: i === 0 ? 1 : 0.6,
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{news.headline}</div>
              <div style={{ color: '#555' }}>{news.body}</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{news.publishedAt}</div>
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

const SAMPLE_NEWS = [
  { headline: '기술 뉴스: React 20 출시', body: 'React 팀이 새 버전을 발표했습니다.' },
  { headline: '경제 뉴스: 시장 강세', body: '코스피가 장중 2% 상승했습니다.' },
  { headline: '스포츠 뉴스: 국가대표 승리', body: '한국 팀이 3-1로 승리했습니다.' },
  { headline: '날씨 뉴스: 주말 맑음', body: '이번 주말 전국 대체로 맑겠습니다.' },
]

export default function App() {
  const publisher = useNewsPublisher()

  // 세 가지 타입의 Observer 생성
  const emailObserver = useObserver(publisher, 'email-1', '이메일 구독자', 'email')
  const mobileObserver = useObserver(publisher, 'mobile-1', '모바일 구독자', 'mobile')
  const webObserver = useObserver(publisher, 'web-1', '웹 구독자', 'web')

  const [customHeadline, setCustomHeadline] = useState('')
  const [customBody, setCustomBody] = useState('')

  const handlePublish = (headline: string, body: string) => {
    publisher.publish(headline, body)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Observer 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        뉴스를 발행하면 구독 중인 옵저버들에게만 알림이 전달됩니다.<br />
        구독/해제로 Observer 등록/제거를 실시간으로 확인할 수 있습니다.
      </p>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Subject: 뉴스 발행 */}
        <div style={{ width: 260 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>
            Subject — NewsAgency (뉴스 발행) | 구독자 {publisher.subscriberCount}명
          </div>

          {/* 샘플 뉴스 발행 */}
          <div style={{ marginBottom: 12 }}>
            {SAMPLE_NEWS.map((n, i) => (
              <button key={i} onClick={() => handlePublish(n.headline, n.body)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: 6, background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                📰 {n.headline}
              </button>
            ))}
          </div>

          {/* 커스텀 뉴스 발행 */}
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>직접 발행</div>
            <input value={customHeadline} onChange={e => setCustomHeadline(e.target.value)}
              placeholder="헤드라인"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, boxSizing: 'border-box', marginBottom: 6 }} />
            <textarea value={customBody} onChange={e => setCustomBody(e.target.value)}
              placeholder="내용" rows={2}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, boxSizing: 'border-box', marginBottom: 6, resize: 'none' }} />
            <button onClick={() => { if (customHeadline) handlePublish(customHeadline, customBody) }}
              disabled={!customHeadline}
              style={{ width: '100%', padding: '8px', background: customHeadline ? '#333' : '#bdbdbd', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              publish() 호출
            </button>
          </div>

          {/* 발행 로그 */}
          {publisher.publishLog.length > 0 && (
            <div style={{ marginTop: 12, background: '#1a1a1a', color: '#4caf50', padding: 10, borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}>
              {publisher.publishLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        {/* Observer들 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>
            Observer — 구독자들 (구독/해제로 등록 관리)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SubscriberPanel observer={emailObserver} type="email" />
            <SubscriberPanel observer={mobileObserver} type="mobile" />
            <SubscriberPanel observer={webObserver} type="web" />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>useNewsPublisher()</code>가 Subject — 구독자 목록을 관리하고 <code>publish()</code>로 알림 발송</li>
          <li><code>useObserver()</code>가 ConcreteObserver — 구독 등록 시 콜백이 Subject에 저장됨</li>
          <li>구독 해제된 Observer는 <code>publish()</code>를 호출해도 알림을 받지 않는다</li>
          <li>Publisher는 Observer가 몇 개인지, 어떤 타입인지 알 필요가 없다</li>
        </ul>
      </div>
    </div>
  )
}
