import { describe, it, expect, beforeEach } from 'vitest'
import {
  Sorter,
  BubbleSortStrategy,
  QuickSortStrategy,
  MergeSortStrategy,
} from './strategy.js'

describe('Strategy 패턴 - 정렬 전략 교체', () => {
  const unsorted = [5, 3, 8, 1, 9, 2, 7, 4, 6]
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  describe('각 전략이 올바르게 정렬한다', () => {
    it('버블 정렬 전략이 올바른 결과를 반환한다', () => {
      const sorter = new Sorter(new BubbleSortStrategy())
      expect(sorter.sort([...unsorted])).toEqual(sorted)
    })

    it('퀵 정렬 전략이 올바른 결과를 반환한다', () => {
      const sorter = new Sorter(new QuickSortStrategy())
      expect(sorter.sort([...unsorted])).toEqual(sorted)
    })

    it('머지 정렬 전략이 올바른 결과를 반환한다', () => {
      const sorter = new Sorter(new MergeSortStrategy())
      expect(sorter.sort([...unsorted])).toEqual(sorted)
    })
  })

  describe('세 전략 모두 동일한 결과를 반환한다', () => {
    it('임의 배열에 대해 세 전략의 결과가 일치한다', () => {
      const data = [42, 7, 19, 3, 55, 1, 88, 23]

      const bubble = new Sorter(new BubbleSortStrategy()).sort([...data])
      const quick = new Sorter(new QuickSortStrategy()).sort([...data])
      const merge = new Sorter(new MergeSortStrategy()).sort([...data])

      expect(bubble).toEqual(quick)
      expect(quick).toEqual(merge)
    })
  })

  describe('런타임 전략 교체', () => {
    let sorter: Sorter

    beforeEach(() => {
      sorter = new Sorter(new BubbleSortStrategy())
    })

    it('초기 전략 이름이 정확하다', () => {
      expect(sorter.getStrategyName()).toBe('버블 정렬')
    })

    it('setStrategy로 전략을 교체하면 이름이 바뀐다', () => {
      sorter.setStrategy(new QuickSortStrategy())
      expect(sorter.getStrategyName()).toBe('퀵 정렬')

      sorter.setStrategy(new MergeSortStrategy())
      expect(sorter.getStrategyName()).toBe('머지 정렬')
    })

    it('전략 교체 후 새 전략으로 올바르게 정렬한다', () => {
      const data = [3, 1, 4, 1, 5, 9, 2, 6]
      const expected = [1, 1, 2, 3, 4, 5, 6, 9]

      sorter.setStrategy(new QuickSortStrategy())
      expect(sorter.sort([...data])).toEqual(expected)

      sorter.setStrategy(new MergeSortStrategy())
      expect(sorter.sort([...data])).toEqual(expected)
    })
  })

  describe('원본 배열 불변성', () => {
    it('정렬 후 원본 배열이 변경되지 않는다', () => {
      const original = [5, 3, 8, 1]
      const copy = [...original]

      new Sorter(new BubbleSortStrategy()).sort(original)
      expect(original).toEqual(copy)

      new Sorter(new QuickSortStrategy()).sort(original)
      expect(original).toEqual(copy)

      new Sorter(new MergeSortStrategy()).sort(original)
      expect(original).toEqual(copy)
    })
  })

  describe('엣지 케이스', () => {
    it('빈 배열을 정렬하면 빈 배열이 반환된다', () => {
      expect(new Sorter(new BubbleSortStrategy()).sort([])).toEqual([])
      expect(new Sorter(new QuickSortStrategy()).sort([])).toEqual([])
      expect(new Sorter(new MergeSortStrategy()).sort([])).toEqual([])
    })

    it('요소가 하나인 배열을 정렬하면 그대로 반환된다', () => {
      expect(new Sorter(new BubbleSortStrategy()).sort([42])).toEqual([42])
    })

    it('이미 정렬된 배열도 올바르게 처리한다', () => {
      expect(new Sorter(new QuickSortStrategy()).sort([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
    })
  })
})
