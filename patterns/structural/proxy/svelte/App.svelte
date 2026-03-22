<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Proxy 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   ImageItem 타입             → Subject 인터페이스
  //   $state loaded/cache        → 가상 프록시(lazy loading)와 캐싱 프록시 상태
  //   loadImage()                → 프록시의 render() — 필요할 때만 실제 로드
  //   accessLevel / requiredLevel → 보호 프록시 (접근 권한 제어)
  //
  // 핵심 아이디어:
  //   TypeScript에서는 LazyImageProxy 클래스가 RealImage 생성을 지연했지만,
  //   Svelte에서는 $state로 loaded 상태를 관리하고, 버튼 클릭 시에만 로드 함수를 실행한다.
  //   캐시는 $state Map으로 구현하고, $derived로 캐시 히트율을 자동 계산한다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Subject: 이미지 아이템 타입 ──────────────────────────────────────────
  type AccessLevel = 'guest' | 'user' | 'admin'

  interface ImageItem {
    id: number
    url: string
    label: string
    size: string
    requiredAccess: AccessLevel
  }

  // ── 이미지 목록 (프록시 없이는 모두 즉시 로드됨) ─────────────────────────
  const images: ImageItem[] = [
    { id: 1, url: 'https://picsum.photos/seed/cat/400/300',     label: '고양이',     size: '2.1MB', requiredAccess: 'guest' },
    { id: 2, url: 'https://picsum.photos/seed/dog/400/300',     label: '강아지',     size: '1.8MB', requiredAccess: 'guest' },
    { id: 3, url: 'https://picsum.photos/seed/forest/400/300',  label: '숲',         size: '3.2MB', requiredAccess: 'user' },
    { id: 4, url: 'https://picsum.photos/seed/city/400/300',    label: '도시',       size: '2.7MB', requiredAccess: 'user' },
    { id: 5, url: 'https://picsum.photos/seed/galaxy/400/300',  label: '은하수',     size: '4.1MB', requiredAccess: 'admin' },
    { id: 6, url: 'https://picsum.photos/seed/ocean/400/300',   label: '바다',       size: '3.5MB', requiredAccess: 'admin' },
  ]

  // ── $state: 프록시 상태들 ────────────────────────────────────────────────

  // 가상 프록시 (Lazy Loading): 실제로 로드된 이미지 ID Set
  let loadedImages = $state<Set<number>>(new Set())

  // 캐싱 프록시: URL → 로드 시간 캐시 (중복 로드 방지)
  let imageCache = $state<Map<number, { loadTime: number; cachedAt: number }>>(new Map())
  let cacheHits = $state(0)
  let cacheMisses = $state(0)

  // 보호 프록시: 현재 사용자 접근 레벨
  let currentAccessLevel = $state<AccessLevel>('guest')

  // 로딩 중인 이미지 ID Set
  let loadingImages = $state<Set<number>>(new Set())

  // ── 접근 레벨 비교 헬퍼 ──────────────────────────────────────────────────
  const accessLevels: Record<AccessLevel, number> = { guest: 0, user: 1, admin: 2 }
  function hasAccess(required: AccessLevel): boolean {
    return accessLevels[currentAccessLevel] >= accessLevels[required]
  }

  // ── 가상 프록시: 지연 로딩 구현 ──────────────────────────────────────────
  // TypeScript의 LazyImageProxy.render() → 처음 호출될 때만 RealImage 생성
  async function loadImage(img: ImageItem) {
    // 보호 프록시: 접근 권한 확인
    if (!hasAccess(img.requiredAccess)) {
      alert(`접근 거부: '${img.requiredAccess}' 권한이 필요합니다.`)
      return
    }

    // 캐싱 프록시: 이미 캐시에 있으면 캐시 반환
    if (imageCache.has(img.id)) {
      cacheHits++
      loadedImages = new Set([...loadedImages, img.id])
      return
    }

    // 캐시 미스: 실제 로드 수행 (가상 프록시 — 처음 로드할 때만 실행)
    cacheMisses++
    loadingImages = new Set([...loadingImages, img.id])

    const start = Date.now()
    // 실제 이미지 로드 시뮬레이션 (img 태그 프리로드)
    await new Promise<void>((resolve) => {
      const tempImg = new Image()
      tempImg.onload = () => resolve()
      tempImg.onerror = () => resolve()
      tempImg.src = img.url
    })
    const loadTime = Date.now() - start

    // 캐시에 저장 (캐싱 프록시)
    imageCache = new Map(imageCache).set(img.id, { loadTime, cachedAt: Date.now() })
    loadedImages = new Set([...loadedImages, img.id])
    loadingImages = new Set([...loadingImages].filter(id => id !== img.id))
  }

  function unloadImage(id: number) {
    const next = new Set(loadedImages)
    next.delete(id)
    loadedImages = next
  }

  function clearCache() {
    imageCache = new Map()
    loadedImages = new Set()
    cacheHits = 0
    cacheMisses = 0
  }

  // ── $derived: 캐시 통계 ───────────────────────────────────────────────────
  let total = $derived(cacheHits + cacheMisses)
  let hitRate = $derived(total === 0 ? '0%' : `${((cacheHits / total) * 100).toFixed(1)}%`)

  const accessLabels: Record<AccessLevel, string> = { guest: '👤 게스트', user: '👥 사용자', admin: '👑 관리자' }
</script>

<main>
  <h1>Proxy 패턴</h1>
  <p class="desc">
    <strong>가상 프록시</strong>(클릭 시에만 로드), <strong>캐싱 프록시</strong>(중복 로드 방지),
    <strong>보호 프록시</strong>(접근 권한 제어) — 3가지를 한 번에 시연한다.
  </p>

  <div class="controls-bar">
    <!-- 보호 프록시: 접근 레벨 선택 -->
    <div class="access-control">
      <span class="ctrl-label">보호 프록시 — 현재 접근 레벨:</span>
      {#each (['guest', 'user', 'admin'] as AccessLevel[]) as level}
        <button
          class="access-btn"
          class:active={currentAccessLevel === level}
          onclick={() => (currentAccessLevel = level)}
        >
          {accessLabels[level]}
        </button>
      {/each}
    </div>

    <!-- 캐시 통계 -->
    <div class="cache-stats">
      <span>캐시 히트: <strong class="hit">{cacheHits}</strong></span>
      <span>미스: <strong class="miss">{cacheMisses}</strong></span>
      <span>히트율: <strong>{hitRate}</strong></span>
      <button class="btn-clear-cache" onclick={clearCache}>캐시 초기화</button>
    </div>
  </div>

  <!-- 이미지 갤러리 -->
  <div class="gallery">
    {#each images as img}
      {@const accessible = hasAccess(img.requiredAccess)}
      {@const isLoaded = loadedImages.has(img.id)}
      {@const isLoading = loadingImages.has(img.id)}
      {@const cached = imageCache.has(img.id)}

      <div class="img-card" class:locked={!accessible} class:loaded={isLoaded}>
        <!-- 프록시 상태 배지 -->
        <div class="proxy-badges">
          {#if cached}
            <span class="badge cache">캐시됨</span>
          {/if}
          {#if !accessible}
            <span class="badge locked">🔒 {img.requiredAccess}</span>
          {/if}
        </div>

        <!-- 이미지 플레이스홀더 / 실제 이미지 (가상 프록시) -->
        {#if isLoaded}
          <img src={img.url} alt={img.label} class="real-img" />
          {#if imageCache.has(img.id)}
            <div class="load-time">로드: {imageCache.get(img.id)?.loadTime}ms</div>
          {/if}
        {:else if isLoading}
          <div class="placeholder loading">
            <span class="spinner">⏳</span> 로딩 중...
          </div>
        {:else}
          <div class="placeholder">
            <span class="placeholder-icon">{accessible ? '🖼️' : '🔒'}</span>
            <span class="placeholder-label">{img.label}</span>
            <span class="placeholder-size">{img.size}</span>
          </div>
        {/if}

        <!-- 컨트롤 버튼 -->
        <div class="img-controls">
          <span class="img-label">{img.label}</span>
          {#if isLoaded}
            <button class="btn-unload" onclick={() => unloadImage(img.id)}>숨기기</button>
          {:else}
            <button
              class="btn-load"
              disabled={!accessible || isLoading}
              onclick={() => loadImage(img)}
            >
              {accessible ? (cached ? '캐시에서 로드' : '로드') : '권한 없음'}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>가상 프록시:</strong> TS의 <code>LazyImageProxy</code> → <code>$state loaded Set</code>으로 지연 로딩 상태 관리</li>
      <li><strong>캐싱 프록시:</strong> TS의 <code>cachedResult</code> 필드 → <code>$state Map</code>으로 캐시 저장</li>
      <li><strong>보호 프록시:</strong> TS의 접근 레벨 비교 → <code>$state currentAccessLevel</code> + <code>hasAccess()</code> 함수</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #0891b2; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.25rem; }
  .controls-bar {
    display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between;
    background: #f1f5f9; border-radius: 10px; padding: 0.75rem 1rem;
    margin-bottom: 1.5rem; font-size: 0.88rem;
  }
  .access-control { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .ctrl-label { font-weight: 600; color: #374151; }
  .access-btn {
    padding: 0.35rem 0.75rem; border: 2px solid #cbd5e1; border-radius: 6px;
    background: white; cursor: pointer; font-size: 0.82rem; transition: all 0.15s;
  }
  .access-btn.active { border-color: #0891b2; background: #e0f2fe; color: #0c4a6e; font-weight: 600; }
  .cache-stats { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
  .hit { color: #059669; }
  .miss { color: #dc2626; }
  .btn-clear-cache {
    background: transparent; border: 1px solid #e2e8f0; padding: 0.3rem 0.6rem;
    border-radius: 5px; cursor: pointer; font-size: 0.78rem; color: #94a3b8;
  }
  .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .img-card {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
    overflow: hidden; transition: all 0.2s; position: relative;
  }
  .img-card.locked { opacity: 0.7; }
  .img-card.loaded { border-color: #0891b2; }
  .proxy-badges {
    position: absolute; top: 0.5rem; left: 0.5rem; display: flex; gap: 0.3rem; z-index: 1;
  }
  .badge {
    font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 4px;
    font-weight: 600;
  }
  .badge.cache { background: #dcfce7; color: #166534; }
  .badge.locked { background: #fee2e2; color: #991b1b; }
  .real-img { width: 100%; height: 160px; object-fit: cover; display: block; }
  .load-time {
    background: rgba(0,0,0,0.6); color: white; font-size: 0.72rem;
    padding: 0.2rem 0.5rem; text-align: center;
  }
  .placeholder {
    height: 160px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 0.35rem; background: #f1f5f9;
  }
  .placeholder.loading { background: #e0f2fe; }
  .placeholder-icon { font-size: 2rem; }
  .placeholder-label { font-weight: 600; font-size: 0.88rem; color: #374151; }
  .placeholder-size { font-size: 0.78rem; color: #94a3b8; }
  .spinner { font-size: 1.5rem; animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .img-controls {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.5rem 0.75rem; background: white; border-top: 1px solid #e2e8f0;
  }
  .img-label { font-size: 0.88rem; font-weight: 600; color: #374151; }
  .btn-load {
    background: #0891b2; color: white; border: none; padding: 0.3rem 0.75rem;
    border-radius: 5px; cursor: pointer; font-size: 0.8rem;
  }
  .btn-load:disabled { background: #94a3b8; cursor: not-allowed; }
  .btn-unload {
    background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.3rem 0.6rem;
    border-radius: 5px; cursor: pointer; font-size: 0.8rem; color: #6b7280;
  }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
