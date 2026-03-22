import { describe, it, expect, beforeEach } from "vitest";
import {
  ParticleType,
  ParticleFactory,
  Particle,
  ParticleSystem,
  type Vector2D,
  type Color,
} from "./flyweight.js";

// =============================================================================
// 플라이웨이트 패턴 테스트
// 핵심 검증 사항:
// 1. 동일한 intrinsic state를 가진 객체는 공유(재사용)되는지
// 2. extrinsic state(위치, 속도)는 각 파티클마다 독립적인지
// 3. 캐시가 올바르게 동작하는지
// 4. 메모리 절약 효과가 발생하는지
// =============================================================================

describe("Flyweight: ParticleType (공유 객체)", () => {
  it("ParticleType은 내재 상태를 보유한다", () => {
    const particleType = new ParticleType(
      "불꽃",
      "textures/fire.png",
      { r: 255, g: 100, b: 0, a: 1 },
      16,
      0.05,
    );

    expect(particleType.name).toBe("불꽃");
    expect(particleType.texture).toBe("textures/fire.png");
    expect(particleType.size).toBe(16);
    expect(particleType.weight).toBe(0.05);
  });

  it("color는 불변(frozen)으로 보호된다", () => {
    const particleType = new ParticleType(
      "불꽃",
      "textures/fire.png",
      { r: 255, g: 100, b: 0, a: 1 },
      16,
      0.05,
    );

    // frozen된 객체는 수정을 시도해도 변경되지 않는다 (strict mode에서는 오류)
    expect(Object.isFrozen(particleType.color)).toBe(true);
  });

  it("render()는 외재 상태(위치, 속도)를 파라미터로 받아 처리한다", () => {
    const particleType = new ParticleType(
      "폭발",
      "textures/explosion.png",
      { r: 255, g: 200, b: 0, a: 1 },
      32,
      0.1,
    );

    const position: Vector2D = { x: 100, y: 200 };
    const velocity: Vector2D = { x: 10, y: -5 };

    const result = particleType.render(position, velocity, 0.8);

    // 렌더링 결과에 외재 상태 값들이 포함된다
    expect(result).toContain("폭발");
    expect(result).toContain("100.0");
    expect(result).toContain("200.0");
  });
});

describe("FlyweightFactory: ParticleFactory (캐싱 및 공유)", () => {
  let factory: ParticleFactory;

  beforeEach(() => {
    factory = new ParticleFactory();
  });

  it("처음 요청하면 새 ParticleType을 생성한다", () => {
    factory.getParticleType("눈", "textures/snow.png", { r: 255, g: 255, b: 255, a: 0.9 }, 8, 0.01);

    expect(factory.getCachedCount()).toBe(1);
  });

  it("동일한 이름으로 두 번 요청하면 같은 객체를 반환한다 (공유)", () => {
    const color: Color = { r: 255, g: 100, b: 0, a: 1 };

    const type1 = factory.getParticleType("불꽃", "textures/fire.png", color, 16, 0.05);
    const type2 = factory.getParticleType("불꽃", "textures/fire.png", color, 16, 0.05);

    // 핵심: 같은 객체 참조여야 한다 (복사본이 아닌 공유)
    expect(type1).toBe(type2);
    // 캐시에는 1개만 존재한다
    expect(factory.getCachedCount()).toBe(1);
  });

  it("다른 이름으로 요청하면 다른 객체가 생성된다", () => {
    const color: Color = { r: 255, g: 255, b: 255, a: 1 };

    const fireType = factory.getParticleType("불꽃", "textures/fire.png", color, 16, 0.05);
    const snowType = factory.getParticleType("눈꽃", "textures/snow.png", color, 8, 0.01);

    expect(fireType).not.toBe(snowType);
    expect(factory.getCachedCount()).toBe(2);
  });

  it("1000번 요청해도 캐시된 타입은 1개다 (메모리 절약의 핵심)", () => {
    const color: Color = { r: 255, g: 0, b: 0, a: 1 };

    // 같은 타입의 파티클을 1000번 요청한다
    for (let i = 0; i < 1000; i++) {
      factory.getParticleType("불꽃", "textures/fire.png", color, 16, 0.05);
    }

    // 실제 ParticleType 객체는 1개만 존재한다
    expect(factory.getCachedCount()).toBe(1);
  });

  it("캐시된 타입 목록을 조회할 수 있다", () => {
    const color: Color = { r: 0, g: 0, b: 0, a: 1 };
    factory.getParticleType("폭발", "textures/explosion.png", color, 32, 0.1);
    factory.getParticleType("연기", "textures/smoke.png", color, 24, 0.02);

    const types = factory.getCachedTypes();
    expect(types).toContain("폭발");
    expect(types).toContain("연기");
    expect(types).toHaveLength(2);
  });
});

describe("Context: Particle (외재 상태 보유)", () => {
  let factory: ParticleFactory;
  let particleType: ParticleType;

  beforeEach(() => {
    factory = new ParticleFactory();
    particleType = factory.getParticleType(
      "불꽃",
      "textures/fire.png",
      { r: 255, g: 100, b: 0, a: 1 },
      16,
      0.05,
    );
  });

  it("각 파티클은 독립적인 위치와 속도를 가진다", () => {
    // 같은 ParticleType을 공유하지만 위치는 각각 다르다
    const particle1 = new Particle(
      particleType,
      { x: 0, y: 0 },
      { x: 10, y: -20 },
    );
    const particle2 = new Particle(
      particleType,
      { x: 100, y: 200 },
      { x: -5, y: 15 },
    );

    // 위치가 다르다
    expect(particle1.position).not.toEqual(particle2.position);
    // 속도가 다르다
    expect(particle1.velocity).not.toEqual(particle2.velocity);
    // 타입은 공유한다
    expect(particle1.getParticleType()).toBe(particle2.getParticleType());
  });

  it("한 파티클의 위치 변경이 다른 파티클에 영향을 주지 않는다", () => {
    const particle1 = new Particle(particleType, { x: 0, y: 0 }, { x: 1, y: 0 });
    const particle2 = new Particle(particleType, { x: 0, y: 0 }, { x: 1, y: 0 });

    particle1.position.x = 999;

    // particle2의 위치는 변경되지 않아야 한다
    expect(particle2.position.x).toBe(0);
  });

  it("update()로 위치가 갱신된다", () => {
    const particle = new Particle(
      particleType,
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      1,
    );

    const initialX = particle.position.x;
    particle.update(1);  // 1초 경과

    // x 위치가 속도만큼 이동했다
    expect(particle.position.x).toBeGreaterThan(initialX);
    // 중력으로 y 속도가 증가했다
    expect(particle.velocity.y).toBeGreaterThan(0);
  });

  it("시간이 지나면 투명도가 감소하여 죽는다", () => {
    const particle = new Particle(particleType, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.1);

    // 아직 살아있다
    expect(particle.isAlive()).toBe(true);

    // 100번 업데이트 후 투명도가 0이 된다
    for (let i = 0; i < 200; i++) {
      particle.update(1);
    }

    expect(particle.isAlive()).toBe(false);
  });

  it("render()가 ParticleType에 위임하여 결과를 반환한다", () => {
    const particle = new Particle(
      particleType,
      { x: 50, y: 100 },
      { x: 5, y: -10 },
      0.9,
    );

    const result = particle.render();

    expect(result).toContain("불꽃");
    expect(result).toContain("50.0");
    expect(result).toContain("100.0");
  });
});

describe("ParticleSystem: 통합 테스트 (메모리 절약 검증)", () => {
  let system: ParticleSystem;

  beforeEach(() => {
    system = new ParticleSystem();
  });

  it("폭발 효과 생성 시 지정한 수만큼 파티클이 생성된다", () => {
    system.createExplosion({ x: 400, y: 300 }, 50);

    expect(system.getParticles()).toHaveLength(50);
  });

  it("눈 효과 생성 시 지정한 수만큼 파티클이 생성된다", () => {
    system.createSnow(100, 800);

    expect(system.getParticles()).toHaveLength(100);
  });

  it("폭발 파티클 100개가 ParticleType 1개를 공유한다 (핵심 검증)", () => {
    system.createExplosion({ x: 200, y: 200 }, 100);

    const factory = system.getFactory();
    // 100개의 파티클이 있지만 "폭발" 타입은 1개만 존재한다
    expect(factory.getCachedCount()).toBe(1);
    expect(factory.getCachedTypes()).toContain("폭발");
  });

  it("다른 종류의 이펙트를 추가해도 타입 수는 종류 수만큼만 늘어난다", () => {
    system.createExplosion({ x: 0, y: 0 }, 500);   // 폭발 500개
    system.createSnow(1000, 800);                    // 눈 1000개

    const factory = system.getFactory();
    // 파티클은 총 1500개지만 타입은 2개
    expect(system.getParticles()).toHaveLength(1500);
    expect(factory.getCachedCount()).toBe(2);
  });

  it("update() 호출로 파티클이 이동한다", () => {
    system.createExplosion({ x: 200, y: 200 }, 10);
    const initialPositions = system.getParticles().map(p => ({ ...p.position }));

    system.update(0.1);

    const afterPositions = system.getParticles().map(p => ({ ...p.position }));
    // 적어도 일부 파티클의 위치가 변경된다
    const changed = afterPositions.some((pos, i) =>
      pos.x !== initialPositions[i].x || pos.y !== initialPositions[i].y
    );
    expect(changed).toBe(true);
  });

  it("getMemoryStats()가 절약된 메모리 정보를 반환한다", () => {
    system.createExplosion({ x: 0, y: 0 }, 200);
    system.createSnow(300, 800);

    const stats = system.getMemoryStats();

    expect(stats.particleCount).toBe(500);
    expect(stats.uniqueTypeCount).toBe(2);
    expect(stats.estimatedSavedMemory).toMatch(/\d+\.\d+MB/);
  });
});
