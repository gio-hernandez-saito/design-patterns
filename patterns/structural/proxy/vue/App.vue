<script setup lang="ts">
/**
 * Proxy 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   defineAsyncComponent()     → 가상 프록시(Virtual Proxy): 컴포넌트를 실제 필요할 때까지 로드하지 않음
 *   useCachedFetch()           → 캐싱 프록시(Caching Proxy): 동일 요청의 결과를 캐시해 재사용
 *   useProtectedResource()     → 보호 프록시(Protection Proxy): 권한에 따라 접근을 허용/거부
 *   <Suspense>                 → 가상 프록시의 로딩 상태를 처리하는 Vue 기본 컴포넌트
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 LazyImageProxy(가상), CachingImageProxy(캐싱), ProtectedImageProxy(보호)를
 *   Vue 고유의 방식으로 표현한다. defineAsyncComponent가 가상 프록시를,
 *   composable의 Map 캐시가 캐싱 프록시를, 권한 체크 composable이 보호 프록시를 담당한다.
 */

import { ref, reactive, defineAsyncComponent, computed } from 'vue'

// ─── 1. 가상 프록시(Virtual Proxy): defineAsyncComponent ──────────────────────
// 컴포넌트가 실제로 필요한 시점에야 로드된다.
// 화면에 보이지 않는 무거운 컴포넌트를 미리 로드하지 않아 초기 로딩 시간을 줄인다.
//
// TypeScript 버전의 LazyImageProxy.render() 첫 호출 시 RealImage 생성과 같은 원리:
// "실제로 필요한 순간"에 생성(로드)한다.

/** 무거운 차트 컴포넌트를 시뮬레이션 — 실제 로드에 2초가 걸린다고 가정 */
const HeavyChartProxy = defineAsyncComponent({
  // 실제 프로젝트에서는 () => import('./HeavyChart.vue') 처럼 동적 import를 사용한다.
  // 여기서는 지연을 시뮬레이션하기 위해 Promise를 직접 반환한다.
  loader: () => new Promise((resolve) => {
    setTimeout(() => {
      // 2초 후 컴포넌트 정의를 반환
      resolve({
        setup() { return {} },
        template: `
          <div style="padding:1rem;background:#ebf8ff;border:1px solid #bee3f8;border-radius:8px;">
            <div style="font-size:1.5rem;margin-bottom:0.5rem;">📊</div>
            <div style="font-weight:bold;color:#2b6cb0;">무거운 차트 컴포넌트</div>
            <div style="color:#555;font-size:0.85rem;margin-top:0.5rem;">
              실제 요청 시점에 로드됨 (2초 지연 시뮬레이션 완료)
            </div>
          </div>
        `,
      } as any)
    }, 2000)
  }),
  // 로딩 중 표시할 fallback — 프록시가 실제 컴포넌트를 준비하는 동안 보여준다
  loadingComponent: {
    template: `
      <div style="padding:1rem;background:#f5f5f5;border:1px dashed #ccc;border-radius:8px;color:#888;text-align:center;">
        ⏳ 차트 로딩 중... (가상 프록시가 실제 컴포넌트를 준비 중)
      </div>
    `,
  },
})

const showChart = ref(false)

// ─── 2. 캐싱 프록시(Caching Proxy): useCachedFetch ────────────────────────────
/**
 * useCachedFetch: 동일한 URL에 대한 요청 결과를 캐시한다.
 *
 * TypeScript 버전의 CachingImageProxy처럼
 * 첫 번째 fetch만 실제 수행하고 이후 동일 URL 요청은 캐시에서 즉시 반환한다.
 */
function useCachedFetch() {
  // 캐시 저장소: URL → 결과
  const cache = new Map<string, string>()
  const stats = reactive({ hits: 0, misses: 0 })
  const lastResult = ref('')
  const isLoading = ref(false)

  async function fetch(url: string): Promise<string> {
    // 캐시에 있으면 즉시 반환 (캐시 히트)
    if (cache.has(url)) {
      stats.hits++
      const cached = cache.get(url)!
      lastResult.value = `[캐시 히트] ${cached}`
      return cached
    }

    // 캐시 미스: 실제 요청 수행 시뮬레이션
    stats.misses++
    isLoading.value = true
    await new Promise(r => setTimeout(r, 800)) // 네트워크 지연 시뮬레이션
    const result = `응답 데이터: ${url} (${new Date().toLocaleTimeString()}에 로드)`
    cache.set(url, result)
    lastResult.value = `[캐시 미스 → 저장] ${result}`
    isLoading.value = false
    return result
  }

  const hitRate = computed(() => {
    const total = stats.hits + stats.misses
    return total === 0 ? '0%' : `${((stats.hits / total) * 100).toFixed(0)}%`
  })

  return { fetch, stats, hitRate, lastResult, isLoading }
}

const cachedFetch = useCachedFetch()
const fetchUrl = ref('https://api.example.com/users')
const fetchUrls = ['https://api.example.com/users', 'https://api.example.com/products', 'https://api.example.com/orders']

async function doFetch() {
  await cachedFetch.fetch(fetchUrl.value)
}

// ─── 3. 보호 프록시(Protection Proxy): useProtectedResource ──────────────────
/**
 * useProtectedResource: 현재 사용자 권한에 따라 접근을 허용/거부한다.
 *
 * TypeScript 버전의 ProtectedImageProxy처럼
 * 접근 권한이 없으면 실제 리소스를 로드하지 않는다.
 */
type AccessLevel = 'guest' | 'user' | 'admin'

const accessLevels: Record<AccessLevel, number> = { guest: 0, user: 1, admin: 2 }

function useProtectedResource(requiredLevel: AccessLevel) {
  const currentUserLevel = ref<AccessLevel>('guest')
  const accessLog = ref<Array<{ level: AccessLevel; allowed: boolean; time: string }>>([])

  const canAccess = computed(() => {
    return accessLevels[currentUserLevel.value] >= accessLevels[requiredLevel]
  })

  function tryAccess() {
    const allowed = canAccess.value
    accessLog.value.unshift({
      level: currentUserLevel.value,
      allowed,
      time: new Date().toLocaleTimeString(),
    })
    return allowed
  }

  return { currentUserLevel, canAccess, tryAccess, accessLog, requiredLevel }
}

const protected1 = useProtectedResource('user')  // user 이상 필요
const protected2 = useProtectedResource('admin')  // admin 필요
</script>

<template>
  <div style="font-family: sans-serif; max-width: 750px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Proxy 패턴</h1>
    <p style="color: #555;">
      Vue의 세 가지 프록시 구현:
      <strong>가상 프록시</strong>(<code>defineAsyncComponent</code>),
      <strong>캐싱 프록시</strong>(composable Map 캐시),
      <strong>보호 프록시</strong>(권한 체크 composable)
    </p>

    <!-- 1. 가상 프록시 -->
    <div style="border: 1px solid #bee3f8; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0; color: #2b6cb0;">1. 가상 프록시 (defineAsyncComponent)</h3>
      <p style="font-size: 0.85rem; color: #555; margin-bottom: 1rem;">
        버튼을 클릭하기 전까지 무거운 차트 컴포넌트는 로드되지 않는다.
        클릭 시 실제 컴포넌트를 로드(2초)하고, 이후 재표시는 이미 로드된 컴포넌트를 재사용한다.
      </p>
      <button @click="showChart = !showChart"
        style="padding: 8px 16px; cursor: pointer; border-radius: 4px; border: 1px solid #bee3f8; background: #ebf8ff; margin-bottom: 1rem;">
        {{ showChart ? '차트 숨기기' : '차트 보기 (가상 프록시 활성화)' }}
      </button>
      <div v-if="showChart">
        <!-- Suspense: 비동기 컴포넌트 로딩 중 fallback을 보여주는 Vue 기본 기능 -->
        <Suspense>
          <HeavyChartProxy />
          <template #fallback>
            <div style="padding:1rem;background:#f5f5f5;border:1px dashed #ccc;border-radius:8px;color:#888;text-align:center;">
              ⏳ 차트 로딩 중... (가상 프록시가 실제 컴포넌트를 준비 중)
            </div>
          </template>
        </Suspense>
      </div>
    </div>

    <!-- 2. 캐싱 프록시 -->
    <div style="border: 1px solid #9ae6b4; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0; color: #276749;">2. 캐싱 프록시 (useCachedFetch)</h3>
      <p style="font-size: 0.85rem; color: #555; margin-bottom: 1rem;">
        같은 URL을 두 번 이상 요청하면 캐시에서 즉시 반환한다. 첫 요청만 실제 지연이 발생한다.
      </p>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
        <button v-for="url in fetchUrls" :key="url"
          @click="fetchUrl = url; doFetch()"
          :style="{
            padding: '6px 10px', cursor: 'pointer', borderRadius: '4px',
            border: '1px solid #9ae6b4', background: '#f0fff4', fontSize: '0.8rem',
          }">
          {{ url.split('/').pop() }}
        </button>
      </div>
      <div v-if="cachedFetch.isLoading.value" style="color: #888; font-size: 0.85rem; margin-bottom: 0.5rem;">
        ⏳ 로딩 중... (캐시 미스 — 실제 요청 수행)
      </div>
      <div v-if="cachedFetch.lastResult.value" style="font-size: 0.85rem; font-family: monospace; padding: 0.5rem; background: #f0fff4; border-radius: 4px; margin-bottom: 0.75rem;">
        {{ cachedFetch.lastResult.value }}
      </div>
      <div style="display: flex; gap: 1.5rem; font-size: 0.85rem;">
        <span>캐시 히트: <strong style="color: #276749;">{{ cachedFetch.stats.hits }}</strong></span>
        <span>캐시 미스: <strong style="color: #c53030;">{{ cachedFetch.stats.misses }}</strong></span>
        <span>히트율: <strong>{{ cachedFetch.hitRate.value }}</strong></span>
      </div>
    </div>

    <!-- 3. 보호 프록시 -->
    <div style="border: 1px solid #d6bcfa; border-radius: 8px; padding: 1.5rem;">
      <h3 style="margin-top: 0; color: #553c9a;">3. 보호 프록시 (useProtectedResource)</h3>
      <p style="font-size: 0.85rem; color: #555; margin-bottom: 1rem;">
        현재 권한 레벨에 따라 리소스 접근이 허용되거나 거부된다.
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div v-for="resource in [protected1, protected2]" :key="resource.requiredLevel"
          style="border: 1px solid #e9d8fd; border-radius: 6px; padding: 1rem;">
          <div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 0.5rem;">
            {{ resource.requiredLevel }} 이상 필요한 리소스
          </div>
          <div style="margin-bottom: 0.5rem;">
            <select v-model="resource.currentUserLevel.value"
              style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem;">
              <option value="guest">guest</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button @click="resource.tryAccess()"
            style="padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; font-size: 0.85rem; margin-bottom: 0.5rem;">
            접근 시도
          </button>
          <div :style="{ fontSize: '0.8rem', color: resource.canAccess.value ? '#276749' : '#c53030' }">
            현재 상태: {{ resource.canAccess.value ? '✓ 접근 허용' : '✗ 접근 거부' }}
          </div>
          <div v-if="resource.accessLog.value.length" style="margin-top: 0.5rem; max-height: 80px; overflow-y: auto;">
            <div v-for="(log, i) in resource.accessLog.value" :key="i"
              :style="{ fontSize: '0.75rem', color: log.allowed ? '#276749' : '#c53030', fontFamily: 'monospace' }">
              {{ log.time }} [{{ log.level }}] {{ log.allowed ? '허용' : '거부' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
