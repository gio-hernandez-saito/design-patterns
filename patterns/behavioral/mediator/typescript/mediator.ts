/**
 * Mediator 패턴
 *
 * 목적: 객체들이 서로 직접 참조하지 않고, 중재자(Mediator)를 통해서만 통신하게 만든다.
 *       이를 통해 객체 간의 결합도를 줄이고, 통신 로직을 한 곳에서 관리할 수 있다.
 *
 * 핵심 아이디어:
 * - 여러 객체가 서로 직접 통신하면 N개 객체 간에 N*(N-1)/2개의 관계가 생긴다.
 * - Mediator를 도입하면 모든 통신이 중재자를 통해 이루어져 관계가 단순해진다.
 * - 각 객체(Colleague)는 오직 Mediator만 알면 된다.
 *
 * 역할 매핑:
 * - Mediator       → ChatMediator 인터페이스 (통신을 중재하는 계약)
 * - ConcreteMediator → ChatRoom 클래스 (실제 메시지 라우팅 로직을 담당)
 * - Colleague      → User 추상 클래스 (채팅 참가자의 기본 형태)
 * - ConcreteColleague → RegularUser, PremiumUser 클래스 (실제 채팅 사용자)
 */

// =============================================================================
// Mediator 인터페이스
// =============================================================================

/**
 * 중재자가 반드시 구현해야 하는 계약.
 *
 * 동료 객체(Colleague)들은 이 인터페이스만 의존하므로,
 * 중재자의 구현이 바뀌어도 동료 객체들은 변경할 필요가 없다.
 */
export interface ChatMediator {
  /**
   * 메시지를 보낸 사람에서 받아야 할 대상에게 전달한다.
   * @param message 전달할 메시지
   * @param sender 메시지를 보낸 사용자
   */
  sendMessage(message: string, sender: User): void;

  /**
   * 채팅방에 새 사용자를 등록한다.
   * @param user 등록할 사용자
   */
  registerUser(user: User): void;
}

// =============================================================================
// Colleague 추상 클래스
// =============================================================================

/**
 * 채팅 참가자의 기본 형태를 정의하는 추상 클래스.
 *
 * 각 사용자는 자신이 속한 채팅방(mediator)만 알고 있다.
 * 다른 사용자를 직접 참조하지 않기 때문에 결합도가 낮다.
 */
export abstract class User {
  // 사용자가 속한 중재자(채팅방). 통신은 반드시 이를 통해서만 한다.
  protected mediator: ChatMediator;

  /** 사용자 이름 */
  public readonly name: string;

  /**
   * @param mediator 이 사용자가 속할 채팅방
   * @param name 사용자 이름
   */
  constructor(mediator: ChatMediator, name: string) {
    this.mediator = mediator;
    this.name = name;
    // 생성 시 자동으로 채팅방에 등록한다.
    // 사용자가 직접 등록 메서드를 호출하지 않아도 되도록 편의를 제공한다.
    this.mediator.registerUser(this);
  }

  /**
   * 채팅방에 메시지를 전송한다.
   * 직접 다른 사용자에게 보내지 않고 mediator에게 위임한다는 점이 핵심.
   * @param message 보낼 메시지
   */
  public send(message: string): void {
    console.log(`[${this.name}] 전송: "${message}"`);
    // 중재자에게 메시지 전달을 위임한다.
    // "나(sender)가 이 메시지를 보냈다"는 정보도 함께 넘긴다.
    this.mediator.sendMessage(message, this);
  }

  /**
   * 메시지를 수신했을 때 호출된다.
   * 각 사용자 타입마다 다르게 동작할 수 있도록 추상 메서드로 선언한다.
   * @param message 수신된 메시지
   * @param senderName 보낸 사람 이름
   */
  public abstract receive(message: string, senderName: string): void;
}

// =============================================================================
// ConcreteColleague 클래스들
// =============================================================================

/**
 * 일반 사용자 — ConcreteColleague.
 * 메시지를 받으면 콘솔에 기록만 한다.
 */
export class RegularUser extends User {
  // 수신된 메시지를 기록해 두는 배열 (테스트에서 검증하기 위해 사용)
  public receivedMessages: Array<{ sender: string; message: string }> = [];

  public receive(message: string, senderName: string): void {
    // 수신 기록을 남긴다.
    this.receivedMessages.push({ sender: senderName, message });
    console.log(`[${this.name}] 수신 (일반): [${senderName}]: "${message}"`);
  }
}

/**
 * 프리미엄 사용자 — ConcreteColleague.
 * 메시지를 받으면 대문자로 강조해서 출력한다.
 * (같은 Mediator를 쓰지만 수신 방식이 다를 수 있음을 보여주는 예시)
 */
export class PremiumUser extends User {
  public receivedMessages: Array<{ sender: string; message: string }> = [];

  public receive(message: string, senderName: string): void {
    this.receivedMessages.push({ sender: senderName, message });
    // 프리미엄 사용자는 수신 메시지를 대문자로 표시한다.
    console.log(
      `[${this.name}] 수신 (프리미엄): [${senderName}]: "${message.toUpperCase()}"`
    );
  }
}

// =============================================================================
// ConcreteMediator 클래스
// =============================================================================

/**
 * 채팅방 — ConcreteMediator.
 *
 * 모든 메시지는 이 클래스를 통해 흐른다.
 * 누가 누구에게 메시지를 보낼지 결정하는 라우팅 로직이 여기에 집중된다.
 *
 * 이렇게 중앙화하면 "특정 사용자 차단", "브로드캐스트", "귓속말" 같은
 * 기능을 추가할 때 각 사용자 클래스를 건드리지 않고 이 클래스만 수정하면 된다.
 */
export class ChatRoom implements ChatMediator {
  /** 등록된 모든 사용자 목록 */
  private users: User[] = [];

  /** 채팅방 이름 */
  public readonly roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * 새 사용자를 채팅방에 등록한다.
   */
  public registerUser(user: User): void {
    this.users.push(user);
    console.log(`[채팅방: ${this.roomName}] "${user.name}" 입장`);
  }

  /**
   * 메시지를 보낸 사람을 제외한 모든 사용자에게 메시지를 전달한다.
   *
   * 여기서 "직접 통신 차단"이 구현된다:
   * sender는 다른 사용자의 receive()를 직접 호출하지 못하고,
   * 반드시 ChatRoom을 통해야만 메시지가 전달된다.
   */
  public sendMessage(message: string, sender: User): void {
    for (const user of this.users) {
      // 보낸 사람 자신에게는 메시지를 다시 보내지 않는다.
      if (user !== sender) {
        user.receive(message, sender.name);
      }
    }
  }

  /**
   * 현재 채팅방에 있는 사용자 수를 반환한다.
   */
  public getUserCount(): number {
    return this.users.length;
  }
}
