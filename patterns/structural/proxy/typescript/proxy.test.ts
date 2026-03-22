import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  RealImage,
  LazyImageProxy,
  CachingImageProxy,
  ProtectedImageProxy,
  type ImageLoader,
} from "./proxy.js";

// =============================================================================
// 프록시 패턴 테스트
// 핵심 검증 사항:
// 1. 가상 프록시: render() 전까지 RealImage를 생성하지 않는지 (지연 로딩)
// 2. 캐싱 프록시: 동일 요청은 캐시에서 반환되는지
// 3. 보호 프록시: 권한 없는 접근을 거부하는지
// 4. 모든 프록시가 ImageLoader 인터페이스를 구현하는지
// =============================================================================

describe("RealSubject: RealImage", () => {
  it("생성 시 즉시 로드된다", () => {
    const image = new RealImage("https://example.com/photo.jpg");

    expect(image.isLoaded()).toBe(true);
    expect(image.getLoadedAt()).toBeInstanceOf(Date);
  });

  it("render()가 RenderResult를 반환한다", () => {
    const image = new RealImage("https://example.com/photo.jpg");
    const result = image.render();

    expect(result.imageUrl).toBe("https://example.com/photo.jpg");
    expect(result.renderedAt).toBeInstanceOf(Date);
  });

  it("getInfo()가 이미지 정보를 반환한다", () => {
    const image = new RealImage("https://example.com/photo.png");
    const info = image.getInfo();

    expect(info.url).toBe("https://example.com/photo.png");
    expect(info.format).toBe("png");
  });
});

describe("Proxy 1: LazyImageProxy (가상 프록시 / 지연 로딩)", () => {
  it("생성 시 RealImage를 즉시 로드하지 않는다 (지연 로딩의 핵심)", () => {
    const proxy = new LazyImageProxy("https://example.com/heavy.jpg");

    // 생성 직후에는 로드되지 않았다
    expect(proxy.isLoaded()).toBe(false);
  });

  it("render() 호출 시에 비로소 이미지가 로드된다", () => {
    const proxy = new LazyImageProxy("https://example.com/photo.jpg");

    // 렌더링 전: 미로드
    expect(proxy.isLoaded()).toBe(false);

    // 렌더링
    proxy.render();

    // 렌더링 후: 로드됨
    expect(proxy.isLoaded()).toBe(true);
  });

  it("render()가 올바른 결과를 반환한다", () => {
    const proxy = new LazyImageProxy("https://example.com/photo.jpg");
    const result = proxy.render();

    expect(result.imageUrl).toBe("https://example.com/photo.jpg");
    expect(result.renderedAt).toBeInstanceOf(Date);
  });

  it("두 번째 render() 호출에서는 RealImage를 재생성하지 않는다", () => {
    const proxy = new LazyImageProxy("https://example.com/photo.jpg");

    proxy.render();  // 첫 번째: RealImage 생성
    proxy.render();  // 두 번째: 기존 RealImage 재사용

    expect(proxy.getRenderCount()).toBe(2);
    // 두 번 호출됐지만 여전히 로드 상태는 동일
    expect(proxy.isLoaded()).toBe(true);
  });

  it("로드 전 getInfo()는 URL만 포함한 기본 정보를 반환한다", () => {
    const proxy = new LazyImageProxy("https://example.com/image.png");
    const info = proxy.getInfo();

    expect(info.url).toBe("https://example.com/image.png");
    expect(info.width).toBe(0);  // 아직 로드 안 됨
  });

  it("로드 후 getInfo()는 실제 이미지 정보를 반환한다", () => {
    const proxy = new LazyImageProxy("https://example.com/image.jpg");
    proxy.render();  // 로드 트리거

    const info = proxy.getInfo();
    expect(info.width).toBe(1920);  // RealImage의 실제 정보
  });

  it("100개의 프록시 생성이 즉각적이다 (지연 로딩 성능 이점)", () => {
    // 100개의 프록시를 생성해도 실제 이미지는 로드되지 않는다
    const proxies: LazyImageProxy[] = [];
    for (let i = 0; i < 100; i++) {
      proxies.push(new LazyImageProxy(`https://example.com/image-${i}.jpg`));
    }

    // 모두 미로드 상태여야 한다
    expect(proxies.every(p => !p.isLoaded())).toBe(true);
  });

  it("ImageLoader 인터페이스를 구현한다", () => {
    const proxy: ImageLoader = new LazyImageProxy("https://example.com/test.jpg");

    expect(typeof proxy.render).toBe("function");
    expect(typeof proxy.getInfo).toBe("function");
    expect(typeof proxy.isLoaded).toBe("function");
  });
});

describe("Proxy 2: CachingImageProxy (캐싱 프록시)", () => {
  it("생성 시 즉시 이미지가 로드된다", () => {
    const proxy = new CachingImageProxy("https://example.com/photo.jpg");
    expect(proxy.isLoaded()).toBe(true);
  });

  it("첫 render()는 캐시 미스로 실제 렌더링을 수행한다", () => {
    const proxy = new CachingImageProxy("https://example.com/photo.jpg");
    proxy.render();

    const stats = proxy.getCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
  });

  it("두 번째 render()는 캐시 히트로 처리된다", () => {
    const proxy = new CachingImageProxy("https://example.com/photo.jpg");
    proxy.render();  // 캐시 미스
    proxy.render();  // 캐시 히트

    const stats = proxy.getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("캐시 히트 시 동일한 결과를 반환한다", () => {
    const proxy = new CachingImageProxy("https://example.com/photo.jpg");
    const result1 = proxy.render();
    const result2 = proxy.render();

    // 캐시에서 같은 객체를 반환한다
    expect(result1).toBe(result2);
  });

  it("10번 render() 호출 시 캐시 히트율을 계산한다", () => {
    const proxy = new CachingImageProxy("https://example.com/photo.jpg");

    for (let i = 0; i < 10; i++) {
      proxy.render();
    }

    const stats = proxy.getCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(9);
    expect(stats.hitRate).toBe("90.0%");
  });

  it("캐시를 무효화하면 다음 render()는 미스로 처리된다", () => {
    const proxy = new CachingImageProxy("https://example.com/photo.jpg");
    proxy.render();  // 캐시 채움
    proxy.invalidateCache();
    proxy.render();  // 캐시 무효화 후 재렌더링

    const stats = proxy.getCacheStats();
    expect(stats.misses).toBe(2);
  });

  it("캐시 TTL이 만료되면 재렌더링한다", async () => {
    // 캐시 TTL을 1ms로 설정하여 즉시 만료되게 한다
    const proxy = new CachingImageProxy("https://example.com/photo.jpg", 1);
    const result1 = proxy.render();

    // TTL이 지나도록 약간 대기
    await new Promise(resolve => setTimeout(resolve, 10));

    const result2 = proxy.render();

    // TTL 만료 후 새로운 렌더링이 발생하므로 다른 객체여야 한다
    expect(result1).not.toBe(result2);
  });
});

describe("Proxy 3: ProtectedImageProxy (보호 프록시)", () => {
  it("충분한 권한이 있으면 이미지를 렌더링한다", () => {
    const proxy = new ProtectedImageProxy(
      "https://example.com/premium.jpg",
      "user",    // 필요 권한
      "user",    // 현재 사용자 권한
    );

    expect(() => proxy.render()).not.toThrow();
  });

  it("admin 권한은 모든 콘텐츠에 접근 가능하다", () => {
    const proxy = new ProtectedImageProxy(
      "https://example.com/admin-only.jpg",
      "admin",   // 필요 권한: admin
      "admin",   // 현재 권한: admin
    );

    expect(() => proxy.render()).not.toThrow();
  });

  it("권한이 부족하면 접근이 거부된다", () => {
    const proxy = new ProtectedImageProxy(
      "https://example.com/premium.jpg",
      "user",    // 필요 권한: user
      "guest",   // 현재 권한: guest (불충분)
    );

    expect(() => proxy.render()).toThrow("접근 거부");
  });

  it("guest가 admin 전용 콘텐츠에 접근 시 거부된다", () => {
    const proxy = new ProtectedImageProxy(
      "https://example.com/admin-content.jpg",
      "admin",
      "guest",
    );

    expect(() => proxy.render()).toThrow("접근 거부");
  });

  it("user가 admin 전용 콘텐츠에 접근 시 거부된다", () => {
    const proxy = new ProtectedImageProxy(
      "https://example.com/admin-content.jpg",
      "admin",
      "user",
    );

    expect(() => proxy.render()).toThrow("접근 거부");
  });

  it("권한 없이도 기본 정보(URL, format)는 조회할 수 있다", () => {
    const proxy = new ProtectedImageProxy(
      "https://example.com/secret.png",
      "admin",
      "guest",
    );

    // render()는 실패하지만 getInfo()는 성공한다
    expect(() => proxy.getInfo()).not.toThrow();
    expect(proxy.getInfo().url).toBe("https://example.com/secret.png");
  });

  it("권한 없는 경우 이미지가 로드되지 않는다", () => {
    const proxy = new ProtectedImageProxy(
      "https://example.com/protected.jpg",
      "admin",
      "guest",
    );

    try {
      proxy.render();
    } catch {
      // 오류 발생 예상
    }

    // 접근이 거부됐으므로 이미지가 로드되지 않는다
    expect(proxy.isLoaded()).toBe(false);
  });
});

describe("모든 프록시의 공통 인터페이스 준수", () => {
  it("모든 프록시가 ImageLoader 인터페이스를 통해 동일하게 사용될 수 있다", () => {
    const loaders: ImageLoader[] = [
      new RealImage("https://example.com/a.jpg"),
      new LazyImageProxy("https://example.com/b.jpg"),
      new CachingImageProxy("https://example.com/c.jpg"),
    ];

    // 모든 구현체가 동일한 인터페이스로 사용 가능해야 한다
    for (const loader of loaders) {
      const result = loader.render();
      expect(result.imageUrl).toContain("example.com");
      expect(result.renderedAt).toBeInstanceOf(Date);
    }
  });
});
