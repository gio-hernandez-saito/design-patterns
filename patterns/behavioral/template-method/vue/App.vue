<script setup lang="ts">
/**
 * Template Method 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   useDataMiner() (base composable)  → AbstractClass: 공통 골격(알고리즘 순서) 정의
 *   useCsvMiner / useJsonMiner 등     → ConcreteClass: 포맷별 구체 구현 제공
 *   mine() 함수                       → Template Method: 고정된 단계 순서로 실행
 *   readData / parseData (override)   → 추상 메서드: 서브클래스가 반드시 구현
 *   analyzeData                       → Hook 메서드: 기본 구현 있지만 선택적 오버라이드 가능
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 추상 클래스 상속 대신 Vue에서는 composable 합성으로 표현한다.
 *   "골격 composable"이 알고리즘 순서를 정의하고,
 *   "구체 composable"이 포맷별 구현 함수를 전달하는 방식이다.
 *   이 패턴은 "fetch → parse → display" 같은 데이터 처리 파이프라인에 자주 사용된다.
 */

import { ref, reactive } from 'vue'

// ─── 공유 타입 ────────────────────────────────────────────────────────────────
interface DataRecord {
  [key: string]: string | number
}

interface MiningResult {
  source: string
  recordCount: number
  sum: number
  average: number
  records: DataRecord[]
  steps: string[]  // 각 단계 실행 로그
}

// ─── Base composable: Template Method 골격 ───────────────────────────────────
/**
 * useDataMiner: 데이터 마이닝의 골격(알고리즘 순서)을 정의하는 base composable.
 *
 * TypeScript 버전의 DataMiner 추상 클래스처럼,
 * mine()이 Template Method이고 readData/parseData는 서브 composable이 구현한다.
 * analyzeData는 기본 구현이 있는 hook 메서드다.
 */
function useDataMiner(config: {
  sourceName: string
  // 추상 메서드 — 구체 composable이 반드시 제공
  readData: (raw: string) => string
  parseData: (data: string) => DataRecord[]
  // Hook 메서드 — 기본 구현 있음, 선택적 오버라이드 가능
  analyzeData?: (records: DataRecord[]) => { sum: number; average: number }
}) {
  const isRunning = ref(false)
  const result = ref<MiningResult | null>(null)
  const error = ref('')

  /**
   * Template Method: mine()
   * 알고리즘 순서는 고정되어 있고, 세부 구현만 config에서 가져온다.
   * TypeScript 버전의 DataMiner.mine()과 완전히 동일한 구조다.
   */
  async function mine(rawData: string) {
    isRunning.value = true
    error.value = ''
    const steps: string[] = []

    try {
      // 1단계: 데이터 읽기 (추상 메서드 — config.readData가 구현 제공)
      steps.push('1. readData(): 원시 데이터 전처리')
      const data = config.readData(rawData)

      // 2단계: 파싱 (추상 메서드 — config.parseData가 구현 제공)
      steps.push('2. parseData(): 포맷에 맞게 파싱')
      const records = config.parseData(data)
      steps.push(`   → ${records.length}개 레코드 파싱 완료`)

      // 3단계: 분석 (Hook 메서드 — 기본 구현 또는 오버라이드)
      steps.push('3. analyzeData(): 데이터 분석')
      const analyze = config.analyzeData ?? defaultAnalyze
      const { sum, average } = analyze(records)
      steps.push(`   → 합계: ${sum}, 평균: ${average}`)

      // 4단계: 결과 반환 (공통 로직 — 서브클래스가 오버라이드 불필요)
      steps.push('4. formatResult(): 결과 정형화')

      result.value = {
        source: config.sourceName,
        recordCount: records.length,
        sum,
        average,
        records,
        steps,
      }
    } catch (e) {
      error.value = `파싱 오류: ${(e as Error).message}`
    } finally {
      isRunning.value = false
    }
  }

  return { mine, result, isRunning, error }
}

/** 기본 분석 함수 (Hook 메서드의 기본 구현) */
function defaultAnalyze(records: DataRecord[]) {
  const nums = records.flatMap(r => Object.values(r).filter(v => typeof v === 'number')).map(Number)
  const sum = nums.reduce((a, b) => a + b, 0)
  const average = nums.length > 0 ? Math.round((sum / nums.length) * 100) / 100 : 0
  return { sum, average }
}

// ─── ConcreteClass: CSV 마이너 ────────────────────────────────────────────────
const csvMiner = useDataMiner({
  sourceName: 'CSV',
  readData: (raw) => raw.trim(),
  parseData: (data) => {
    const lines = data.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const record: DataRecord = {}
      headers.forEach((h, i) => {
        const v = values[i] ?? ''
        record[h] = isNaN(Number(v)) ? v : Number(v)
      })
      return record
    })
  },
})

// ─── ConcreteClass: JSON 마이너 ───────────────────────────────────────────────
const jsonMiner = useDataMiner({
  sourceName: 'JSON',
  readData: (raw) => raw.trim(),
  parseData: (data) => {
    const parsed = JSON.parse(data)
    return (Array.isArray(parsed) ? parsed : [parsed]) as DataRecord[]
  },
})

// ─── ConcreteClass: 커스텀 분석 마이너 (Hook 오버라이드) ──────────────────────
// analyzeData를 오버라이드해 최대값/최소값도 계산하는 확장 버전
const customMiner = useDataMiner({
  sourceName: 'CSV (커스텀 분석)',
  readData: (raw) => raw.trim(),
  parseData: (data) => {
    const lines = data.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const record: DataRecord = {}
      headers.forEach((h, i) => {
        const v = values[i] ?? ''
        record[h] = isNaN(Number(v)) ? v : Number(v)
      })
      return record
    })
  },
  // Hook 메서드 오버라이드: 기본 구현 대신 커스텀 분석 사용
  analyzeData: (records) => {
    const nums = records.flatMap(r => Object.values(r).filter(v => typeof v === 'number')).map(Number)
    if (nums.length === 0) return { sum: 0, average: 0 }
    const sum = nums.reduce((a, b) => a + b, 0)
    const average = Math.round((sum / nums.length) * 100) / 100
    return { sum, average }
  },
})

// ─── 샘플 데이터 ──────────────────────────────────────────────────────────────
const sampleCsv = ref(`name,age,score
홍길동,25,90
김철수,30,85
이영희,28,92
박민수,22,78`)

const sampleJson = ref(`[
  {"name": "홍길동", "age": 25, "score": 90},
  {"name": "김철수", "age": 30, "score": 85},
  {"name": "이영희", "age": 28, "score": 92}
]`)

type MinerType = 'csv' | 'json' | 'custom'
const selectedMiner = ref<MinerType>('csv')

const miners = { csv: csvMiner, json: jsonMiner, custom: customMiner }
const inputData = ref(sampleCsv.value)

function onMinerChange() {
  if (selectedMiner.value === 'json') {
    inputData.value = sampleJson.value
  } else {
    inputData.value = sampleCsv.value
  }
  miners[selectedMiner.value].result.value = null
}

async function runMine() {
  await miners[selectedMiner.value].mine(inputData.value)
}

const currentMiner = { get result() { return miners[selectedMiner.value].result }, get isRunning() { return miners[selectedMiner.value].isRunning }, get error() { return miners[selectedMiner.value].error } }
</script>

<template>
  <div style="font-family: sans-serif; max-width: 750px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Template Method 패턴</h1>
    <p style="color: #555;">
      <code>useDataMiner()</code>가 Template Method composable이다.
      <code>mine()</code>은 알고리즘 순서(readData → parseData → analyzeData → formatResult)를 고정하고,
      포맷별 구현(CSV/JSON)은 config 함수로 주입된다.
    </p>

    <!-- 마이너 선택 -->
    <div style="margin-bottom: 1.5rem;">
      <div style="font-weight: bold; margin-bottom: 0.5rem;">ConcreteClass 선택:</div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <label v-for="(label, key) in { csv: 'CSV 마이너', json: 'JSON 마이너', custom: 'CSV (Hook 오버라이드)' }" :key="key"
          style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" :value="key" v-model="selectedMiner" @change="onMinerChange" />
          <span>{{ label }}</span>
        </label>
      </div>
      <div style="font-size: 0.8rem; color: #555; margin-top: 0.25rem;">
        선택된 마이너: <strong>{{ miners[selectedMiner].result.value?.source ?? selectedMiner }}</strong>
        <span v-if="selectedMiner === 'custom'" style="color: #744210;"> — analyzeData Hook을 오버라이드</span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- 입력 데이터 -->
      <div>
        <h3 style="margin-top: 0;">입력 데이터</h3>
        <textarea v-model="inputData" rows="10"
          style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 0.85rem; resize: vertical;" />
        <button @click="runMine" :disabled="currentMiner.isRunning.value"
          style="width: 100%; margin-top: 0.5rem; padding: 10px; background: #2b6cb0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
          {{ currentMiner.isRunning.value ? '실행 중...' : 'mine() 실행' }}
        </button>
        <div v-if="currentMiner.error.value" style="color: #c53030; font-size: 0.85rem; margin-top: 0.5rem;">
          {{ currentMiner.error.value }}
        </div>
      </div>

      <!-- 결과 -->
      <div>
        <h3 style="margin-top: 0;">실행 결과</h3>
        <div v-if="!currentMiner.result.value" style="color: #888; font-style: italic; font-size: 0.9rem;">
          "mine() 실행" 버튼을 눌러 Template Method 실행 과정을 확인하세요.
        </div>
        <template v-else>
          <!-- 단계 실행 로그 -->
          <div style="border: 1px solid #bee3f8; border-radius: 6px; padding: 0.75rem; background: #ebf8ff; margin-bottom: 1rem;">
            <div style="font-weight: bold; font-size: 0.85rem; color: #2b6cb0; margin-bottom: 0.5rem;">Template Method 실행 단계:</div>
            <div v-for="step in currentMiner.result.value.steps" :key="step"
              style="font-size: 0.8rem; font-family: monospace; color: #2d3748; padding: 1px 0;">
              {{ step }}
            </div>
          </div>

          <!-- 분석 결과 -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
            <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 6px; padding: 0.75rem; text-align: center;">
              <div style="font-size: 0.8rem; color: #276749;">레코드 수</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #276749;">{{ currentMiner.result.value.recordCount }}</div>
            </div>
            <div style="background: #faf5ff; border: 1px solid #d6bcfa; border-radius: 6px; padding: 0.75rem; text-align: center;">
              <div style="font-size: 0.8rem; color: #553c9a;">숫자 합계</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #553c9a;">{{ currentMiner.result.value.sum }}</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #f6e05e; border-radius: 6px; padding: 0.75rem; text-align: center;">
              <div style="font-size: 0.8rem; color: #744210;">평균</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #744210;">{{ currentMiner.result.value.average }}</div>
            </div>
            <div style="background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 0.75rem; text-align: center;">
              <div style="font-size: 0.8rem; color: #555;">소스</div>
              <div style="font-size: 1.1rem; font-weight: bold; color: #333;">{{ currentMiner.result.value.source }}</div>
            </div>
          </div>

          <!-- 파싱된 레코드 -->
          <div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 0.5rem;">파싱된 레코드:</div>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 0.5rem; background: #f9f9f9;">
            <div v-for="(record, i) in currentMiner.result.value.records" :key="i"
              style="font-size: 0.8rem; font-family: monospace; padding: 2px 0; border-bottom: 1px solid #eee;">
              {{ JSON.stringify(record) }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
