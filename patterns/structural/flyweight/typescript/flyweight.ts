// =============================================================================
// 플라이웨이트 패턴 (Flyweight Pattern)
// =============================================================================
// 목적: 많은 수의 유사한 객체를 효율적으로 지원하기 위해 공유를 활용한다.
//       메모리 사용량을 획기적으로 줄인다.
//
// 핵심 개념:
//   - Intrinsic state (내재 상태): 공유 가능한 상태. 객체 내부에 저장된다.
//     예: 파티클의 텍스처, 색상, 크기 (같은 종류의 파티클은 동일)
//   - Extrinsic state (외재 상태): 공유 불가능한 상태. 외부에서 전달된다.
//     예: 파티클의 현재 위치, 속도 (각 파티클마다 다름)
//
// 역할 매핑:
//   ParticleType (Flyweight)        → 공유되는 내재 상태를 보유하는 플라이웨이트
//   ParticleFactory (FlyweightFactory) → 플라이웨이트 객체를 생성하고 캐싱한다
//   Particle                        → 외재 상태(위치, 속도)를 보유하는 컨텍스트
//   ParticleSystem                  → 클라이언트, 파티클을 생성하고 관리한다
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Flyweight: 공유되는 내재 상태 (Intrinsic State)
// 수천 개의 파티클이 있어도 같은 종류면 이 객체를 공유한다.
// 불변(immutable)이어야 공유가 안전하다.
// ─────────────────────────────────────────────────────────────────────────────

/** 2D 위치 */
export interface Vector2D {
  x: number;
  y: number;
}

/** 색상 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;  // 투명도 (0~1)
}

/**
 * Flyweight: 파티클 타입
 * 내재 상태만 보유한다. 수천 개의 파티클이 이 객체를 공유한다.
 *
 * 왜 불변이어야 하는가?
 * - 여러 파티클이 공유하므로, 한 파티클이 수정하면 모두에게 영향을 준다.
 * - readonly로 선언하여 실수로 수정하는 것을 방지한다.
 */
export class ParticleType {
  // 내재 상태: 모든 같은 종류의 파티클이 공유하는 값
  readonly name: string;         // 파티클 종류 이름
  readonly texture: string;      // 텍스처 파일 경로 (용량이 큰 데이터)
  readonly color: Readonly<Color>; // 기본 색상
  readonly size: number;         // 파티클 크기
  readonly weight: number;       // 물리 연산용 무게

  constructor(
    name: string,
    texture: string,
    color: Color,
    size: number,
    weight: number,
  ) {
    this.name = name;
    this.texture = texture;
    this.color = Object.freeze({ ...color });  // 색상도 불변으로 만든다
    this.size = size;
    this.weight = weight;
  }

  /**
   * 파티클 렌더링: 공유된 텍스처와 외재 상태(위치)를 조합하여 그린다.
   * 실제 게임에서는 GPU에 그리기 명령을 보내는 부분이다.
   */
  render(position: Vector2D, velocity: Vector2D, opacity: number): string {
    // 외재 상태는 파라미터로 받는다. 내재 상태는 this를 사용한다.
    return `[${this.name}] 텍스처: ${this.texture}, 위치: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}), 속도: (${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)}), 투명도: ${opacity.toFixed(2)}`;
  }

  /** 플라이웨이트 객체의 메모리 크기 시뮬레이션 (바이트) */
  getMemorySize(): number {
    // 텍스처 데이터가 대부분의 메모리를 차지한다고 가정
    return this.texture.length * 2 + 100;  // 단순화된 계산
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FlyweightFactory: 플라이웨이트 객체 생성 및 캐싱
// 동일한 내재 상태를 가진 객체는 새로 만들지 않고 기존 것을 반환한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FlyweightFactory: 파티클 타입 팩토리
 *
 * 핵심 동작:
 * - "폭발" 파티클을 1000개 만들어도 ParticleType 객체는 1개만 존재한다.
 * - 나머지 999개는 같은 ParticleType을 참조(공유)한다.
 */
export class ParticleFactory {
  // 캐시: 이미 만들어진 플라이웨이트 객체를 보관한다.
  // 키: 파티클 종류 이름, 값: ParticleType 객체
  private cache: Map<string, ParticleType> = new Map();

  /**
   * 파티클 타입을 반환한다.
   * 이미 만들어진 것이 있으면 재사용하고, 없으면 새로 만든다.
   *
   * 왜 이렇게 하는가?
   * - 같은 종류의 파티클을 수천 번 만들어도 ParticleType 생성은 1번만 한다.
   * - 텍스처 같은 무거운 데이터가 메모리에 딱 한 번만 올라간다.
   */
  getParticleType(
    name: string,
    texture: string,
    color: Color,
    size: number,
    weight: number,
  ): ParticleType {
    // 이미 캐시에 있으면 재사용한다.
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    // 없으면 새로 만들고 캐시에 저장한다.
    const particleType = new ParticleType(name, texture, color, size, weight);
    this.cache.set(name, particleType);
    return particleType;
  }

  /** 현재 캐시된 파티클 타입 수 */
  getCachedCount(): number {
    return this.cache.size;
  }

  /** 캐시된 타입 목록 */
  getCachedTypes(): string[] {
    return Array.from(this.cache.keys());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context: 외재 상태를 보유하는 개별 파티클
// 각 파티클은 자신만의 위치와 속도를 가지지만, 텍스처 등은 공유한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 개별 파티클: 외재 상태(위치, 속도, 투명도)를 보유
 *
 * 메모리 비교:
 * - 플라이웨이트 없이: 파티클 1000개 × (텍스처 1MB + 위치/속도 24B) = ~1000MB
 * - 플라이웨이트 있이: 텍스처 1MB + 파티클 1000개 × 24B = ~1MB + 24KB ≈ 1MB
 */
export class Particle {
  // 외재 상태: 각 파티클마다 다른 값
  position: Vector2D;
  velocity: Vector2D;
  opacity: number;

  // 공유되는 플라이웨이트 참조 (내재 상태는 여기서 접근)
  // 이 참조 자체는 몇 바이트에 불과하다.
  private particleType: ParticleType;

  constructor(
    particleType: ParticleType,
    position: Vector2D,
    velocity: Vector2D,
    opacity: number = 1,
  ) {
    this.particleType = particleType;
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.opacity = opacity;
  }

  /** 물리 업데이트: 위치와 투명도를 갱신한다 */
  update(deltaTime: number): void {
    // 위치 = 이전 위치 + 속도 × 시간
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // 중력 적용 (파티클 무게를 공유 데이터에서 가져온다)
    this.velocity.y += 9.8 * this.particleType.weight * deltaTime;

    // 시간이 지날수록 투명해진다
    this.opacity = Math.max(0, this.opacity - 0.01 * deltaTime);
  }

  /** 렌더링: 공유 타입에게 그리기를 위임하고 외재 상태를 전달 */
  render(): string {
    return this.particleType.render(this.position, this.velocity, this.opacity);
  }

  /** 파티클이 보이는지 여부 */
  isAlive(): boolean {
    return this.opacity > 0;
  }

  getTypeName(): string {
    return this.particleType.name;
  }

  getParticleType(): ParticleType {
    return this.particleType;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client: 파티클 시스템 (플라이웨이트 패턴을 사용하는 클라이언트)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ParticleSystem: 게임의 파티클 시스템
 * FlyweightFactory를 통해 파티클 타입을 관리하고 개별 파티클을 생성한다.
 */
export class ParticleSystem {
  private factory: ParticleFactory;
  private particles: Particle[] = [];

  constructor() {
    this.factory = new ParticleFactory();
  }

  /**
   * 폭발 효과 생성: 같은 텍스처를 공유하는 수십 개의 파티클을 생성
   */
  createExplosion(center: Vector2D, count: number): void {
    // 폭발 타입은 한 번만 만들어진다 (캐싱됨)
    const explosionType = this.factory.getParticleType(
      "폭발",
      "textures/explosion.png",
      { r: 255, g: 100, b: 0, a: 1 },
      32,
      0.1,
    );

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 50 + Math.random() * 100;
      const particle = new Particle(
        explosionType,
        { ...center },
        { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        1,
      );
      this.particles.push(particle);
    }
  }

  /**
   * 눈 효과 생성: 화면 위에서 내려오는 눈송이 파티클
   */
  createSnow(count: number, screenWidth: number): void {
    const snowType = this.factory.getParticleType(
      "눈송이",
      "textures/snowflake.png",
      { r: 220, g: 240, b: 255, a: 0.9 },
      8,
      0.01,
    );

    for (let i = 0; i < count; i++) {
      const particle = new Particle(
        snowType,
        { x: Math.random() * screenWidth, y: -10 },
        { x: (Math.random() - 0.5) * 20, y: 30 + Math.random() * 20 },
        0.8 + Math.random() * 0.2,
      );
      this.particles.push(particle);
    }
  }

  /** 전체 파티클 업데이트 */
  update(deltaTime: number): void {
    // 죽은 파티클 제거
    this.particles = this.particles.filter(p => p.isAlive());
    // 살아있는 파티클 업데이트
    for (const particle of this.particles) {
      particle.update(deltaTime);
    }
  }

  /** 메모리 절약 통계 */
  getMemoryStats(): {
    particleCount: number;
    uniqueTypeCount: number;
    estimatedSavedMemory: string;
  } {
    const particleCount = this.particles.length;
    const uniqueTypeCount = this.factory.getCachedCount();

    // 절약된 메모리 추정 (텍스처가 파티클마다 중복 저장되지 않으므로)
    const avgTextureSize = 512 * 1024;  // 텍스처 평균 512KB
    const savedBytes = particleCount * avgTextureSize - uniqueTypeCount * avgTextureSize;
    const savedMB = Math.max(0, savedBytes / (1024 * 1024));

    return {
      particleCount,
      uniqueTypeCount,
      estimatedSavedMemory: `${savedMB.toFixed(1)}MB`,
    };
  }

  getParticles(): Particle[] { return this.particles; }
  getFactory(): ParticleFactory { return this.factory; }
}
