import { describe, it, expect, beforeEach } from 'vitest'
import {
  NewsAgency,
  EmailSubscriber,
  MobileSubscriber,
} from './observer.js'

describe('Observer 패턴 - 뉴스 구독 시스템', () => {
  let agency: NewsAgency
  let emailSub: EmailSubscriber
  let mobileSub: MobileSubscriber

  beforeEach(() => {
    agency = new NewsAgency()
    emailSub = new EmailSubscriber('user@example.com')
    mobileSub = new MobileSubscriber('device-001')
  })

  describe('구독(subscribe)', () => {
    it('구독자를 추가하면 구독자 수가 증가한다', () => {
      expect(agency.getSubscriberCount()).toBe(0)
      agency.subscribe(emailSub)
      expect(agency.getSubscriberCount()).toBe(1)
      agency.subscribe(mobileSub)
      expect(agency.getSubscriberCount()).toBe(2)
    })

    it('같은 구독자를 중복 구독해도 한 번만 등록된다', () => {
      agency.subscribe(emailSub)
      agency.subscribe(emailSub)
      expect(agency.getSubscriberCount()).toBe(1)
    })
  })

  describe('해제(unsubscribe)', () => {
    it('구독자를 해제하면 목록에서 제거된다', () => {
      agency.subscribe(emailSub)
      agency.subscribe(mobileSub)
      agency.unsubscribe(emailSub)
      expect(agency.getSubscriberCount()).toBe(1)
    })

    it('해제된 구독자는 이후 알림을 받지 않는다', () => {
      agency.subscribe(emailSub)
      agency.unsubscribe(emailSub)

      agency.publish('속보', '내용')

      expect(emailSub.receivedNews).toHaveLength(0)
    })
  })

  describe('알림 전파(notify)', () => {
    it('뉴스 발행 시 구독된 모든 옵저버에게 알림이 전달된다', () => {
      agency.subscribe(emailSub)
      agency.subscribe(mobileSub)

      agency.publish('오늘의 헤드라인', '자세한 내용...')

      expect(emailSub.receivedNews).toHaveLength(1)
      expect(mobileSub.receivedNews).toHaveLength(1)
    })

    it('전달된 뉴스의 내용이 정확하다', () => {
      agency.subscribe(emailSub)

      agency.publish('속보: TypeScript 5.0 출시', 'TypeScript가 새 버전을 출시했습니다.')

      expect(emailSub.receivedNews[0]).toEqual({
        headline: '속보: TypeScript 5.0 출시',
        body: 'TypeScript가 새 버전을 출시했습니다.',
      })
    })

    it('여러 번 발행하면 발행 횟수만큼 알림이 쌓인다', () => {
      agency.subscribe(emailSub)

      agency.publish('뉴스 1', '내용 1')
      agency.publish('뉴스 2', '내용 2')
      agency.publish('뉴스 3', '내용 3')

      expect(emailSub.receivedNews).toHaveLength(3)
      expect(emailSub.receivedNews[2].headline).toBe('뉴스 3')
    })
  })

  describe('다수 옵저버 동작', () => {
    it('10명의 구독자 모두에게 알림이 전달된다', () => {
      const subscribers = Array.from(
        { length: 10 },
        (_, i) => new EmailSubscriber(`user${i}@test.com`),
      )
      subscribers.forEach((s) => agency.subscribe(s))

      agency.publish('단체 뉴스', '모든 구독자에게 전달')

      subscribers.forEach((s) => {
        expect(s.receivedNews).toHaveLength(1)
      })
    })

    it('이메일과 모바일 구독자가 각자 독립적으로 뉴스를 받는다', () => {
      agency.subscribe(emailSub)
      agency.subscribe(mobileSub)

      agency.publish('헤드라인', '본문')

      expect(emailSub.receivedNews[0].headline).toBe('헤드라인')
      expect(mobileSub.receivedNews[0].headline).toBe('헤드라인')
      // 두 구독자의 receivedNews는 서로 다른 독립적인 배열이다
      expect(emailSub.receivedNews).not.toBe(mobileSub.receivedNews)
    })
  })
})
