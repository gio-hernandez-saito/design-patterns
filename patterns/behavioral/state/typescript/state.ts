// ============================================================
// State 패턴 - 자판기 예시
//
// 역할 매핑:
//   State           → VendingMachineState (인터페이스)
//   ConcreteState   → IdleState, CoinInsertedState, ItemSelectedState, DispensingState
//   Context         → VendingMachine
//
// 왜 이 패턴을 쓰는가?
//   객체의 내부 상태에 따라 행동이 달라지는 경우,
//   각 상태를 별도 클래스로 분리해 if/else나 switch 분기를 없앤다.
//   상태 전이(transition) 로직이 각 State 클래스 안에 캡슐화된다.
// ============================================================

// ── State 인터페이스 ─────────────────────────────────────────

/**
 * State: 자판기가 가질 수 있는 모든 상태의 공통 계약
 * 각 상태에서 가능한 동작(액션)을 메서드로 정의한다.
 */
export interface VendingMachineState {
  // 동전을 투입한다
  insertCoin(amount: number): void
  // 상품을 선택한다
  selectItem(itemName: string): void
  // 상품을 배출한다 (내부 상태 전이 후 자동 호출)
  dispense(): void
  // 동전을 반환한다
  cancel(): void
  // 현재 상태 이름 (디버깅/로깅용)
  readonly stateName: string
}

// ── Context ──────────────────────────────────────────────────

/**
 * Context: 자판기 본체
 * 현재 상태 객체에게 모든 행동을 위임한다.
 * 상태 전이는 State 객체가 context.setState()를 호출해 직접 변경한다.
 */
export class VendingMachine {
  // 현재 상태 객체 - 이 참조가 바뀌면 자판기의 행동이 달라진다
  private currentState: VendingMachineState

  // 투입된 금액
  private insertedAmount: number = 0

  // 선택된 상품 이름
  private selectedItem: string = ''

  // 이벤트 로그 (테스트 검증용)
  public log: string[] = []

  constructor() {
    // 초기 상태는 대기(Idle) 상태
    this.currentState = new IdleState(this)
  }

  // ── 상태 객체에게 위임하는 공개 메서드들 ──

  insertCoin(amount: number): void {
    this.currentState.insertCoin(amount)
  }

  selectItem(itemName: string): void {
    this.currentState.selectItem(itemName)
  }

  dispense(): void {
    this.currentState.dispense()
  }

  cancel(): void {
    this.currentState.cancel()
  }

  // ── 상태 객체가 내부적으로 사용하는 메서드들 ──

  /** 상태를 전이한다. State 객체가 직접 호출해 전이를 제어한다. */
  setState(state: VendingMachineState): void {
    this.addLog(`상태 전이: ${this.currentState.stateName} → ${state.stateName}`)
    this.currentState = state
  }

  /** 현재 상태 이름을 반환한다 */
  getStateName(): string {
    return this.currentState.stateName
  }

  /** 투입 금액을 추가한다 */
  addAmount(amount: number): void {
    this.insertedAmount += amount
  }

  /** 현재 투입된 금액을 반환한다 */
  getInsertedAmount(): number {
    return this.insertedAmount
  }

  /** 투입 금액을 초기화한다 */
  resetAmount(): void {
    this.insertedAmount = 0
  }

  /** 선택된 상품을 설정한다 */
  setSelectedItem(itemName: string): void {
    this.selectedItem = itemName
  }

  /** 선택된 상품 이름을 반환한다 */
  getSelectedItem(): string {
    return this.selectedItem
  }

  /** 이벤트 로그를 추가한다 */
  addLog(message: string): void {
    this.log.push(message)
  }
}

// ── ConcreteState 구현체들 ───────────────────────────────────

/**
 * ConcreteState: 대기 상태
 * 동전 투입을 기다리는 초기 상태.
 * 동전이 투입되면 CoinInsertedState로 전이한다.
 */
export class IdleState implements VendingMachineState {
  readonly stateName = '대기 중'

  constructor(private readonly machine: VendingMachine) {}

  insertCoin(amount: number): void {
    this.machine.addAmount(amount)
    this.machine.addLog(`${amount}원 투입됨. 총 ${this.machine.getInsertedAmount()}원`)
    // 동전이 투입됐으므로 "동전 투입됨" 상태로 전이
    this.machine.setState(new CoinInsertedState(this.machine))
  }

  selectItem(_itemName: string): void {
    this.machine.addLog('오류: 먼저 동전을 투입해주세요.')
  }

  dispense(): void {
    this.machine.addLog('오류: 동전을 먼저 투입해주세요.')
  }

  cancel(): void {
    this.machine.addLog('취소할 내용이 없습니다.')
  }
}

/**
 * ConcreteState: 동전 투입됨 상태
 * 동전이 투입된 후 상품 선택을 기다리는 상태.
 * 상품을 선택하면 ItemSelectedState로 전이한다.
 */
export class CoinInsertedState implements VendingMachineState {
  readonly stateName = '동전 투입됨'

  constructor(private readonly machine: VendingMachine) {}

  insertCoin(amount: number): void {
    // 이미 동전이 투입된 상태에서 추가 투입도 허용
    this.machine.addAmount(amount)
    this.machine.addLog(`추가 ${amount}원 투입됨. 총 ${this.machine.getInsertedAmount()}원`)
  }

  selectItem(itemName: string): void {
    this.machine.setSelectedItem(itemName)
    this.machine.addLog(`"${itemName}" 선택됨`)
    // 상품이 선택됐으므로 "상품 선택됨" 상태로 전이
    this.machine.setState(new ItemSelectedState(this.machine))
  }

  dispense(): void {
    this.machine.addLog('오류: 상품을 먼저 선택해주세요.')
  }

  cancel(): void {
    const amount = this.machine.getInsertedAmount()
    this.machine.addLog(`${amount}원 반환됨. 취소 완료.`)
    this.machine.resetAmount()
    // 취소하면 다시 대기 상태로 돌아간다
    this.machine.setState(new IdleState(this.machine))
  }
}

/**
 * ConcreteState: 상품 선택됨 상태
 * 상품이 선택된 후 배출 처리를 진행하는 상태.
 * 자동으로 DispensingState로 전이하며 상품을 배출한다.
 */
export class ItemSelectedState implements VendingMachineState {
  readonly stateName = '상품 선택됨'

  constructor(private readonly machine: VendingMachine) {}

  insertCoin(_amount: number): void {
    this.machine.addLog('오류: 이미 상품이 선택됐습니다. 배출을 기다리세요.')
  }

  selectItem(_itemName: string): void {
    this.machine.addLog('오류: 이미 상품이 선택됐습니다.')
  }

  dispense(): void {
    const item = this.machine.getSelectedItem()
    this.machine.addLog(`"${item}" 배출 중...`)
    // 배출 상태로 전이한 뒤 실제 배출 처리
    this.machine.setState(new DispensingState(this.machine))
    this.machine.dispense()
  }

  cancel(): void {
    const amount = this.machine.getInsertedAmount()
    this.machine.addLog(`${amount}원 반환됨. 선택 취소.`)
    this.machine.resetAmount()
    this.machine.setSelectedItem('')
    this.machine.setState(new IdleState(this.machine))
  }
}

/**
 * ConcreteState: 배출 중 상태
 * 실제 상품을 배출하는 상태.
 * 배출 완료 후 자동으로 IdleState로 복귀한다.
 */
export class DispensingState implements VendingMachineState {
  readonly stateName = '배출 중'

  constructor(private readonly machine: VendingMachine) {}

  insertCoin(_amount: number): void {
    this.machine.addLog('오류: 배출 중입니다. 잠시 기다려주세요.')
  }

  selectItem(_itemName: string): void {
    this.machine.addLog('오류: 배출 중입니다.')
  }

  dispense(): void {
    const item = this.machine.getSelectedItem()
    this.machine.addLog(`"${item}" 배출 완료!`)
    // 금액과 선택 상품을 초기화한 뒤 대기 상태로 복귀
    this.machine.resetAmount()
    this.machine.setSelectedItem('')
    this.machine.setState(new IdleState(this.machine))
  }

  cancel(): void {
    this.machine.addLog('오류: 배출 중에는 취소할 수 없습니다.')
  }
}
