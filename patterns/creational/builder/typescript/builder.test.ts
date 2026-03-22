import { describe, it, expect } from 'vitest'
import { HttpRequestBuilderImpl, HttpRequestDirector, HttpRequest } from './builder'

describe('Builder — HTTP Request Builder', () => {
  describe('HttpRequestBuilderImpl 직접 사용', () => {
    it('기본값으로 GET 요청을 만든다', () => {
      const request = new HttpRequestBuilderImpl()
        .setUrl('https://api.example.com/users')
        .build()

      expect(request.method).toBe('GET')
      expect(request.url).toBe('https://api.example.com/users')
      expect(request.timeout).toBe(5000)
      expect(request.retries).toBe(0)
      expect(request.body).toBeNull()
    })

    it('메서드 체이닝으로 모든 옵션을 설정할 수 있다', () => {
      const body = { name: '홍길동', age: 30 }

      const request = new HttpRequestBuilderImpl()
        .setMethod('post') // 소문자도 자동으로 대문자 변환
        .setUrl('https://api.example.com/users')
        .setHeader('Content-Type', 'application/json')
        .setHeader('Authorization', 'Bearer token123')
        .setBody(body)
        .setTimeout(10000)
        .setRetries(3)
        .build()

      expect(request.method).toBe('POST')
      expect(request.url).toBe('https://api.example.com/users')
      expect(request.headers['Content-Type']).toBe('application/json')
      expect(request.headers['Authorization']).toBe('Bearer token123')
      expect(request.body).toEqual(body)
      expect(request.timeout).toBe(10000)
      expect(request.retries).toBe(3)
    })

    it('build()는 HttpRequest 인스턴스를 반환한다', () => {
      const request = new HttpRequestBuilderImpl()
        .setUrl('https://example.com')
        .build()

      expect(request).toBeInstanceOf(HttpRequest)
    })

    it('URL 없이 build()를 호출하면 에러를 던진다', () => {
      const builder = new HttpRequestBuilderImpl()

      expect(() => builder.build()).toThrow('URL은 필수입니다')
    })

    it('음수 타임아웃을 설정하면 에러를 던진다', () => {
      const builder = new HttpRequestBuilderImpl()

      expect(() => builder.setTimeout(-1)).toThrow('타임아웃은 양수여야 합니다')
    })

    it('음수 재시도 횟수를 설정하면 에러를 던진다', () => {
      const builder = new HttpRequestBuilderImpl()

      expect(() => builder.setRetries(-1)).toThrow('재시도 횟수는 0 이상이어야 합니다')
    })

    it('build() 후 headers를 수정해도 이미 생성된 Request에 영향을 주지 않는다 (불변성)', () => {
      const builder = new HttpRequestBuilderImpl()
        .setUrl('https://example.com')
        .setHeader('X-Custom', 'original')

      const request = builder.build()

      // 빌더의 내부 상태를 바꿔도 이미 만들어진 request는 영향받지 않아야 한다
      builder.setHeader('X-Custom', 'modified')
      expect(request.headers['X-Custom']).toBe('original')
    })

    it('reset() 후 다시 빌드하면 기본값으로 초기화된다', () => {
      const builder = new HttpRequestBuilderImpl()

      builder
        .setMethod('DELETE')
        .setUrl('https://api.example.com/resource/1')
        .setHeader('Authorization', 'Bearer token')
        .setTimeout(15000)
        .setRetries(5)

      builder.reset()

      const request = builder.setUrl('https://api.example.com/other').build()

      expect(request.method).toBe('GET') // 기본값
      expect(request.timeout).toBe(5000) // 기본값
      expect(request.retries).toBe(0)   // 기본값
      expect(request.headers).toEqual({}) // 초기화
    })
  })

  describe('HttpRequestDirector — 미리 정의된 빌드 패턴', () => {
    it('buildGetRequest()는 Accept 헤더가 포함된 GET 요청을 만든다', () => {
      const builder = new HttpRequestBuilderImpl()
      const director = new HttpRequestDirector(builder)

      const request = director.buildGetRequest('https://api.example.com/items')

      expect(request.method).toBe('GET')
      expect(request.url).toBe('https://api.example.com/items')
      expect(request.headers['Accept']).toBe('application/json')
    })

    it('buildJsonPostRequest()는 Content-Type이 설정된 POST 요청을 만든다', () => {
      const builder = new HttpRequestBuilderImpl()
      const director = new HttpRequestDirector(builder)
      const payload = { username: 'test', password: '1234' }

      const request = director.buildJsonPostRequest('https://api.example.com/login', payload)

      expect(request.method).toBe('POST')
      expect(request.headers['Content-Type']).toBe('application/json')
      expect(request.headers['Accept']).toBe('application/json')
      expect(request.body).toEqual(payload)
    })

    it('buildResilientRequest()는 재시도와 넉넉한 타임아웃이 설정된 요청을 만든다', () => {
      const builder = new HttpRequestBuilderImpl()
      const director = new HttpRequestDirector(builder)

      const request = director.buildResilientRequest('https://api.external.com/data', 3)

      expect(request.retries).toBe(3)
      expect(request.timeout).toBe(10000)
    })

    it('Director는 같은 빌더로 여러 요청을 순차 생성할 수 있다 (reset 활용)', () => {
      const builder = new HttpRequestBuilderImpl()
      const director = new HttpRequestDirector(builder)

      const getReq = director.buildGetRequest('https://api.example.com/users')
      const postReq = director.buildJsonPostRequest('https://api.example.com/users', { name: '김철수' })

      // 두 요청이 독립적으로 만들어졌는지 확인
      expect(getReq.method).toBe('GET')
      expect(postReq.method).toBe('POST')
      expect(getReq.url).toBe('https://api.example.com/users')
      expect(postReq.body).toEqual({ name: '김철수' })
    })
  })

  describe('toString()', () => {
    it('HttpRequest를 읽기 쉬운 JSON 문자열로 변환한다', () => {
      const request = new HttpRequestBuilderImpl()
        .setUrl('https://example.com')
        .setMethod('GET')
        .build()

      const str = request.toString()
      const parsed = JSON.parse(str)

      expect(parsed.method).toBe('GET')
      expect(parsed.url).toBe('https://example.com')
    })
  })
})
