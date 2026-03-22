import { describe, it, expect } from 'vitest'
import {
  CsvDataMiner,
  JsonDataMiner,
  XmlDataMiner,
} from './template-method.js'

describe('Template Method 패턴 - 데이터 마이닝', () => {
  describe('CSV 데이터 마이너', () => {
    const miner = new CsvDataMiner()

    const csvData = `name,age,score
홍길동,25,90
김영희,30,85
이철수,28,92`

    it('CSV 데이터를 파싱해 올바른 레코드 수를 반환한다', () => {
      const result = miner.mine(csvData)
      expect(result.source).toBe('CSV')
      expect(result.recordCount).toBe(3)
    })

    it('숫자 필드의 합계와 평균을 계산한다', () => {
      const result = miner.mine(csvData)
      // 숫자 값: 25, 90, 30, 85, 28, 92 → 합계 350, 평균 58.33
      expect(result.sum).toBe(350)
      expect(result.average).toBe(58.33)
    })

    it('파싱된 레코드의 필드 타입이 올바르다', () => {
      const result = miner.mine(csvData)
      expect(typeof result.records[0]['name']).toBe('string')
      expect(typeof result.records[0]['age']).toBe('number')
      expect(result.records[0]['name']).toBe('홍길동')
      expect(result.records[0]['age']).toBe(25)
    })
  })

  describe('JSON 데이터 마이너', () => {
    const miner = new JsonDataMiner()

    const jsonData = JSON.stringify([
      { name: '홍길동', age: 25, score: 90 },
      { name: '김영희', age: 30, score: 85 },
    ])

    it('JSON 배열 데이터를 파싱해 올바른 레코드 수를 반환한다', () => {
      const result = miner.mine(jsonData)
      expect(result.source).toBe('JSON')
      expect(result.recordCount).toBe(2)
    })

    it('JSON 숫자 필드의 합계를 계산한다', () => {
      const result = miner.mine(jsonData)
      // 숫자 값: 25, 90, 30, 85 → 합계 230
      expect(result.sum).toBe(230)
    })

    it('단일 객체 JSON도 처리한다', () => {
      const singleJson = JSON.stringify({ name: '테스트', value: 42 })
      const result = miner.mine(singleJson)
      expect(result.recordCount).toBe(1)
      expect(result.sum).toBe(42)
    })
  })

  describe('XML 데이터 마이너', () => {
    const miner = new XmlDataMiner()

    const xmlData = `<records>
  <record><name>홍길동</name><age>25</age><score>90</score></record>
  <record><name>김영희</name><age>30</age><score>85</score></record>
</records>`

    it('XML 데이터를 파싱해 올바른 레코드 수를 반환한다', () => {
      const result = miner.mine(xmlData)
      expect(result.source).toBe('XML')
      expect(result.recordCount).toBe(2)
    })

    it('XML 숫자 필드의 합계를 계산한다', () => {
      const result = miner.mine(xmlData)
      // 숫자 값: 25, 90, 30, 85 → 합계 230
      expect(result.sum).toBe(230)
    })

    it('XML 레코드의 필드 타입이 올바르다', () => {
      const result = miner.mine(xmlData)
      expect(typeof result.records[0]['name']).toBe('string')
      expect(typeof result.records[0]['age']).toBe('number')
      expect(result.records[0]['name']).toBe('홍길동')
    })
  })

  describe('골격(Template) 유지 확인', () => {
    it('세 마이너 모두 동일한 MiningResult 구조를 반환한다', () => {
      const csv = new CsvDataMiner()
      const json = new JsonDataMiner()
      const xml = new XmlDataMiner()

      const csvResult = csv.mine('name,score\n테스트,100')
      const jsonResult = json.mine(JSON.stringify([{ name: '테스트', score: 100 }]))
      const xmlResult = xml.mine('<records><record><name>테스트</name><score>100</score></record></records>')

      // 모든 결과가 동일한 필드 구조를 가진다 (골격이 공유되기 때문)
      for (const result of [csvResult, jsonResult, xmlResult]) {
        expect(result).toHaveProperty('source')
        expect(result).toHaveProperty('recordCount')
        expect(result).toHaveProperty('sum')
        expect(result).toHaveProperty('average')
        expect(result).toHaveProperty('records')
      }
    })

    it('같은 논리적 데이터를 다른 포맷으로 처리하면 동일한 통계를 반환한다', () => {
      const csv = new CsvDataMiner()
      const json = new JsonDataMiner()

      const csvResult = csv.mine('value\n10\n20\n30')
      const jsonResult = json.mine(JSON.stringify([{ value: 10 }, { value: 20 }, { value: 30 }]))

      expect(csvResult.sum).toBe(jsonResult.sum)
      expect(csvResult.average).toBe(jsonResult.average)
      expect(csvResult.recordCount).toBe(jsonResult.recordCount)
    })
  })

  describe('엣지 케이스', () => {
    it('빈 CSV(헤더만 있음)는 빈 레코드를 반환한다', () => {
      const result = new CsvDataMiner().mine('name,age')
      expect(result.recordCount).toBe(0)
      expect(result.sum).toBe(0)
    })

    it('빈 JSON 배열은 빈 레코드를 반환한다', () => {
      const result = new JsonDataMiner().mine('[]')
      expect(result.recordCount).toBe(0)
    })
  })
})
