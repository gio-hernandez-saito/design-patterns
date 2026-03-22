// ============================================================
// Observer 패턴 - 뉴스 구독 시스템 예시
//
// 역할 매핑:
//   Subject      → NewsPublisher (인터페이스)
//   Observer     → NewsSubscriber (인터페이스)
//   ConcreteSubject → NewsAgency (실제 발행자)
//   ConcreteObserver → EmailSubscriber, MobileSubscriber (실제 구독자)
//
// 왜 이 패턴을 쓰는가?
//   발행자(Subject)와 구독자(Observer)를 느슨하게 결합하기 위해서.
//   발행자는 구독자가 누군지 알 필요 없이 "알림"만 보내면 되고,
//   구독자는 언제든 구독/해제를 자유롭게 할 수 있다.
// ============================================================

// ── 인터페이스 정의 ─────────────────────────────────────────

/**
 * Observer (관찰자) 인터페이스
 * 뉴스가 발행될 때 호출되는 update 메서드를 정의한다.
 */
export interface NewsSubscriber {
  // 새로운 뉴스가 발행되었을 때 Subject가 이 메서드를 호출한다
  update(headline: string, body: string): void
}

/**
 * Subject (주체) 인터페이스
 * 구독자 목록을 관리하고 변경이 발생하면 알림을 보낸다.
 */
export interface NewsPublisher {
  // 새로운 구독자를 목록에 추가한다
  subscribe(subscriber: NewsSubscriber): void
  // 구독자를 목록에서 제거한다
  unsubscribe(subscriber: NewsSubscriber): void
  // 등록된 모든 구독자에게 최신 뉴스를 알린다
  notify(): void
}

// ── ConcreteSubject ──────────────────────────────────────────

/**
 * ConcreteSubject: 실제 발행자 구현체
 * 내부 상태(뉴스)가 변경될 때마다 구독자들에게 알린다.
 */
export class NewsAgency implements NewsPublisher {
  // 구독자 목록 - Set을 쓰는 이유: 중복 구독을 자동으로 방지하기 위해
  private subscribers: Set<NewsSubscriber> = new Set()

  // 현재 발행된 뉴스 상태
  private currentHeadline: string = ''
  private currentBody: string = ''

  subscribe(subscriber: NewsSubscriber): void {
    this.subscribers.add(subscriber)
  }

  unsubscribe(subscriber: NewsSubscriber): void {
    this.subscribers.delete(subscriber)
  }

  // 모든 구독자에게 현재 상태를 전달한다
  notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber.update(this.currentHeadline, this.currentBody)
    }
  }

  /**
   * 새 뉴스를 발행한다. 상태를 변경한 뒤 즉시 알림을 보낸다.
   * 이렇게 publish 내부에서 notify를 호출하는 이유:
   * 발행자가 상태를 바꾼 순간 구독자들이 자동으로 최신 정보를 받도록 하기 위해.
   */
  publish(headline: string, body: string): void {
    this.currentHeadline = headline
    this.currentBody = body
    // 상태 변경 후 즉시 모든 구독자에게 알림
    this.notify()
  }

  /** 현재 구독자 수를 반환한다 (테스트 검증용) */
  getSubscriberCount(): number {
    return this.subscribers.size
  }
}

// ── ConcreteObserver ─────────────────────────────────────────

/**
 * ConcreteObserver: 이메일로 뉴스를 받는 구독자
 * update가 호출될 때마다 받은 뉴스를 내부에 저장한다.
 */
export class EmailSubscriber implements NewsSubscriber {
  // 수신한 뉴스 기록을 저장 (테스트에서 검증하기 위해)
  public receivedNews: Array<{ headline: string; body: string }> = []

  constructor(public readonly email: string) {}

  update(headline: string, body: string): void {
    // 실제 서비스에서는 이메일 발송 로직이 들어갈 자리
    this.receivedNews.push({ headline, body })
  }
}

/**
 * ConcreteObserver: 모바일 푸시 알림으로 뉴스를 받는 구독자
 */
export class MobileSubscriber implements NewsSubscriber {
  public receivedNews: Array<{ headline: string; body: string }> = []

  constructor(public readonly deviceId: string) {}

  update(headline: string, body: string): void {
    // 실제 서비스에서는 푸시 알림 발송 로직이 들어갈 자리
    this.receivedNews.push({ headline, body })
  }
}
