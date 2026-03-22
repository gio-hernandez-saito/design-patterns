import { describe, it, expect, beforeEach } from "vitest";
import {
  TV,
  Amplifier,
  StreamingBox,
  SmartLights,
  HomeTheaterFacade,
} from "./facade.js";

// =============================================================================
// 퍼사드 패턴 테스트
// 핵심 검증 사항:
// 1. 퍼사드를 통해 복잡한 서브시스템을 단순하게 제어할 수 있는지
// 2. 퍼사드 메서드가 서브시스템들을 올바른 순서로 제어하는지
// 3. 서브시스템에 직접 접근도 가능한지
// =============================================================================

describe("서브시스템: TV", () => {
  let tv: TV;

  beforeEach(() => {
    tv = new TV();
  });

  it("켜고 끌 수 있다", () => {
    expect(tv.getIsOn()).toBe(false);
    tv.turnOn();
    expect(tv.getIsOn()).toBe(true);
    tv.turnOff();
    expect(tv.getIsOn()).toBe(false);
  });

  it("켜진 상태에서 입력을 변경할 수 있다", () => {
    tv.turnOn();
    tv.setInput("HDMI2");
    expect(tv.getCurrentInput()).toBe("HDMI2");
  });

  it("꺼진 상태에서 입력 변경 시 오류가 발생한다", () => {
    expect(() => tv.setInput("HDMI2")).toThrow("TV가 꺼져 있습니다");
  });

  it("밝기 범위를 벗어나면 오류가 발생한다", () => {
    expect(() => tv.setBrightness(101)).toThrow();
    expect(() => tv.setBrightness(-1)).toThrow();
  });

  it("시네마 모드를 활성화하면 밝기가 60으로 설정된다", () => {
    tv.turnOn();
    tv.enableCinemaMode();
    expect(tv.getBrightness()).toBe(60);
  });
});

describe("서브시스템: Amplifier", () => {
  let amp: Amplifier;

  beforeEach(() => {
    amp = new Amplifier();
  });

  it("켜진 상태에서 볼륨을 설정할 수 있다", () => {
    amp.turnOn();
    amp.setVolume(50);
    expect(amp.getVolume()).toBe(50);
  });

  it("꺼진 상태에서 볼륨 설정 시 오류가 발생한다", () => {
    expect(() => amp.setVolume(50)).toThrow("앰프가 꺼져 있습니다");
  });

  it("서라운드 모드를 변경할 수 있다", () => {
    amp.turnOn();
    amp.setSurroundMode("돌비 애트모스");
    expect(amp.getSurroundMode()).toBe("돌비 애트모스");
  });
});

describe("서브시스템: StreamingBox", () => {
  let box: StreamingBox;

  beforeEach(() => {
    box = new StreamingBox();
  });

  it("앱을 실행하고 콘텐츠를 재생할 수 있다", () => {
    box.turnOn();
    box.launchApp("Netflix");
    box.play("인터스텔라");

    expect(box.getCurrentApp()).toBe("Netflix");
    expect(box.getCurrentContent()).toBe("인터스텔라");
  });

  it("앱 없이 재생하면 오류가 발생한다", () => {
    box.turnOn();
    expect(() => box.play("영화")).toThrow("앱을 먼저 실행하세요");
  });

  it("종료하면 현재 콘텐츠가 초기화된다", () => {
    box.turnOn();
    box.launchApp("Netflix");
    box.play("영화");
    box.turnOff();

    expect(box.getCurrentContent()).toBe("");
  });
});

describe("서브시스템: SmartLights", () => {
  let lights: SmartLights;

  beforeEach(() => {
    lights = new SmartLights();
  });

  it("영화 모드로 설정하면 밝기가 낮아진다", () => {
    lights.setScene("영화");
    expect(lights.getBrightness()).toBe(10);
    expect(lights.getColor()).toBe("주황");
  });

  it("독서 모드로 설정하면 밝기가 높아진다", () => {
    lights.setScene("독서");
    expect(lights.getBrightness()).toBe(80);
  });

  it("수면 모드에서는 꺼진다", () => {
    lights.setScene("수면");
    expect(lights.getBrightness()).toBe(0);
    expect(lights.getIsOn()).toBe(false);
  });
});

describe("Facade: HomeTheaterFacade (핵심 테스트)", () => {
  let tv: TV;
  let amplifier: Amplifier;
  let streamingBox: StreamingBox;
  let lights: SmartLights;
  let facade: HomeTheaterFacade;

  beforeEach(() => {
    tv = new TV();
    amplifier = new Amplifier();
    streamingBox = new StreamingBox();
    lights = new SmartLights();
    facade = new HomeTheaterFacade(tv, amplifier, streamingBox, lights);
  });

  describe("watchMovie(): 영화 감상 모드", () => {
    it("watchMovie() 한 번으로 모든 장치가 올바르게 설정된다", () => {
      facade.watchMovie("인터스텔라");

      // 모든 서브시스템이 올바른 상태여야 한다
      expect(tv.getIsOn()).toBe(true);
      expect(amplifier.getIsOn()).toBe(true);
      expect(streamingBox.getIsOn()).toBe(true);
      expect(streamingBox.getCurrentContent()).toBe("인터스텔라");
    });

    it("영화 감상 모드에서 조명이 어두워진다", () => {
      facade.watchMovie("어벤져스");

      // 영화 모드 조명: 밝기 10, 주황색
      expect(lights.getBrightness()).toBe(10);
      expect(lights.getColor()).toBe("주황");
    });

    it("TV가 시네마 모드로 설정된다", () => {
      facade.watchMovie("어벤져스");

      // 시네마 모드: 밝기 60
      expect(tv.getBrightness()).toBe(60);
    });

    it("앰프가 돌비 애트모스 모드로 설정된다", () => {
      facade.watchMovie("어벤져스");

      expect(amplifier.getSurroundMode()).toBe("돌비 애트모스");
      expect(amplifier.getVolume()).toBe(40);
    });

    it("기본 스트리밍 앱은 Netflix이다", () => {
      facade.watchMovie("영화");

      expect(streamingBox.getCurrentApp()).toBe("Netflix");
    });

    it("다른 스트리밍 앱을 지정할 수 있다", () => {
      facade.watchMovie("왕좌의 게임", "Disney+");

      expect(streamingBox.getCurrentApp()).toBe("Disney+");
    });
  });

  describe("endMovie(): 영화 종료", () => {
    it("endMovie() 호출 시 모든 장치가 꺼진다 (조명 제외)", () => {
      facade.watchMovie("영화");
      facade.endMovie();

      expect(tv.getIsOn()).toBe(false);
      expect(amplifier.getIsOn()).toBe(false);
      expect(streamingBox.getIsOn()).toBe(false);
    });

    it("영화 종료 후 조명이 다시 켜진다", () => {
      facade.watchMovie("영화");
      facade.endMovie();

      // 영화 종료 후 조명은 켜져야 한다
      expect(lights.getIsOn()).toBe(true);
      expect(lights.getBrightness()).toBe(80);
    });
  });

  describe("listenToMusic(): 음악 감상 모드", () => {
    it("음악 감상 모드에서 TV는 켜지지 않는다", () => {
      facade.listenToMusic("재즈 플레이리스트");

      expect(tv.getIsOn()).toBe(false);  // TV는 불필요
      expect(amplifier.getIsOn()).toBe(true);
      expect(streamingBox.getIsOn()).toBe(true);
    });

    it("음악 감상 모드에서는 스테레오 모드를 사용한다", () => {
      facade.listenToMusic("팝 차트");

      expect(amplifier.getSurroundMode()).toBe("스테레오");
    });

    it("Spotify에서 지정한 플레이리스트를 재생한다", () => {
      facade.listenToMusic("K-Pop 플레이리스트");

      expect(streamingBox.getCurrentApp()).toBe("Spotify");
      expect(streamingBox.getCurrentContent()).toBe("K-Pop 플레이리스트");
    });
  });

  describe("shutdownAll(): 전체 종료", () => {
    it("모든 장치가 꺼진다", () => {
      facade.watchMovie("영화");
      facade.shutdownAll();

      expect(tv.getIsOn()).toBe(false);
      expect(amplifier.getIsOn()).toBe(false);
      expect(streamingBox.getIsOn()).toBe(false);
      expect(lights.getIsOn()).toBe(false);
    });
  });

  describe("getSystemStatus(): 시스템 상태 조회", () => {
    it("모든 서브시스템의 상태를 포함한 문자열을 반환한다", () => {
      const status = facade.getSystemStatus();

      expect(status).toContain("TV:");
      expect(status).toContain("앰프:");
      expect(status).toContain("스트리밍:");
      expect(status).toContain("조명:");
    });
  });

  describe("서브시스템 직접 접근 (고급 사용자)", () => {
    it("퍼사드를 통해 서브시스템에 직접 접근할 수 있다", () => {
      // 퍼사드는 서브시스템을 완전히 숨기지 않는다
      facade.watchMovie("영화");

      // 고급 설정: TV 밝기를 추가로 조정
      facade.getTV().setBrightness(50);
      expect(tv.getBrightness()).toBe(50);

      // 고급 설정: 볼륨을 더 높이기
      facade.getAmplifier().setVolume(60);
      expect(amplifier.getVolume()).toBe(60);
    });
  });
});
