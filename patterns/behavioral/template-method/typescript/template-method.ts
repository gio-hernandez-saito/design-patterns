// ============================================================
// Template Method 패턴 - 데이터 마이닝 예시
//
// 역할 매핑:
//   AbstractClass → DataMiner (추상 클래스, 공통 골격 정의)
//   ConcreteClass → CsvDataMiner, JsonDataMiner, XmlDataMiner
//
// 왜 이 패턴을 쓰는가?
//   알고리즘의 골격(순서)은 고정하고, 세부 구현만 서브클래스가 제공하게 한다.
//   공통 흐름을 부모 클래스에 두어 코드 중복을 방지하면서,
//   각 포맷마다 다른 부분만 오버라이드로 교체한다.
// ============================================================

// ── AbstractClass (템플릿 메서드 보유) ───────────────────────

/**
 * AbstractClass: 데이터 마이닝 공통 골격
 *
 * templateMethod인 mine()이 알고리즘의 순서를 정의한다:
 *   1. 데이터 읽기 (readData)
 *   2. 데이터 파싱 (parseData)
 *   3. 데이터 분석 (analyzeData) ← hook: 선택적 오버라이드
 *   4. 결과 반환 (formatResult)
 *
 * 추상 메서드는 서브클래스가 반드시 구현해야 하고,
 * hook 메서드는 기본 구현이 있어 선택적으로 오버라이드한다.
 */
export abstract class DataMiner {
  /**
   * Template Method: 데이터 마이닝의 전체 흐름을 정의한다.
   * final처럼 동작해야 하므로 서브클래스가 오버라이드하면 안 된다.
   * (TypeScript에는 Java의 final이 없으므로 주석으로 의도를 명시)
   */
  mine(rawData: string): MiningResult {
    // 1단계: 원시 데이터를 읽는다
    const data = this.readData(rawData)

    // 2단계: 포맷에 맞게 파싱한다 (서브클래스마다 다름)
    const records = this.parseData(data)

    // 3단계: 분석한다 (hook - 기본 구현 있음, 선택적 오버라이드 가능)
    const analyzed = this.analyzeData(records)

    // 4단계: 결과를 정형화해 반환한다
    return this.formatResult(analyzed)
  }

  // ── 추상 메서드 (서브클래스가 반드시 구현) ──────────────────

  /** 원시 문자열 데이터를 전처리한다 */
  protected abstract readData(raw: string): string

  /** 포맷에 맞게 데이터를 파싱해 레코드 배열로 변환한다 */
  protected abstract parseData(data: string): DataRecord[]

  // ── Hook 메서드 (선택적 오버라이드) ─────────────────────────

  /**
   * 파싱된 레코드를 분석한다.
   * 기본 구현: 숫자 필드의 합계와 평균을 계산한다.
   * 서브클래스가 분석 방식을 바꾸고 싶을 때만 오버라이드한다.
   */
  protected analyzeData(records: DataRecord[]): AnalyzedData {
    const numericValues = records
      .flatMap((r) => Object.values(r).filter((v) => typeof v === 'number'))
      .map(Number)

    const sum = numericValues.reduce((acc, v) => acc + v, 0)
    const average = numericValues.length > 0 ? sum / numericValues.length : 0

    return {
      recordCount: records.length,
      sum,
      average: Math.round(average * 100) / 100, // 소수점 2자리로 반올림
      records,
    }
  }

  /** 분석 결과를 최종 반환 형식으로 변환한다 */
  protected formatResult(analyzed: AnalyzedData): MiningResult {
    return {
      source: this.getSourceType(),
      ...analyzed,
    }
  }

  /** 데이터 소스 타입 이름을 반환한다 (서브클래스가 정의) */
  protected abstract getSourceType(): string
}

// ── 공유 데이터 타입 ─────────────────────────────────────────

/** 파싱된 단일 레코드를 나타낸다 */
export interface DataRecord {
  [key: string]: string | number
}

/** analyzeData의 결과 구조 */
export interface AnalyzedData {
  recordCount: number
  sum: number
  average: number
  records: DataRecord[]
}

/** mine()의 최종 반환 구조 */
export interface MiningResult extends AnalyzedData {
  source: string
}

// ── ConcreteClass 구현체들 ───────────────────────────────────

/**
 * ConcreteClass: CSV 형식 데이터 마이너
 * "name,age,score\n홍길동,25,90" 형태의 CSV를 파싱한다.
 */
export class CsvDataMiner extends DataMiner {
  protected getSourceType(): string {
    return 'CSV'
  }

  protected readData(raw: string): string {
    // CSV 전처리: 앞뒤 공백 제거
    return raw.trim()
  }

  protected parseData(data: string): DataRecord[] {
    const lines = data.split('\n').filter((l) => l.trim() !== '')
    if (lines.length < 2) return []

    // 첫 번째 줄을 헤더로 사용한다
    const headers = lines[0].split(',').map((h) => h.trim())

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim())
      const record: DataRecord = {}
      headers.forEach((header, i) => {
        const value = values[i] ?? ''
        // 숫자로 파싱 가능하면 숫자로, 아니면 문자열로 저장
        record[header] = isNaN(Number(value)) ? value : Number(value)
      })
      return record
    })
  }
}

/**
 * ConcreteClass: JSON 형식 데이터 마이너
 * "[{\"name\":\"홍길동\",\"age\":25}]" 형태의 JSON 배열을 파싱한다.
 */
export class JsonDataMiner extends DataMiner {
  protected getSourceType(): string {
    return 'JSON'
  }

  protected readData(raw: string): string {
    // JSON 전처리: 앞뒤 공백 제거
    return raw.trim()
  }

  protected parseData(data: string): DataRecord[] {
    const parsed = JSON.parse(data)
    // 배열이 아니면 단일 객체를 배열로 감싼다
    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
    return items as DataRecord[]
  }
}

/**
 * ConcreteClass: XML 형식 데이터 마이너
 * "<records><record><name>홍길동</name><age>25</age></record></records>" 형태를 파싱한다.
 *
 * 실제 XML 파서 대신 단순 정규식으로 구현한다
 * (외부 라이브러리 의존성 없이 패턴 데모에 집중하기 위해)
 */
export class XmlDataMiner extends DataMiner {
  protected getSourceType(): string {
    return 'XML'
  }

  protected readData(raw: string): string {
    // XML 전처리: 공백/개행 정규화
    return raw.trim().replace(/\s+/g, ' ')
  }

  protected parseData(data: string): DataRecord[] {
    const records: DataRecord[] = []
    // <record>...</record> 블록을 하나씩 추출
    const recordMatches = data.matchAll(/<record>(.*?)<\/record>/g)

    for (const match of recordMatches) {
      const recordContent = match[1]
      const record: DataRecord = {}

      // 각 태그에서 필드명과 값을 추출
      const fieldMatches = recordContent.matchAll(/<(\w+)>(.*?)<\/\1>/g)
      for (const field of fieldMatches) {
        const [, tagName, value] = field
        // 숫자로 파싱 가능하면 숫자로, 아니면 문자열로 저장
        record[tagName] = isNaN(Number(value)) ? value : Number(value)
      }
      records.push(record)
    }
    return records
  }
}
