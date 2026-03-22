// =============================================================================
// 브릿지 패턴 (Bridge Pattern)
// =============================================================================
// 목적: 추상화(Abstraction)와 구현(Implementation)을 분리하여 각각 독립적으로 확장할 수 있게 한다.
//
// 왜 필요한가?
// - 알림 종류(이메일, SMS, 푸시)와 전송 방식(즉시, 예약, 일괄)을 조합하면
//   경우의 수가 폭발적으로 늘어난다. 상속만으로는 N×M개의 클래스가 필요하다.
// - 브릿지 패턴은 이 두 차원을 분리하여 N+M개의 클래스로 해결한다.
//
// 역할 매핑:
//   Notification (Abstraction)          → 알림의 추상화 계층 (무엇을 보낼지)
//   UrgentNotification (RefinedAbstraction) → 추상화 계층 확장 (긴급 알림)
//   MessageSender (Implementor)         → 전송 방식 인터페이스 (어떻게 보낼지)
//   EmailSender, SMSSender (ConcreteImplementor) → 실제 전송 구현체
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Implementor: 구현 계층의 인터페이스
// "어떻게 메시지를 전송하는가"를 정의한다.
// Abstraction은 이 인터페이스에만 의존하므로 구현체가 바뀌어도 영향을 받지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

/** 전송된 메시지 기록 (테스트 및 로그 확인용) */
export interface SentMessage {
  recipient: string;
  content: string;
  channel: string;  // 전송 채널 (email, sms, push 등)
  sentAt: Date;
}

/**
 * Implementor 인터페이스: 메시지 전송 방식을 정의한다.
 * 이 인터페이스 덕분에 Abstraction은 전송 방식의 세부 구현을 몰라도 된다.
 */
export interface MessageSender {
  send(recipient: string, message: string): SentMessage;
  getChannelName(): string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ConcreteImplementor: 실제 전송 방식 구현체들
// 각각 독립적으로 개발, 테스트, 배포할 수 있다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ConcreteImplementor 1: 이메일 전송
 * SMTP를 통해 이메일을 보내는 구체적인 구현체
 */
export class EmailSender implements MessageSender {
  private smtpHost: string;

  constructor(smtpHost: string = "smtp.example.com") {
    this.smtpHost = smtpHost;
  }

  send(recipient: string, message: string): SentMessage {
    // 실제 구현에서는 nodemailer 같은 라이브러리를 사용한다.
    // 여기서는 전송 시뮬레이션만 한다.
    const sent: SentMessage = {
      recipient,
      content: message,
      channel: "email",
      sentAt: new Date(),
    };
    return sent;
  }

  getChannelName(): string {
    return `이메일(${this.smtpHost})`;
  }
}

/**
 * ConcreteImplementor 2: SMS 전송
 * 문자 메시지로 보내는 구체적인 구현체
 */
export class SMSSender implements MessageSender {
  private phoneNumber: string;

  constructor(phoneNumber: string) {
    this.phoneNumber = phoneNumber;
  }

  send(recipient: string, message: string): SentMessage {
    // SMS는 길이 제한이 있으므로 메시지를 잘라낸다.
    // 왜 여기서 자르는가? 구현 계층이 각 채널의 제약사항을 처리해야 한다.
    const truncated = message.length > 90 ? message.slice(0, 87) + "..." : message;

    return {
      recipient: `${recipient}(${this.phoneNumber})`,
      content: truncated,
      channel: "sms",
      sentAt: new Date(),
    };
  }

  getChannelName(): string {
    return "SMS";
  }
}

/**
 * ConcreteImplementor 3: 푸시 알림 전송
 * 모바일 푸시 알림으로 보내는 구체적인 구현체
 */
export class PushNotificationSender implements MessageSender {
  private appId: string;

  constructor(appId: string) {
    this.appId = appId;
  }

  send(recipient: string, message: string): SentMessage {
    return {
      recipient,
      content: message,
      channel: `push(${this.appId})`,
      sentAt: new Date(),
    };
  }

  getChannelName(): string {
    return `푸시알림(앱ID: ${this.appId})`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Abstraction: 알림의 추상화 계층
// "무엇을 보낼 것인가"를 정의한다. 실제 전송은 Implementor에게 위임한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstraction: 알림 기본 클래스
 *
 * 핵심 포인트: sender(Implementor)에 대한 참조를 가지고 있다.
 * 이 "다리(bridge)"를 통해 추상화 계층과 구현 계층이 연결된다.
 * 두 계층은 이 참조 하나로만 연결되어 있어, 각자 독립적으로 변경 가능하다.
 */
export abstract class Notification {
  // 브릿지: 구현 계층을 가리키는 참조
  // protected이므로 서브클래스에서도 접근 가능하다.
  protected sender: MessageSender;

  constructor(sender: MessageSender) {
    this.sender = sender;
  }

  /**
   * 알림 전송 추상 메서드
   * 서브클래스가 메시지 내용 형식을 결정하고, 실제 전송은 sender에게 위임한다.
   */
  abstract notify(recipient: string, title: string, body: string): SentMessage;

  /**
   * 런타임에 전송 방식을 교체할 수 있다.
   * 왜 이 메서드가 필요한가? 동일한 알림 객체로 다른 채널로 전송 방식을 바꿀 수 있어야 한다.
   */
  setSender(sender: MessageSender): void {
    this.sender = sender;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RefinedAbstraction: 추상화 계층의 확장
// Abstraction을 상속하여 더 구체적인 동작을 추가한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RefinedAbstraction 1: 일반 알림
 * 표준 형식으로 메시지를 구성하여 전송한다.
 */
export class SimpleNotification extends Notification {
  notify(recipient: string, title: string, body: string): SentMessage {
    // 메시지 형식은 추상화 계층에서 결정하고, 전송은 구현 계층에 위임한다.
    const message = `[${title}] ${body}`;
    return this.sender.send(recipient, message);
  }
}

/**
 * RefinedAbstraction 2: 긴급 알림
 * 긴급 표시를 추가하고 메시지 형식을 다르게 구성한다.
 * 전송 방식은 여전히 Implementor가 담당한다.
 */
export class UrgentNotification extends Notification {
  notify(recipient: string, title: string, body: string): SentMessage {
    // 긴급 알림은 제목에 [긴급] 접두사를 붙이고 내용도 다르게 포맷한다.
    const message = `🚨 [긴급: ${title}] 즉시 확인 필요 — ${body}`;
    return this.sender.send(recipient, message);
  }
}

/**
 * RefinedAbstraction 3: 마케팅 알림
 * 마케팅 목적의 메시지를 구성하여 전송한다.
 */
export class MarketingNotification extends Notification {
  private campaignId: string;

  constructor(sender: MessageSender, campaignId: string) {
    super(sender);
    this.campaignId = campaignId;
  }

  notify(recipient: string, title: string, body: string): SentMessage {
    // 마케팅 알림은 캠페인 ID를 포함한 트래킹 정보를 추가한다.
    const message = `[캠페인 ${this.campaignId}] ${title}: ${body} | 수신 거부: reply STOP`;
    return this.sender.send(recipient, message);
  }
}
