/**
 * Factory Method 패턴
 *
 * 목적: 객체 생성을 서브클래스에 위임해 어떤 클래스의 인스턴스를 만들지
 *       서브클래스가 결정하게 한다. 객체 생성 코드와 사용 코드를 분리한다.
 *
 * 핵심 아이디어:
 * - Creator(부모 클래스)는 "무언가를 만들어라"는 추상 메서드(factoryMethod)를 선언한다.
 * - ConcreteCreator(자식 클래스)가 실제로 어떤 객체를 만들지 결정한다.
 * - Creator는 factoryMethod가 반환하는 Product를 사용하지만, 어떤 Product인지 몰라도 된다.
 *
 * 역할 매핑:
 * - Product          → Notification (인터페이스)
 * - ConcreteProduct  → EmailNotification, SmsNotification, PushNotification
 * - Creator          → NotificationCreator (추상 클래스)
 * - ConcreteCreator  → EmailCreator, SmsCreator, PushCreator
 */

// ─────────────────────────────────────────────
// Product: 생성될 객체가 구현해야 할 인터페이스
// ─────────────────────────────────────────────

/**
 * 모든 알림 유형이 따라야 할 계약(인터페이스).
 * Creator는 이 타입만 알고 있으므로, 구체적인 알림 클래스가 바뀌어도 Creator 코드는 변경되지 않는다.
 */
export interface Notification {
  /** 알림을 전송한다 */
  send(message: string): string;
  /** 알림 채널 이름을 반환한다 */
  getChannel(): string;
}

// ─────────────────────────────────────────────
// ConcreteProduct: 실제 알림 구현체들
// ─────────────────────────────────────────────

/** 이메일 알림 — ConcreteProduct 역할 */
export class EmailNotification implements Notification {
  constructor(private readonly recipient: string) {}

  public send(message: string): string {
    // 실제 이메일 전송 로직 대신 로그 문자열을 반환한다
    return `[Email → ${this.recipient}] ${message}`;
  }

  public getChannel(): string {
    return 'email';
  }
}

/** SMS 알림 — ConcreteProduct 역할 */
export class SmsNotification implements Notification {
  constructor(private readonly phoneNumber: string) {}

  public send(message: string): string {
    return `[SMS → ${this.phoneNumber}] ${message}`;
  }

  public getChannel(): string {
    return 'sms';
  }
}

/** 푸시 알림 — ConcreteProduct 역할 */
export class PushNotification implements Notification {
  constructor(private readonly deviceToken: string) {}

  public send(message: string): string {
    return `[Push → ${this.deviceToken}] ${message}`;
  }

  public getChannel(): string {
    return 'push';
  }
}

// ─────────────────────────────────────────────
// Creator: 팩토리 메서드를 선언하는 추상 클래스
// ─────────────────────────────────────────────

/**
 * 알림 생성자 추상 클래스 — Creator 역할.
 *
 * createNotification()이 팩토리 메서드다.
 * 서브클래스가 이 메서드를 오버라이드해 어떤 Notification을 만들지 결정한다.
 * 이 클래스의 나머지 로직(notify)은 팩토리 메서드가 반환하는 Notification 인터페이스만 사용한다.
 */
export abstract class NotificationCreator {
  /**
   * 팩토리 메서드: 서브클래스가 반드시 구현해야 한다.
   * 어떤 Notification 객체를 생성할지를 서브클래스에 위임한다.
   */
  protected abstract createNotification(): Notification;

  /**
   * 알림을 전송하는 비즈니스 로직.
   * 팩토리 메서드로 생성된 객체를 사용하지만, 그 객체의 구체적인 타입은 모른다.
   * → 이것이 Factory Method의 핵심 이점: Creator가 구체 클래스에 의존하지 않는다.
   */
  public notify(message: string): string {
    // 팩토리 메서드를 호출해 Product를 얻는다
    const notification = this.createNotification();
    const result = notification.send(message);
    return `[${notification.getChannel().toUpperCase()} 채널] ${result}`;
  }
}

// ─────────────────────────────────────────────
// ConcreteCreator: 실제로 어떤 Product를 만들지 결정하는 클래스들
// ─────────────────────────────────────────────

/** 이메일 알림을 생성하는 Creator — ConcreteCreator 역할 */
export class EmailCreator extends NotificationCreator {
  constructor(private readonly recipient: string) {
    super();
  }

  // 팩토리 메서드를 오버라이드해 EmailNotification을 반환한다
  protected createNotification(): Notification {
    return new EmailNotification(this.recipient);
  }
}

/** SMS 알림을 생성하는 Creator — ConcreteCreator 역할 */
export class SmsCreator extends NotificationCreator {
  constructor(private readonly phoneNumber: string) {
    super();
  }

  protected createNotification(): Notification {
    return new SmsNotification(this.phoneNumber);
  }
}

/** 푸시 알림을 생성하는 Creator — ConcreteCreator 역할 */
export class PushCreator extends NotificationCreator {
  constructor(private readonly deviceToken: string) {
    super();
  }

  protected createNotification(): Notification {
    return new PushNotification(this.deviceToken);
  }
}
