/**
 * Singleton 패턴
 *
 * 목적: 클래스의 인스턴스가 오직 하나만 존재하도록 보장하고,
 *       어디서든 그 인스턴스에 접근할 수 있는 전역 진입점을 제공한다.
 *
 * 핵심 아이디어:
 * - 생성자를 private으로 막아 외부에서 new를 사용하지 못하게 한다.
 * - 클래스 내부에 자기 자신의 인스턴스를 static으로 보관한다.
 * - 인스턴스가 없을 때만 새로 만들고(lazy initialization), 있으면 기존 것을 반환한다.
 *
 * 역할 매핑:
 * - Singleton → AppConfig 클래스 (유일한 인스턴스를 보장하는 클래스 자체)
 */

/**
 * 애플리케이션 전역 설정을 관리하는 Singleton 클래스.
 *
 * 앱 전체에서 설정 값을 일관되게 유지해야 하기 때문에
 * 인스턴스가 하나만 존재해야 한다. 예를 들어 로그 레벨, API URL 등이 이에 해당한다.
 */
export class AppConfig {
  // 유일한 인스턴스를 저장하는 static 필드.
  // null로 시작해서 처음 getInstance()가 호출될 때 생성된다(lazy initialization).
  private static instance: AppConfig | null = null;

  // 설정 값들을 담는 내부 저장소
  private config: Map<string, string> = new Map();

  /**
   * 생성자를 private으로 선언해 외부에서 new AppConfig()를 호출하지 못하게 막는다.
   * 이것이 Singleton의 핵심: 오직 클래스 내부에서만 인스턴스를 만들 수 있다.
   */
  private constructor() {
    // 초기 기본 설정값 세팅
    this.config.set('logLevel', 'info');
    this.config.set('apiUrl', 'https://api.example.com');
    this.config.set('timeout', '5000');
  }

  /**
   * 유일한 인스턴스를 반환하는 정적 메서드 — Singleton의 전역 진입점.
   *
   * 처음 호출될 때만 인스턴스를 생성하고(lazy initialization),
   * 이후 호출에서는 이미 만들어진 인스턴스를 그대로 반환한다.
   *
   * @returns AppConfig의 유일한 인스턴스
   */
  public static getInstance(): AppConfig {
    // 인스턴스가 아직 없을 때만 새로 생성한다.
    // 이미 있으면 기존 인스턴스를 반환해 항상 동일한 객체를 보장한다.
    if (AppConfig.instance === null) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  /**
   * 설정 값을 가져온다.
   * @param key 설정 키
   * @returns 설정 값, 없으면 undefined
   */
  public get(key: string): string | undefined {
    return this.config.get(key);
  }

  /**
   * 설정 값을 설정한다.
   * @param key 설정 키
   * @param value 설정 값
   */
  public set(key: string, value: string): void {
    this.config.set(key, value);
  }

  /**
   * 현재 모든 설정을 일반 객체로 반환한다.
   */
  public getAll(): Record<string, string> {
    return Object.fromEntries(this.config);
  }

  /**
   * 테스트 용도로만 사용: 인스턴스를 초기화해 다음 호출에서 새로 생성되게 한다.
   * 프로덕션 코드에서는 절대 호출하지 말 것.
   *
   * @internal
   */
  public static resetInstance(): void {
    AppConfig.instance = null;
  }
}
