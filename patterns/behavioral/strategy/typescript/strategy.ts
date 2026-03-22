// ============================================================
// Strategy 패턴 - 정렬 전략 교체 예시
//
// 역할 매핑:
//   Strategy          → SortStrategy (인터페이스)
//   ConcreteStrategy  → BubbleSortStrategy, QuickSortStrategy, MergeSortStrategy
//   Context           → Sorter
//
// 왜 이 패턴을 쓰는가?
//   알고리즘을 사용하는 코드(Context)와 알고리즘 구현(Strategy)을 분리하기 위해.
//   런타임에 전략을 교체할 수 있어 if/else 분기 없이 동작을 바꿀 수 있다.
// ============================================================

// ── Strategy 인터페이스 ──────────────────────────────────────

/**
 * Strategy: 정렬 알고리즘이 반드시 구현해야 하는 계약
 * 모든 정렬 전략은 이 인터페이스를 통해 교환 가능(interchangeable)해진다.
 */
export interface SortStrategy {
  // 원본 배열을 변경하지 않고 정렬된 새 배열을 반환한다
  sort(data: number[]): number[]
  // 이 전략의 이름 (로깅/디버깅용)
  readonly name: string
}

// ── ConcreteStrategy 구현체들 ────────────────────────────────

/**
 * ConcreteStrategy: 버블 정렬
 * 인접한 두 요소를 비교하며 교환하는 단순한 O(n²) 알고리즘.
 * 작은 데이터셋에 적합하다.
 */
export class BubbleSortStrategy implements SortStrategy {
  readonly name = '버블 정렬'

  sort(data: number[]): number[] {
    // 원본 배열을 보호하기 위해 복사본에서 작업한다
    const arr = [...data]
    const n = arr.length

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        // 인접한 두 요소가 잘못된 순서이면 교환
        if (arr[j] > arr[j + 1]) {
          ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        }
      }
    }
    return arr
  }
}

/**
 * ConcreteStrategy: 퀵 정렬
 * 피벗을 기준으로 분할 정복하는 평균 O(n log n) 알고리즘.
 * 대부분의 실무 상황에 적합하다.
 */
export class QuickSortStrategy implements SortStrategy {
  readonly name = '퀵 정렬'

  sort(data: number[]): number[] {
    const arr = [...data]
    this.quickSort(arr, 0, arr.length - 1)
    return arr
  }

  private quickSort(arr: number[], low: number, high: number): void {
    if (low < high) {
      const pivotIndex = this.partition(arr, low, high)
      // 피벗 기준으로 좌우를 재귀적으로 정렬
      this.quickSort(arr, low, pivotIndex - 1)
      this.quickSort(arr, pivotIndex + 1, high)
    }
  }

  private partition(arr: number[], low: number, high: number): number {
    // 마지막 요소를 피벗으로 선택하는 Lomuto 파티션 방식
    const pivot = arr[high]
    let i = low - 1

    for (let j = low; j < high; j++) {
      if (arr[j] <= pivot) {
        i++
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
    }
    ;[arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]
    return i + 1
  }
}

/**
 * ConcreteStrategy: 머지 정렬
 * 배열을 반씩 나눠 병합하는 안정적인 O(n log n) 알고리즘.
 * 데이터 크기에 무관하게 일정한 성능을 보장한다.
 */
export class MergeSortStrategy implements SortStrategy {
  readonly name = '머지 정렬'

  sort(data: number[]): number[] {
    if (data.length <= 1) return [...data]
    return this.mergeSort([...data])
  }

  private mergeSort(arr: number[]): number[] {
    if (arr.length <= 1) return arr

    const mid = Math.floor(arr.length / 2)
    // 좌우 절반으로 나눠 재귀 정렬
    const left = this.mergeSort(arr.slice(0, mid))
    const right = this.mergeSort(arr.slice(mid))
    return this.merge(left, right)
  }

  private merge(left: number[], right: number[]): number[] {
    const result: number[] = []
    let i = 0
    let j = 0

    // 두 정렬된 배열을 하나로 합친다
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        result.push(left[i++])
      } else {
        result.push(right[j++])
      }
    }
    // 남은 요소 추가
    return result.concat(left.slice(i)).concat(right.slice(j))
  }
}

// ── Context ──────────────────────────────────────────────────

/**
 * Context: 정렬 전략을 사용하는 클라이언트
 * 내부에서 어떤 알고리즘을 쓰는지 몰라도 된다 - 그게 Strategy 패턴의 핵심.
 */
export class Sorter {
  // 현재 사용 중인 전략을 저장한다
  private strategy: SortStrategy

  constructor(strategy: SortStrategy) {
    this.strategy = strategy
  }

  /**
   * 런타임에 정렬 전략을 교체한다.
   * 이렇게 하면 조건문 없이 알고리즘을 동적으로 바꿀 수 있다.
   */
  setStrategy(strategy: SortStrategy): void {
    this.strategy = strategy
  }

  /** 현재 전략의 이름을 반환한다 */
  getStrategyName(): string {
    return this.strategy.name
  }

  /** 현재 전략으로 데이터를 정렬한다 */
  sort(data: number[]): number[] {
    return this.strategy.sort(data)
  }
}
