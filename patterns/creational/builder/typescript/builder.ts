/**
 * Builder 패턴
 *
 * 목적: 복잡한 객체의 생성 과정을 단계별로 분리해,
 *       동일한 생성 절차로 서로 다른 표현을 만들 수 있게 한다.
 *
 * 핵심 아이디어:
 * - 생성자에 매개변수가 너무 많거나(telescoping constructor 문제),
 *   객체를 단계별로 구성해야 할 때 Builder를 사용한다.
 * - Builder가 부품별로 설정 메서드를 제공하고, 마지막에 build()를 호출해 완성품을 반환한다.
 * - Director는 Builder를 사용해 특정 조합의 객체를 미리 정의된 순서로 만든다.
 *
 * 역할 매핑:
 * - Product         → HttpRequest (최종 생성될 객체)
 * - Builder         → HttpRequestBuilder (빌더 인터페이스)
 * - ConcreteBuilder → HttpRequestBuilderImpl (실제 빌더 구현)
 * - Director        → HttpRequestDirector (자주 쓰는 조합을 미리 정의)
 */

// ─────────────────────────────────────────────
// Product: 최종적으로 생성될 복잡한 객체
// ─────────────────────────────────────────────

/**
 * HTTP 요청을 나타내는 불변(immutable) 객체 — Product 역할.
 *
 * 필드가 많기 때문에 생성자로 직접 만들면 코드가 읽기 어려워진다.
 * Builder를 통해 이름 있는 단계별 설정으로 가독성을 높인다.
 */
export class HttpRequest {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
  public readonly body: unknown | null;
  public readonly timeout: number;
  public readonly retries: number;

  // 외부에서 직접 new HttpRequest()를 못 하게 package-private 수준으로 관리한다.
  // TypeScript에는 package 접근 제어가 없으므로 Builder만이 이 생성자를 호출하도록 규약으로 정한다.
  constructor(params: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown | null;
    timeout: number;
    retries: number;
  }) {
    this.method = params.method;
    this.url = params.url;
    this.headers = params.headers;
    this.body = params.body;
    this.timeout = params.timeout;
    this.retries = params.retries;
  }

  /**
   * 디버깅/로깅용 문자열 표현
   */
  public toString(): string {
    return JSON.stringify(
      {
        method: this.method,
        url: this.url,
        headers: this.headers,
        body: this.body,
        timeout: this.timeout,
        retries: this.retries,
      },
      null,
      2,
    );
  }
}

// ─────────────────────────────────────────────
// Builder: 단계별 설정 메서드를 선언하는 인터페이스
// ─────────────────────────────────────────────

/**
 * HTTP 요청 빌더의 인터페이스 — Builder 역할.
 *
 * 각 메서드는 this를 반환해 메서드 체이닝을 지원한다.
 * 예: builder.setMethod('GET').setUrl('...').build()
 */
export interface HttpRequestBuilder {
  setMethod(method: string): this;
  setUrl(url: string): this;
  setHeader(key: string, value: string): this;
  setBody(body: unknown): this;
  setTimeout(ms: number): this;
  setRetries(count: number): this;
  /** 지금까지 설정한 값으로 HttpRequest를 생성한다 */
  build(): HttpRequest;
  /** 빌더 상태를 초기화해 재사용할 수 있게 한다 */
  reset(): this;
}

// ─────────────────────────────────────────────
// ConcreteBuilder: 실제 빌더 구현
// ─────────────────────────────────────────────

/**
 * HttpRequest를 단계별로 조립하는 구체 빌더 — ConcreteBuilder 역할.
 *
 * 각 설정 메서드는 this를 반환해 체이닝이 가능하다.
 * build()가 호출될 때 필수 값(method, url)이 있는지 검증한다.
 */
export class HttpRequestBuilderImpl implements HttpRequestBuilder {
  // 누적되는 설정 값들 — 단계별로 쌓인다
  private method: string = 'GET';
  private url: string = '';
  private headers: Record<string, string> = {};
  private body: unknown | null = null;
  private timeout: number = 5000; // 기본값: 5초
  private retries: number = 0;   // 기본값: 재시도 없음

  public setMethod(method: string): this {
    this.method = method.toUpperCase();
    return this; // 체이닝을 위해 자기 자신을 반환한다
  }

  public setUrl(url: string): this {
    this.url = url;
    return this;
  }

  public setHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  public setBody(body: unknown): this {
    this.body = body;
    return this;
  }

  public setTimeout(ms: number): this {
    if (ms <= 0) {
      // 유효하지 않은 타임아웃은 거부한다
      throw new Error(`타임아웃은 양수여야 합니다: ${ms}`);
    }
    this.timeout = ms;
    return this;
  }

  public setRetries(count: number): this {
    if (count < 0) {
      throw new Error(`재시도 횟수는 0 이상이어야 합니다: ${count}`);
    }
    this.retries = count;
    return this;
  }

  /**
   * 지금까지 설정한 부품들을 조합해 완성된 HttpRequest를 반환한다.
   * 필수 값(url)이 없으면 에러를 던진다.
   */
  public build(): HttpRequest {
    // 필수 값 검증: URL이 없으면 요청을 만들 수 없다
    if (!this.url) {
      throw new Error('URL은 필수입니다. setUrl()을 먼저 호출하세요.');
    }

    return new HttpRequest({
      method: this.method,
      url: this.url,
      // 헤더는 불변 복사본을 전달해 빌더 상태 변경이 Product에 영향을 주지 않게 한다
      headers: { ...this.headers },
      body: this.body,
      timeout: this.timeout,
      retries: this.retries,
    });
  }

  /**
   * 빌더를 초기 상태로 되돌린다.
   * 같은 빌더 인스턴스를 재사용해 여러 요청을 만들 때 사용한다.
   */
  public reset(): this {
    this.method = 'GET';
    this.url = '';
    this.headers = {};
    this.body = null;
    this.timeout = 5000;
    this.retries = 0;
    return this;
  }
}

// ─────────────────────────────────────────────
// Director: 자주 쓰는 빌드 순서를 미리 정의
// ─────────────────────────────────────────────

/**
 * 자주 사용하는 HTTP 요청 조합을 미리 정의하는 Director.
 *
 * Director가 없어도 빌더를 직접 사용할 수 있지만,
 * 공통 패턴을 재사용하고 실수를 줄이기 위해 Director를 도입한다.
 * 예: 모든 JSON API 요청에 Content-Type 헤더를 빠뜨리지 않도록 보장한다.
 */
export class HttpRequestDirector {
  // Director는 Builder 인터페이스만 알고, 구체 빌더를 몰라도 된다
  constructor(private readonly builder: HttpRequestBuilder) {}

  /**
   * 기본 GET 요청을 만든다.
   */
  public buildGetRequest(url: string): HttpRequest {
    return this.builder
      .reset()
      .setMethod('GET')
      .setUrl(url)
      .setHeader('Accept', 'application/json')
      .build();
  }

  /**
   * JSON 바디를 포함한 POST 요청을 만든다.
   * Content-Type 헤더를 자동으로 설정해 실수를 방지한다.
   */
  public buildJsonPostRequest(url: string, body: unknown): HttpRequest {
    return this.builder
      .reset()
      .setMethod('POST')
      .setUrl(url)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Accept', 'application/json')
      .setBody(body)
      .build();
  }

  /**
   * 재시도가 포함된 안정적인 요청을 만든다.
   * 외부 API 호출처럼 네트워크가 불안정한 환경에서 사용한다.
   */
  public buildResilientRequest(url: string, retries: number = 3): HttpRequest {
    return this.builder
      .reset()
      .setMethod('GET')
      .setUrl(url)
      .setHeader('Accept', 'application/json')
      .setTimeout(10000) // 재시도가 있으므로 타임아웃을 넉넉하게 설정
      .setRetries(retries)
      .build();
  }
}
