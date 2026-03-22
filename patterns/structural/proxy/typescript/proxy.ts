// =============================================================================
// 프록시 패턴 (Proxy Pattern)
// =============================================================================
// 목적: 다른 객체에 대한 접근을 제어하는 대리자를 제공한다.
//       원본 객체 대신 프록시가 요청을 받아 처리하거나 원본에 전달한다.
//
// 프록시의 종류:
//   1. 가상 프록시 (Virtual Proxy): 실제 객체 생성을 지연(lazy loading)한다.
//   2. 캐싱 프록시 (Caching Proxy): 결과를 캐시하여 중복 연산을 방지한다.
//   3. 보호 프록시 (Protection Proxy): 접근 권한을 제어한다.
//   4. 원격 프록시 (Remote Proxy): 원격 객체에 대한 로컬 대리자.
//
// 역할 매핑:
//   ImageLoader (Subject)     → 클라이언트가 사용하는 공통 인터페이스
//   RealImage (RealSubject)   → 실제 이미지 로딩 및 렌더링 로직
//   LazyImageProxy (Proxy 1)  → 가상 프록시: RealImage를 실제로 필요할 때까지 생성 안 함
//   CachingImageProxy (Proxy 2) → 캐싱 프록시: 한 번 로드한 이미지를 재사용
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Subject: 공통 인터페이스
// RealSubject와 Proxy 모두 이 인터페이스를 구현한다.
// 클라이언트는 이 인터페이스에만 의존하므로 실제 객체인지 프록시인지 구별하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

/** 이미지 메타데이터 */
export interface ImageInfo {
  url: string;
  width: number;
  height: number;
  fileSize: number;  // 바이트
  format: string;
}

/** 렌더링 결과 */
export interface RenderResult {
  imageUrl: string;
  renderedAt: Date;
  loadTime: number;  // 밀리초
}

/**
 * Subject 인터페이스: 이미지 로더의 공통 인터페이스
 * RealImage와 모든 프록시가 구현한다.
 */
export interface ImageLoader {
  /** 이미지 렌더링 (필요시 로드 포함) */
  render(): RenderResult;
  /** 이미지 정보 반환 */
  getInfo(): ImageInfo;
  /** 이미지가 메모리에 로드되어 있는지 여부 */
  isLoaded(): boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// RealSubject: 실제 이미지 로더
// 무거운 작업을 수행한다. 생성 자체가 비용이 크다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RealSubject: 실제 이미지 로더
 * 생성 시 네트워크에서 이미지를 다운로드하므로 비용이 크다.
 * 프록시 패턴을 쓰지 않으면 화면에 보이지도 않는 이미지도 미리 다 로드한다.
 */
export class RealImage implements ImageLoader {
  private info: ImageInfo;
  private loaded: boolean = false;
  private loadedAt: Date | null = null;

  constructor(url: string) {
    // 이미지 기본 정보는 URL에서 파싱 (실제로는 서버에서 메타데이터를 가져온다)
    this.info = {
      url,
      width: 1920,
      height: 1080,
      fileSize: 2 * 1024 * 1024,  // 2MB 가정
      format: url.split(".").pop() ?? "jpg",
    };

    // 생성 시 즉시 로드한다 (이것이 비용의 원인)
    this.load();
  }

  /** 실제 이미지 로딩 (네트워크 I/O 시뮬레이션) */
  private load(): void {
    // 실제 구현에서는 fetch()나 fs.readFile() 등을 사용한다.
    // 여기서는 로딩 완료만 시뮬레이션한다.
    this.loaded = true;
    this.loadedAt = new Date();
  }

  render(): RenderResult {
    const start = Date.now();
    // 실제로는 Canvas나 GPU에 픽셀을 그리는 작업이 여기 있다.
    return {
      imageUrl: this.info.url,
      renderedAt: new Date(),
      loadTime: Date.now() - start,
    };
  }

  getInfo(): ImageInfo {
    return { ...this.info };
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getLoadedAt(): Date | null {
    return this.loadedAt;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy 1: 가상 프록시 (Virtual Proxy / Lazy Loading Proxy)
// 실제 이미지 로딩을 render()가 처음 호출될 때까지 미룬다.
// 무한 스크롤 갤러리에서 화면에 보이지 않는 이미지는 로드하지 않는 방식에 활용된다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LazyImageProxy: 가상 프록시 (지연 로딩)
 *
 * 시나리오: 갤러리에 1000개의 이미지가 있지만, 화면에는 10개만 보인다.
 * - 프록시 없이: 1000개 모두 즉시 로드 → 2GB 메모리, 느린 시작
 * - 프록시 있이: 보이는 10개만 로드 → 20MB 메모리, 빠른 시작
 */
export class LazyImageProxy implements ImageLoader {
  private url: string;
  // RealImage는 처음에 null이다. render()가 호출될 때 생성된다.
  private realImage: RealImage | null = null;
  private renderCount: number = 0;

  constructor(url: string) {
    // 핵심: 생성자에서 RealImage를 만들지 않는다.
    // URL만 저장해두고 실제 로딩은 나중으로 미룬다.
    this.url = url;
  }

  render(): RenderResult {
    this.renderCount++;

    // 처음 render()가 호출될 때만 RealImage를 생성한다.
    // 이후 호출은 이미 만들어진 RealImage를 사용한다.
    if (this.realImage === null) {
      // 지연 초기화 (Lazy Initialization): 필요한 순간에 생성
      this.realImage = new RealImage(this.url);
    }

    return this.realImage.render();
  }

  getInfo(): ImageInfo {
    // 정보 조회는 실제 로드 없이 기본 정보만 반환한다.
    // 실제 로드가 필요한 시점에만 RealImage를 생성한다.
    if (this.realImage !== null) {
      return this.realImage.getInfo();
    }

    // 아직 로드 안 됨: 기본 정보만 반환 (URL에서 유추)
    return {
      url: this.url,
      width: 0,
      height: 0,
      fileSize: 0,
      format: this.url.split(".").pop() ?? "unknown",
    };
  }

  isLoaded(): boolean {
    // RealImage가 아직 생성되지 않았으면 false
    return this.realImage !== null && this.realImage.isLoaded();
  }

  getRenderCount(): number {
    return this.renderCount;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy 2: 캐싱 프록시 (Caching Proxy)
// 한 번 렌더링한 결과를 캐시하여 동일한 요청에 빠르게 응답한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CachingImageProxy: 캐싱 프록시
 *
 * 시나리오: 같은 이미지가 여러 페이지에 반복 사용될 때
 * - 프록시 없이: 매번 렌더링 연산 수행
 * - 프록시 있이: 첫 렌더링만 수행, 이후는 캐시된 결과 반환
 */
export class CachingImageProxy implements ImageLoader {
  private realImage: RealImage;
  private cachedResult: RenderResult | null = null;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private cacheTtlMs: number;  // 캐시 유효 시간 (밀리초)

  constructor(url: string, cacheTtlMs: number = 60000) {
    // 캐싱 프록시는 생성 시 RealImage를 만든다 (가상 프록시와 다른 점)
    // 캐싱의 목적은 렌더링 연산 비용 절감이지, 로딩 지연이 아니다.
    this.realImage = new RealImage(url);
    this.cacheTtlMs = cacheTtlMs;
  }

  render(): RenderResult {
    // 캐시가 유효한지 확인한다.
    if (this.isCacheValid()) {
      this.cacheHits++;
      // 캐시 히트: 저장된 결과를 바로 반환
      return this.cachedResult!;
    }

    // 캐시 미스: 실제 렌더링을 수행하고 결과를 저장한다.
    this.cacheMisses++;
    this.cachedResult = this.realImage.render();
    return this.cachedResult;
  }

  getInfo(): ImageInfo {
    return this.realImage.getInfo();
  }

  isLoaded(): boolean {
    return this.realImage.isLoaded();
  }

  /** 캐시 강제 무효화 (이미지가 업데이트됐을 때 사용) */
  invalidateCache(): void {
    this.cachedResult = null;
  }

  /** 캐시 통계 반환 */
  getCacheStats(): { hits: number; misses: number; hitRate: string } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total === 0 ? "0%" : `${((this.cacheHits / total) * 100).toFixed(1)}%`;
    return { hits: this.cacheHits, misses: this.cacheMisses, hitRate };
  }

  /** 캐시가 현재 유효한지 확인 */
  private isCacheValid(): boolean {
    if (this.cachedResult === null) return false;
    const age = Date.now() - this.cachedResult.renderedAt.getTime();
    return age < this.cacheTtlMs;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy 3: 보호 프록시 (Protection Proxy)
// 접근 권한에 따라 요청을 허용하거나 거부한다.
// ─────────────────────────────────────────────────────────────────────────────

/** 사용자 권한 레벨 */
export type AccessLevel = "guest" | "user" | "admin";

/**
 * ProtectedImageProxy: 보호 프록시
 * 성인 콘텐츠나 프리미엄 콘텐츠 접근 제어에 활용된다.
 */
export class ProtectedImageProxy implements ImageLoader {
  private realImage: RealImage | null = null;
  private url: string;
  private requiredAccess: AccessLevel;
  private currentUserAccess: AccessLevel;

  constructor(url: string, requiredAccess: AccessLevel, userAccess: AccessLevel) {
    this.url = url;
    this.requiredAccess = requiredAccess;
    this.currentUserAccess = userAccess;
  }

  render(): RenderResult {
    // 접근 권한 확인: 권한이 없으면 실제 이미지를 로드하지도 않는다.
    if (!this.hasAccess()) {
      throw new Error(
        `접근 거부: '${this.requiredAccess}' 권한이 필요하지만 현재 '${this.currentUserAccess}' 권한입니다.`
      );
    }

    if (this.realImage === null) {
      this.realImage = new RealImage(this.url);
    }

    return this.realImage.render();
  }

  getInfo(): ImageInfo {
    // 정보는 권한 없이도 볼 수 있다. (썸네일이나 메타데이터 표시용)
    return {
      url: this.url,
      width: 0,
      height: 0,
      fileSize: 0,
      format: this.url.split(".").pop() ?? "unknown",
    };
  }

  isLoaded(): boolean {
    return this.realImage !== null && this.realImage.isLoaded();
  }

  /** 권한 레벨 비교 */
  private hasAccess(): boolean {
    const levels: Record<AccessLevel, number> = { guest: 0, user: 1, admin: 2 };
    return levels[this.currentUserAccess] >= levels[this.requiredAccess];
  }
}
