import { describe, it, expect, beforeEach } from 'vitest'
import {
  GeneralSupportHandler,
  TechSupportHandler,
  ManagerHandler,
  type SupportTicket,
} from './chain-of-responsibility.js'

describe('Chain of Responsibility 패턴 - 고객 지원 시스템', () => {
  let general: GeneralSupportHandler
  let tech: TechSupportHandler
  let manager: ManagerHandler

  beforeEach(() => {
    general = new GeneralSupportHandler()
    tech = new TechSupportHandler()
    manager = new ManagerHandler()
    // 체인 연결: 일반 상담 → 기술 지원 → 매니저
    general.setNext(tech).setNext(manager)
  })

  const makeTicket = (
    id: number,
    level: SupportTicket['level'],
    title = '테스트 티켓',
  ): SupportTicket => ({ id, title, level, description: '' })

  describe('체인 순서대로 처리', () => {
    it('general 레벨 티켓은 일반 상담에서 처리된다', () => {
      const ticket = makeTicket(1, 'general')
      const result = general.handle(ticket)

      expect(result).toContain('[일반 상담]')
      expect(general.handledTickets).toHaveLength(1)
      expect(tech.handledTickets).toHaveLength(0)
      expect(manager.handledTickets).toHaveLength(0)
    })

    it('technical 레벨 티켓은 일반 상담을 건너뛰고 기술 지원에서 처리된다', () => {
      const ticket = makeTicket(2, 'technical')
      const result = general.handle(ticket)

      expect(result).toContain('[기술 지원]')
      expect(general.handledTickets).toHaveLength(0)
      expect(tech.handledTickets).toHaveLength(1)
      expect(manager.handledTickets).toHaveLength(0)
    })

    it('management 레벨 티켓은 체인을 따라 매니저까지 에스컬레이션된다', () => {
      const ticket = makeTicket(3, 'management')
      const result = general.handle(ticket)

      expect(result).toContain('[매니저 에스컬레이션]')
      expect(general.handledTickets).toHaveLength(0)
      expect(tech.handledTickets).toHaveLength(0)
      expect(manager.handledTickets).toHaveLength(1)
    })
  })

  describe('처리 불가 시 다음 핸들러로 전달', () => {
    it('기술 지원 핸들러 단독으로 general 레벨 티켓도 처리할 수 있다', () => {
      // tech 핸들러는 general 레벨도 처리 가능 (자신의 canHandle 기준)
      const ticket = makeTicket(4, 'general')
      const result = tech.handle(ticket)
      expect(result).toContain('[기술 지원]')
    })

    it('체인의 끝에 연결되지 않은 핸들러가 처리 못하면 미처리 메시지를 반환한다', () => {
      // 체인 없이 단독 핸들러에 management 티켓을 보내면 처리 불가
      const standalone = new GeneralSupportHandler()
      const ticket = makeTicket(5, 'management')
      const result = standalone.handle(ticket)
      expect(result).toContain('[미처리]')
    })
  })

  describe('메서드 체이닝으로 체인 구성', () => {
    it('setNext가 다음 핸들러를 반환해 체이닝이 가능하다', () => {
      const h1 = new GeneralSupportHandler()
      const h2 = new TechSupportHandler()
      const h3 = new ManagerHandler()

      // 메서드 체이닝으로 한 줄에 체인 구성
      const returned = h1.setNext(h2)
      expect(returned).toBe(h2)

      const returned2 = h2.setNext(h3)
      expect(returned2).toBe(h3)
    })
  })

  describe('결과 메시지에 티켓 정보가 포함된다', () => {
    it('처리 결과에 티켓 ID와 제목이 포함된다', () => {
      const ticket = makeTicket(99, 'general', '비밀번호 분실')
      const result = general.handle(ticket)

      expect(result).toContain('99')
      expect(result).toContain('비밀번호 분실')
    })
  })

  describe('여러 티켓 순차 처리', () => {
    it('다양한 레벨의 티켓들을 올바른 핸들러가 각각 처리한다', () => {
      const tickets: SupportTicket[] = [
        makeTicket(1, 'general', '일반 문의'),
        makeTicket(2, 'technical', '버그 리포트'),
        makeTicket(3, 'management', '환불 요청'),
        makeTicket(4, 'general', '사용법 안내'),
      ]

      tickets.forEach((t) => general.handle(t))

      expect(general.handledTickets).toHaveLength(2) // general 2개
      expect(tech.handledTickets).toHaveLength(1)    // technical 1개
      expect(manager.handledTickets).toHaveLength(1) // management 1개
    })
  })
})
