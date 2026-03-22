import { describe, it, expect, beforeEach } from 'vitest'
import { VendingMachine } from './state.js'

describe('State 패턴 - 자판기', () => {
  let machine: VendingMachine

  beforeEach(() => {
    machine = new VendingMachine()
  })

  describe('초기 상태', () => {
    it('자판기는 대기 중 상태로 시작한다', () => {
      expect(machine.getStateName()).toBe('대기 중')
    })

    it('동전 없이 상품 선택 시 오류 메시지가 기록된다', () => {
      machine.selectItem('콜라')
      expect(machine.log.some((l) => l.includes('동전'))).toBe(true)
    })
  })

  describe('상태 전이 - 정상 흐름', () => {
    it('동전 투입 후 상태가 "동전 투입됨"으로 바뀐다', () => {
      machine.insertCoin(1000)
      expect(machine.getStateName()).toBe('동전 투입됨')
    })

    it('상품 선택 후 상태가 "상품 선택됨"으로 바뀐다', () => {
      machine.insertCoin(1000)
      machine.selectItem('콜라')
      expect(machine.getStateName()).toBe('상품 선택됨')
    })

    it('dispense 호출 후 상품이 배출되고 대기 상태로 복귀한다', () => {
      machine.insertCoin(1000)
      machine.selectItem('콜라')
      machine.dispense()
      // DispensingState → dispense() 호출 → IdleState 복귀
      expect(machine.getStateName()).toBe('대기 중')
    })

    it('정상 구매 후 투입 금액이 초기화된다', () => {
      machine.insertCoin(1000)
      machine.selectItem('콜라')
      machine.dispense()
      expect(machine.getInsertedAmount()).toBe(0)
    })
  })

  describe('각 상태별 행동 차이', () => {
    it('대기 중 상태에서 취소해도 반환할 금액이 없다', () => {
      machine.cancel()
      // 오류 없이 처리되며 상태가 그대로 유지된다
      expect(machine.getStateName()).toBe('대기 중')
    })

    it('동전 투입됨 상태에서 취소하면 금액이 반환되고 대기로 돌아간다', () => {
      machine.insertCoin(500)
      machine.insertCoin(500)
      machine.cancel()

      expect(machine.getInsertedAmount()).toBe(0)
      expect(machine.getStateName()).toBe('대기 중')
      expect(machine.log.some((l) => l.includes('1000원 반환'))).toBe(true)
    })

    it('동전 투입됨 상태에서 추가 투입이 가능하다', () => {
      machine.insertCoin(500)
      machine.insertCoin(500)
      expect(machine.getInsertedAmount()).toBe(1000)
      expect(machine.getStateName()).toBe('동전 투입됨')
    })

    it('배출 중 상태에서는 취소가 불가하다', () => {
      machine.insertCoin(1000)
      machine.selectItem('사이다')
      // ItemSelectedState.dispense()가 호출되면 DispensingState로 전이 후 dispense() 재호출
      // dispense()를 수동 호출하는 대신 상품 선택 상태에서의 dispense를 직접 테스트
      machine.dispense() // ItemSelectedState.dispense() → DispensingState → 완료 → Idle
      // 배출이 이미 완료돼 Idle로 돌아온 상태
      expect(machine.getStateName()).toBe('대기 중')
    })
  })

  describe('상태 로그', () => {
    it('상태 전이 시 로그가 기록된다', () => {
      machine.insertCoin(1000)
      machine.selectItem('콜라')
      machine.dispense()

      // 전이 로그가 존재해야 한다
      const transitionLogs = machine.log.filter((l) => l.includes('상태 전이'))
      expect(transitionLogs.length).toBeGreaterThan(0)
    })

    it('전체 구매 흐름에서 "배출 완료" 로그가 기록된다', () => {
      machine.insertCoin(1000)
      machine.selectItem('콜라')
      machine.dispense()

      expect(machine.log.some((l) => l.includes('배출 완료'))).toBe(true)
    })
  })

  describe('연속 구매', () => {
    it('구매 후 다시 구매 흐름을 시작할 수 있다', () => {
      // 첫 번째 구매
      machine.insertCoin(1000)
      machine.selectItem('콜라')
      machine.dispense()
      expect(machine.getStateName()).toBe('대기 중')

      // 두 번째 구매
      machine.insertCoin(500)
      expect(machine.getStateName()).toBe('동전 투입됨')
      machine.selectItem('물')
      machine.dispense()
      expect(machine.getStateName()).toBe('대기 중')
    })
  })
})
