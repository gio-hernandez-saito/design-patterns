// ============================================================
// Chain of Responsibility 패턴 - 고객 지원 시스템 예시
//
// 역할 매핑:
//   Handler         → SupportHandler (추상 클래스)
//   ConcreteHandler → GeneralSupportHandler, TechSupportHandler, ManagerHandler
//
// 왜 이 패턴을 쓰는가?
//   요청을 처리할 수 있는 핸들러를 미리 알 수 없을 때,
//   여러 핸들러를 사슬(chain)로 연결해 순서대로 처리를 시도하게 한다.
//   각 핸들러는 자신이 처리할 수 없으면 다음 핸들러로 넘긴다.
//   발신자(client)는 체인의 첫 번째 핸들러에만 요청을 보내면 된다.
// ============================================================

// ── 요청 타입 정의 ───────────────────────────────────────────

/** 고객 지원 티켓의 우선순위 레벨 */
export type SupportLevel = 'general' | 'technical' | 'management'

/** 고객 지원 요청을 나타내는 데이터 구조 */
export interface SupportTicket {
  id: number
  title: string
  level: SupportLevel // 이 레벨 이상의 핸들러만 처리할 수 있다
  description: string
}

// ── Handler (추상 핸들러) ────────────────────────────────────

/**
 * Handler: 모든 핸들러의 공통 추상 클래스
 *
 * next 핸들러를 내부에 보관하고,
 * 자신이 처리할 수 없는 요청은 자동으로 다음으로 전달하는
 * 공통 로직을 제공한다.
 */
export abstract class SupportHandler {
  // 체인의 다음 핸들러 참조. 마지막 핸들러는 null을 가진다.
  private nextHandler: SupportHandler | null = null

  // 처리된 티켓 기록 (테스트 검증용)
  public handledTickets: SupportTicket[] = []

  /**
   * 다음 핸들러를 설정하고 그 핸들러를 반환한다.
   * 반환값을 그대로 반환하는 이유: 체인 연결을 메서드 체이닝으로 작성하기 위해
   * 예) general.setNext(tech).setNext(manager)
   */
  setNext(handler: SupportHandler): SupportHandler {
    this.nextHandler = handler
    return handler // 체이닝을 위해 다음 핸들러를 반환
  }

  /**
   * 요청을 처리하거나 다음 핸들러로 넘긴다.
   * 이 메서드를 template method처럼 사용해 공통 흐름을 강제한다.
   */
  handle(ticket: SupportTicket): string {
    if (this.canHandle(ticket)) {
      // 이 핸들러가 처리할 수 있으면 처리하고 결과를 반환
      this.handledTickets.push(ticket)
      return this.process(ticket)
    }

    if (this.nextHandler) {
      // 처리할 수 없으면 체인의 다음 핸들러로 위임
      return this.nextHandler.handle(ticket)
    }

    // 체인의 끝까지 처리하지 못한 경우
    return `[미처리] 티켓 #${ticket.id}: 처리할 수 있는 담당자가 없습니다.`
  }

  /** 이 핸들러가 해당 티켓을 처리할 수 있는지 판단한다 */
  protected abstract canHandle(ticket: SupportTicket): boolean

  /** 실제 처리 로직. canHandle이 true일 때만 호출된다 */
  protected abstract process(ticket: SupportTicket): string
}

// ── ConcreteHandler 구현체들 ─────────────────────────────────

/**
 * ConcreteHandler: 일반 상담 담당자
 * 'general' 레벨 티켓만 처리한다.
 */
export class GeneralSupportHandler extends SupportHandler {
  protected canHandle(ticket: SupportTicket): boolean {
    return ticket.level === 'general'
  }

  protected process(ticket: SupportTicket): string {
    return `[일반 상담] 티켓 #${ticket.id} "${ticket.title}" 처리 완료`
  }
}

/**
 * ConcreteHandler: 기술 지원 담당자
 * 'general'과 'technical' 레벨 티켓을 처리한다.
 */
export class TechSupportHandler extends SupportHandler {
  protected canHandle(ticket: SupportTicket): boolean {
    return ticket.level === 'general' || ticket.level === 'technical'
  }

  protected process(ticket: SupportTicket): string {
    return `[기술 지원] 티켓 #${ticket.id} "${ticket.title}" 기술 분석 후 처리 완료`
  }
}

/**
 * ConcreteHandler: 매니저
 * 모든 레벨의 티켓을 처리한다 (최후 처리자).
 */
export class ManagerHandler extends SupportHandler {
  protected canHandle(_ticket: SupportTicket): boolean {
    // 매니저는 어떤 티켓이든 처리할 수 있다
    return true
  }

  protected process(ticket: SupportTicket): string {
    return `[매니저 에스컬레이션] 티켓 #${ticket.id} "${ticket.title}" 최우선 처리 완료`
  }
}
