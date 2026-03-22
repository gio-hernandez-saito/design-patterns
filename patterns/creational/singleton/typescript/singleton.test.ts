import { describe, it, expect, beforeEach } from 'vitest'
import { AppConfig } from './singleton'

describe('Singleton — AppConfig', () => {
  // 각 테스트 전에 인스턴스를 초기화해 테스트 간 간섭을 막는다
  beforeEach(() => {
    AppConfig.resetInstance()
  })

  it('getInstance()는 항상 동일한 인스턴스를 반환한다', () => {
    const instance1 = AppConfig.getInstance()
    const instance2 = AppConfig.getInstance()

    // 참조 동일성(===)으로 확인: 같은 객체를 가리켜야 한다
    expect(instance1).toBe(instance2)
  })

  it('한 인스턴스에서 설정한 값을 다른 참조에서도 읽을 수 있다', () => {
    const instance1 = AppConfig.getInstance()
    instance1.set('theme', 'dark')

    const instance2 = AppConfig.getInstance()
    // instance2는 instance1과 동일한 객체이므로 같은 값을 가져야 한다
    expect(instance2.get('theme')).toBe('dark')
  })

  it('초기 기본값이 설정되어 있다', () => {
    const config = AppConfig.getInstance()

    expect(config.get('logLevel')).toBe('info')
    expect(config.get('apiUrl')).toBe('https://api.example.com')
    expect(config.get('timeout')).toBe('5000')
  })

  it('getAll()은 모든 설정을 객체로 반환한다', () => {
    const config = AppConfig.getInstance()
    config.set('newKey', 'newValue')

    const all = config.getAll()
    expect(all).toHaveProperty('logLevel', 'info')
    expect(all).toHaveProperty('newKey', 'newValue')
  })

  it('존재하지 않는 키는 undefined를 반환한다', () => {
    const config = AppConfig.getInstance()
    expect(config.get('nonExistentKey')).toBeUndefined()
  })

  it('TypeScript 타입 시스템으로 new 직접 호출이 차단된다 (컴파일 타임 보호)', () => {
    // private 생성자이므로 TypeScript에서 new AppConfig()는 컴파일 에러가 발생한다.
    // 런타임 테스트는 불가능하지만, getInstance()가 유일한 진입점임을 확인한다.
    const instance = AppConfig.getInstance()
    expect(instance).toBeInstanceOf(AppConfig)
  })

  it('resetInstance() 후 새 인스턴스가 생성된다', () => {
    const instance1 = AppConfig.getInstance()
    instance1.set('customKey', 'customValue')

    AppConfig.resetInstance()

    const instance2 = AppConfig.getInstance()
    // 초기화 후 새 인스턴스이므로 커스텀 값이 없어야 한다
    expect(instance2.get('customKey')).toBeUndefined()
    // 새 인스턴스이므로 참조가 달라야 한다
    expect(instance1).not.toBe(instance2)
  })
})
