// =============================================================================
// 퍼사드 패턴 (Facade Pattern)
// =============================================================================
// 목적: 복잡한 서브시스템에 단순한 인터페이스를 제공한다.
//       클라이언트가 여러 서브시스템을 직접 다루지 않고 퍼사드 하나만 알면 된다.
//
// 왜 필요한가?
// - 홈시어터를 켜려면 TV, 스트리밍 박스, 앰프, 조명을 순서에 맞게 제어해야 한다.
// - 각 기기의 API를 모두 알아야 하는 복잡성을 퍼사드가 숨긴다.
// - watchMovie("인터스텔라") 한 줄로 모든 설정이 완료된다.
//
// 역할 매핑:
//   HomeTheaterFacade (Facade)   → 복잡한 서브시스템 조작을 단순화하는 퍼사드
//   TV, Amplifier, StreamingBox, SmartLights (서브시스템) → 각자의 복잡한 API를 가진 시스템들
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 서브시스템 클래스들: 복잡한 내부 시스템
// 각각은 자체적으로 복잡한 API를 가진다. 클라이언트가 직접 다루기 어렵다.
// ─────────────────────────────────────────────────────────────────────────────

/** TV 서브시스템: 화면 제어 */
export class TV {
  private isOn: boolean = false;
  private currentInput: string = "HDMI1";
  private brightness: number = 80;

  turnOn(): void {
    this.isOn = true;
  }

  turnOff(): void {
    this.isOn = false;
  }

  setInput(input: string): void {
    if (!this.isOn) throw new Error("TV가 꺼져 있습니다");
    this.currentInput = input;
  }

  setBrightness(level: number): void {
    if (level < 0 || level > 100) throw new Error("밝기는 0~100이어야 합니다");
    this.brightness = level;
  }

  enableCinemaMode(): void {
    // 시네마 모드: 명암비 최대화, 노이즈 감소
    this.brightness = 60;
  }

  getStatus(): string {
    return `TV: ${this.isOn ? "켜짐" : "꺼짐"}, 입력: ${this.currentInput}, 밝기: ${this.brightness}`;
  }

  getIsOn(): boolean { return this.isOn; }
  getCurrentInput(): string { return this.currentInput; }
  getBrightness(): number { return this.brightness; }
}

/** 앰프 서브시스템: 오디오 제어 */
export class Amplifier {
  private isOn: boolean = false;
  private volume: number = 30;
  private surroundMode: string = "스테레오";

  turnOn(): void {
    this.isOn = true;
  }

  turnOff(): void {
    this.isOn = false;
  }

  setVolume(level: number): void {
    if (!this.isOn) throw new Error("앰프가 꺼져 있습니다");
    if (level < 0 || level > 100) throw new Error("볼륨은 0~100이어야 합니다");
    this.volume = level;
  }

  setSurroundMode(mode: "스테레오" | "5.1채널" | "돌비 애트모스"): void {
    this.surroundMode = mode;
  }

  setTreble(level: number): void {
    // 고음역 조절 (복잡한 DSP 설정)
  }

  setBass(level: number): void {
    // 저음역 조절 (복잡한 DSP 설정)
  }

  getStatus(): string {
    return `앰프: ${this.isOn ? "켜짐" : "꺼짐"}, 볼륨: ${this.volume}, 모드: ${this.surroundMode}`;
  }

  getIsOn(): boolean { return this.isOn; }
  getVolume(): number { return this.volume; }
  getSurroundMode(): string { return this.surroundMode; }
}

/** 스트리밍 박스 서브시스템: 미디어 재생 제어 */
export class StreamingBox {
  private isOn: boolean = false;
  private currentApp: string = "";
  private currentContent: string = "";

  turnOn(): void {
    this.isOn = true;
  }

  turnOff(): void {
    this.isOn = false;
    this.currentContent = "";
  }

  launchApp(app: string): void {
    if (!this.isOn) throw new Error("스트리밍 박스가 꺼져 있습니다");
    this.currentApp = app;
  }

  searchContent(query: string): string[] {
    // 콘텐츠 검색 결과 시뮬레이션
    return [`${query} (4K)`, `${query} (HD)`, `${query} (예고편)`];
  }

  play(content: string): void {
    if (!this.currentApp) throw new Error("앱을 먼저 실행하세요");
    this.currentContent = content;
  }

  stop(): void {
    this.currentContent = "";
  }

  getStatus(): string {
    return `스트리밍: ${this.isOn ? "켜짐" : "꺼짐"}, 앱: ${this.currentApp}, 재생: ${this.currentContent || "없음"}`;
  }

  getIsOn(): boolean { return this.isOn; }
  getCurrentApp(): string { return this.currentApp; }
  getCurrentContent(): string { return this.currentContent; }
}

/** 스마트 조명 서브시스템: 조명 제어 */
export class SmartLights {
  private brightness: number = 100;
  private color: string = "흰색";
  private isOn: boolean = true;

  setBrightness(level: number): void {
    if (level < 0 || level > 100) throw new Error("밝기는 0~100이어야 합니다");
    this.brightness = level;
    this.isOn = level > 0;
  }

  setColor(color: string): void {
    this.color = color;
  }

  setScene(scene: "영화" | "독서" | "파티" | "수면"): void {
    // 장면에 맞는 조명 설정
    const scenes = {
      "영화": { brightness: 10, color: "주황" },
      "독서": { brightness: 80, color: "흰색" },
      "파티": { brightness: 60, color: "보라" },
      "수면": { brightness: 0, color: "흰색" },
    };
    const setting = scenes[scene];
    this.brightness = setting.brightness;
    this.color = setting.color;
    this.isOn = this.brightness > 0;
  }

  turnOff(): void {
    this.brightness = 0;
    this.isOn = false;
  }

  turnOn(): void {
    this.brightness = 100;
    this.isOn = true;
  }

  getStatus(): string {
    return `조명: ${this.isOn ? "켜짐" : "꺼짐"}, 밝기: ${this.brightness}%, 색상: ${this.color}`;
  }

  getBrightness(): number { return this.brightness; }
  getColor(): string { return this.color; }
  getIsOn(): boolean { return this.isOn; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facade: 복잡한 서브시스템을 단순한 인터페이스로 묶는다.
// 클라이언트는 이 클래스만 알면 된다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HomeTheaterFacade: 홈시어터 퍼사드
 *
 * 퍼사드의 역할:
 * 1. 서브시스템 초기화 순서를 알고 있다.
 * 2. 서브시스템 간의 의존성을 관리한다.
 * 3. 클라이언트에게 단순한 메서드만 노출한다.
 *
 * 중요: 퍼사드는 서브시스템을 숨기지 않는다.
 * 고급 사용자는 여전히 서브시스템에 직접 접근할 수 있다.
 */
export class HomeTheaterFacade {
  // 모든 서브시스템을 보유한다.
  private tv: TV;
  private amplifier: Amplifier;
  private streamingBox: StreamingBox;
  private lights: SmartLights;

  constructor(
    tv: TV,
    amplifier: Amplifier,
    streamingBox: StreamingBox,
    lights: SmartLights,
  ) {
    this.tv = tv;
    this.amplifier = amplifier;
    this.streamingBox = streamingBox;
    this.lights = lights;
  }

  /**
   * 영화 보기: 복잡한 여러 단계를 하나의 메서드로 통합
   *
   * 클라이언트가 알아야 할 순서:
   * 1. 조명 영화 모드로 변경
   * 2. TV 켜기 → 시네마 모드 → HDMI 입력
   * 3. 앰프 켜기 → 볼륨 → 서라운드 모드
   * 4. 스트리밍 박스 켜기 → 앱 실행 → 콘텐츠 재생
   *
   * 퍼사드 없이는 클라이언트가 이 모든 순서를 직접 처리해야 한다.
   */
  watchMovie(movieTitle: string, streamingApp: string = "Netflix"): void {
    // 1단계: 조명을 영화 감상에 맞게 설정
    this.lights.setScene("영화");

    // 2단계: TV 설정 (순서 중요: 켜기 → 모드 설정 → 입력 설정)
    this.tv.turnOn();
    this.tv.enableCinemaMode();
    this.tv.setInput("HDMI1");

    // 3단계: 앰프 설정 (TV 입력 설정 후 오디오 활성화)
    this.amplifier.turnOn();
    this.amplifier.setSurroundMode("돌비 애트모스");
    this.amplifier.setVolume(40);

    // 4단계: 스트리밍 박스로 콘텐츠 재생
    this.streamingBox.turnOn();
    this.streamingBox.launchApp(streamingApp);
    this.streamingBox.play(movieTitle);
  }

  /**
   * 영화 종료: 모든 기기를 안전하게 끈다
   * 역순으로 종료하는 것이 중요하다 (오디오 → 비디오 → 조명 순서)
   */
  endMovie(): void {
    this.streamingBox.stop();
    this.streamingBox.turnOff();
    this.amplifier.turnOff();
    this.tv.turnOff();
    this.lights.turnOn();  // 조명은 다시 켠다
    this.lights.setBrightness(80);
  }

  /**
   * 음악 감상 모드
   */
  listenToMusic(playlist: string): void {
    this.lights.setScene("파티");
    this.amplifier.turnOn();
    this.amplifier.setSurroundMode("스테레오");
    this.amplifier.setVolume(60);
    this.streamingBox.turnOn();
    this.streamingBox.launchApp("Spotify");
    this.streamingBox.play(playlist);
    // TV는 켜지 않아도 된다
  }

  /**
   * 전체 시스템 종료
   */
  shutdownAll(): void {
    this.streamingBox.turnOff();
    this.amplifier.turnOff();
    this.tv.turnOff();
    this.lights.turnOff();
  }

  /**
   * 전체 시스템 상태 조회
   * 디버깅이나 모니터링에 유용하다
   */
  getSystemStatus(): string {
    return [
      "=== 홈시어터 시스템 상태 ===",
      this.tv.getStatus(),
      this.amplifier.getStatus(),
      this.streamingBox.getStatus(),
      this.lights.getStatus(),
    ].join("\n");
  }

  // ── 서브시스템 직접 접근 허용 (고급 사용자를 위해) ──────────────────────
  // 퍼사드는 서브시스템을 완전히 숨기지 않는다.
  // 필요한 경우 고급 설정을 위해 직접 접근할 수 있다.
  getTV(): TV { return this.tv; }
  getAmplifier(): Amplifier { return this.amplifier; }
  getStreamingBox(): StreamingBox { return this.streamingBox; }
  getLights(): SmartLights { return this.lights; }
}
