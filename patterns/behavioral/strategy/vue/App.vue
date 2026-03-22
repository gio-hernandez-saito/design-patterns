<script setup lang="ts">
/**
 * Strategy 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   SortStrategy (인터페이스)   → 정렬 함수 타입: (data: number[]) => number[]
 *   ConcreteStrategy들          → ref에 저장된 전략 함수들 (버블/퀵/머지 정렬)
 *   currentStrategy (ref)       → Context: 현재 전략을 저장하는 ref
 *   computed(sorted)            → 전략 교체 시 자동으로 재계산되는 정렬 결과
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 Sorter 클래스(Context)를 Vue에서는 ref로 교체 가능한 전략 함수로 표현한다.
 *   ref에 저장된 함수를 교체하면 computed가 자동으로 새 전략으로 재계산한다.
 *   if/else 없이 알고리즘을 동적으로 교체하는 Strategy 패턴의 핵심을 그대로 구현한다.
 */

import { ref, computed, reactive } from 'vue'

// ─── Strategy 타입 ────────────────────────────────────────────────────────────
interface SortStrategy {
  name: string
  sort: (data: number[]) => number[]
  description: string
}

// ─── ConcreteStrategy 구현체들 ────────────────────────────────────────────────
// 각각은 TypeScript 버전의 BubbleSortStrategy, QuickSortStrategy, MergeSortStrategy에 해당한다.

/** 버블 정렬 전략 */
const bubbleSort: SortStrategy = {
  name: '버블 정렬',
  description: 'O(n²) — 인접한 두 요소를 비교하며 교환',
  sort(data: number[]) {
    const arr = [...data]
    const n = arr.length
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        if (arr[j] > arr[j + 1]) {
          ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        }
      }
    }
    return arr
  },
}

/** 퀵 정렬 전략 */
const quickSort: SortStrategy = {
  name: '퀵 정렬',
  description: 'O(n log n) 평균 — 피벗 기준 분할 정복',
  sort(data: number[]) {
    const arr = [...data]
    function qs(a: number[], lo: number, hi: number) {
      if (lo >= hi) return
      const pivot = a[hi]
      let i = lo - 1
      for (let j = lo; j < hi; j++) {
        if (a[j] <= pivot) { i++; [a[i], a[j]] = [a[j], a[i]] }
      }
      ;[a[i + 1], a[hi]] = [a[hi], a[i + 1]]
      const p = i + 1
      qs(a, lo, p - 1)
      qs(a, p + 1, hi)
    }
    qs(arr, 0, arr.length - 1)
    return arr
  },
}

/** 머지 정렬 전략 */
const mergeSort: SortStrategy = {
  name: '머지 정렬',
  description: 'O(n log n) 안정 — 배열을 반씩 나눠 병합',
  sort(data: number[]) {
    function ms(arr: number[]): number[] {
      if (arr.length <= 1) return arr
      const mid = Math.floor(arr.length / 2)
      const left = ms(arr.slice(0, mid))
      const right = ms(arr.slice(mid))
      const result: number[] = []
      let i = 0, j = 0
      while (i < left.length && j < right.length) {
        result.push(left[i] <= right[j] ? left[i++] : right[j++])
      }
      return result.concat(left.slice(i)).concat(right.slice(j))
    }
    return ms([...data])
  },
}

/** 역방향 정렬 전략 (보너스 전략) */
const reverseSort: SortStrategy = {
  name: '역방향 정렬',
  description: 'O(n log n) — 내림차순 정렬',
  sort(data: number[]) {
    return [...data].sort((a, b) => b - a)
  },
}

const strategies: SortStrategy[] = [bubbleSort, quickSort, mergeSort, reverseSort]

// ─── Context: 현재 전략을 ref로 관리 ─────────────────────────────────────────
// TypeScript 버전의 Sorter 클래스에서 this.strategy = strategy와 동일
// ref에 저장된 함수를 바꾸는 것이 "전략 교체"다
const currentStrategy = ref<SortStrategy>(quickSort)

// 데이터
const inputData = ref([64, 34, 25, 12, 22, 11, 90, 45, 8, 73])
const dataInput = ref('64, 34, 25, 12, 22, 11, 90, 45, 8, 73')
const sortTime = ref(0)

// ─── computed: 현재 전략으로 자동 정렬 ───────────────────────────────────────
// 전략이 바뀌거나 입력 데이터가 바뀌면 자동으로 재계산된다.
// Context.sort()를 computed로 구현한 것이다.
const sortedData = computed(() => {
  const start = performance.now()
  const result = currentStrategy.value.sort(inputData.value)
  sortTime.value = Math.round((performance.now() - start) * 1000) / 1000
  return result
})

function applyInput() {
  const nums = dataInput.value
    .split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n))
  if (nums.length > 0) inputData.value = nums
}

function randomize() {
  const arr = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100) + 1)
  inputData.value = arr
  dataInput.value = arr.join(', ')
}

// 각 요소에 대한 최대값 (시각화 막대 높이 계산용)
const maxValue = computed(() => Math.max(...inputData.value))
</script>

<template>
  <div style="font-family: sans-serif; max-width: 750px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Strategy 패턴</h1>
    <p style="color: #555;">
      정렬 전략을 <code>ref</code>에 저장한다. 버튼으로 전략을 교체하면 <code>computed</code>가
      자동으로 새 알고리즘으로 재계산한다. if/else 없이 런타임에 알고리즘을 교체한다.
    </p>

    <!-- 전략 선택 (Context.setStrategy()) -->
    <div style="margin-bottom: 1.5rem;">
      <div style="font-weight: bold; margin-bottom: 0.5rem;">전략 선택 (currentStrategy 교체):</div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button
          v-for="strategy in strategies"
          :key="strategy.name"
          @click="currentStrategy = strategy"
          :style="{
            padding: '8px 16px', cursor: 'pointer', borderRadius: '6px',
            border: '2px solid',
            borderColor: currentStrategy.name === strategy.name ? '#2b6cb0' : '#ddd',
            background: currentStrategy.name === strategy.name ? '#ebf8ff' : 'white',
            fontWeight: currentStrategy.name === strategy.name ? 'bold' : 'normal',
            transition: 'all 0.15s',
          }"
        >
          {{ strategy.name }}
        </button>
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #555;">
        현재: <strong>{{ currentStrategy.name }}</strong> — {{ currentStrategy.description }}
      </div>
    </div>

    <!-- 데이터 입력 -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; align-items: flex-end; flex-wrap: wrap;">
      <div style="flex: 1;">
        <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">입력 데이터 (쉼표 구분)</label>
        <input v-model="dataInput" @keydown.enter="applyInput"
          style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" />
      </div>
      <button @click="applyInput" style="padding: 8px 14px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; white-space: nowrap;">적용</button>
      <button @click="randomize" style="padding: 8px 14px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; white-space: nowrap;">랜덤</button>
    </div>

    <!-- 시각화 -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- 정렬 전 -->
      <div>
        <div style="font-weight: bold; margin-bottom: 0.5rem;">정렬 전</div>
        <div style="display: flex; align-items: flex-end; gap: 3px; height: 80px; border-bottom: 1px solid #ddd; padding-bottom: 2px;">
          <div
            v-for="(v, i) in inputData"
            :key="i"
            :style="{
              flex: 1, background: '#e2e8f0',
              height: `${(v / maxValue) * 100}%`,
              borderRadius: '2px 2px 0 0',
              minWidth: '4px',
            }"
            :title="String(v)"
          />
        </div>
        <div style="display: flex; gap: 3px; margin-top: 4px; font-size: 0.7rem; color: #888; flex-wrap: wrap;">
          <span v-for="(v, i) in inputData" :key="i">{{ v }}</span>
        </div>
      </div>

      <!-- 정렬 후 -->
      <div>
        <div style="font-weight: bold; margin-bottom: 0.5rem;">
          정렬 후 ({{ currentStrategy.name }}) — {{ sortTime }}ms
        </div>
        <div style="display: flex; align-items: flex-end; gap: 3px; height: 80px; border-bottom: 1px solid #ddd; padding-bottom: 2px;">
          <div
            v-for="(v, i) in sortedData"
            :key="i"
            :style="{
              flex: 1, background: '#4299e1',
              height: `${(v / maxValue) * 100}%`,
              borderRadius: '2px 2px 0 0',
              minWidth: '4px',
            }"
            :title="String(v)"
          />
        </div>
        <div style="display: flex; gap: 3px; margin-top: 4px; font-size: 0.7rem; color: #2b6cb0; flex-wrap: wrap;">
          <span v-for="(v, i) in sortedData" :key="i">{{ v }}</span>
        </div>
      </div>
    </div>

    <div style="background: #fffbeb; border: 1px solid #f6e05e; border-radius: 6px; padding: 0.75rem; font-size: 0.85rem; color: #744210;">
      <strong>패턴 포인트:</strong> 전략 버튼을 클릭하면 <code>currentStrategy ref</code>가 교체되고,
      <code>computed(sortedData)</code>가 새 전략으로 자동 재계산된다.
      Context(Sorter) 코드는 전혀 변경하지 않는다.
    </div>
  </div>
</template>
