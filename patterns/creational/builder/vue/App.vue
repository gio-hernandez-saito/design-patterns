<script setup lang="ts">
/**
 * Builder 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   useRequestBuilder() (composable) → ConcreteBuilder: reactive 상태로 HTTP 요청을 단계별 조립
 *   reactive 체이닝 메서드           → Builder 인터페이스: 각 설정 메서드가 this를 반환해 체이닝 지원
 *   build()가 반환하는 객체          → Product (HttpRequest)
 *   프리셋 버튼들                    → Director: 자주 쓰는 조합을 미리 정의
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 클래스 빌더를 Vue에서는 reactive + composable로 표현한다.
 *   reactive 객체가 "누적되는 설정 값들"을 담고,
 *   computed로 미리보기를 실시간 반영해 Builder의 단계별 조립 과정을 시각화한다.
 */

import { reactive, computed, ref } from 'vue'

// ─── Product 타입 ─────────────────────────────────────────────────────────────
interface HttpRequest {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown | null
  timeout: number
  retries: number
}

// ─── Builder composable ───────────────────────────────────────────────────────
/**
 * useRequestBuilder: HTTP 요청 빌더 composable
 *
 * reactive로 관리되는 내부 상태를 단계별로 설정하고
 * build()로 최종 Product를 생성한다.
 * 각 메서드는 빌더 자신을 반환해 체이닝을 지원한다.
 */
function useRequestBuilder() {
  // 빌더 내부 상태 — 단계별로 쌓이는 설정 값들
  // reactive를 쓰는 이유: 각 필드 변경이 template에 즉시 반응하도록
  const state = reactive<HttpRequest>({
    method: 'GET',
    url: '',
    headers: {},
    body: null,
    timeout: 5000,
    retries: 0,
  })

  // 새 헤더 항목 임시 상태 (UI 전용)
  const newHeaderKey = ref('')
  const newHeaderValue = ref('')

  function setMethod(method: string) {
    state.method = method.toUpperCase()
    return builder
  }

  function setUrl(url: string) {
    state.url = url
    return builder
  }

  function addHeader(key: string, value: string) {
    if (key.trim()) {
      state.headers = { ...state.headers, [key]: value }
    }
    return builder
  }

  function removeHeader(key: string) {
    const { [key]: _, ...rest } = state.headers
    state.headers = rest
    return builder
  }

  function setBody(body: unknown) {
    state.body = body
    return builder
  }

  function setTimeout(ms: number) {
    if (ms > 0) state.timeout = ms
    return builder
  }

  function setRetries(count: number) {
    if (count >= 0) state.retries = count
    return builder
  }

  /** 지금까지 설정한 값으로 Product(HttpRequest)를 생성한다 */
  function build(): HttpRequest | null {
    if (!state.url.trim()) return null
    return {
      method: state.method,
      url: state.url,
      headers: { ...state.headers },
      body: state.body,
      timeout: state.timeout,
      retries: state.retries,
    }
  }

  /** 빌더를 초기 상태로 리셋한다 */
  function reset() {
    state.method = 'GET'
    state.url = ''
    state.headers = {}
    state.body = null
    state.timeout = 5000
    state.retries = 0
    newHeaderKey.value = ''
    newHeaderValue.value = ''
    return builder
  }

  const builder = {
    state,
    newHeaderKey,
    newHeaderValue,
    setMethod,
    setUrl,
    addHeader,
    removeHeader,
    setBody,
    setTimeout,
    setRetries,
    build,
    reset,
  }

  return builder
}

// ─── Director: 자주 쓰는 조합을 미리 정의 ────────────────────────────────────
// TypeScript 버전의 HttpRequestDirector를 Vue에서는 프리셋 함수들로 표현한다.
const presets = {
  /** GET 요청 프리셋 */
  get(url: string) {
    return { method: 'GET', url, headers: { Accept: 'application/json' }, body: null, timeout: 5000, retries: 0 }
  },
  /** JSON POST 요청 프리셋 */
  jsonPost(url: string) {
    return {
      method: 'POST', url,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: { data: '예시 데이터' },
      timeout: 5000,
      retries: 0,
    }
  },
  /** 재시도 포함 안정적 요청 프리셋 */
  resilient(url: string) {
    return { method: 'GET', url, headers: { Accept: 'application/json' }, body: null, timeout: 10000, retries: 3 }
  },
}

// ─── 데모 상태 ────────────────────────────────────────────────────────────────
const builder = useRequestBuilder()
const builtRequest = ref<HttpRequest | null>(null)
const error = ref('')

// computed로 빌드 미리보기를 실시간 반영한다
const preview = computed(() => JSON.stringify({
  method: builder.state.method,
  url: builder.state.url || '(URL 미설정)',
  headers: builder.state.headers,
  body: builder.state.body,
  timeout: builder.state.timeout,
  retries: builder.state.retries,
}, null, 2))

function applyPreset(preset: ReturnType<typeof presets.get>) {
  builder.reset()
  builder.setMethod(preset.method)
  builder.setUrl(preset.url)
  Object.entries(preset.headers).forEach(([k, v]) => builder.addHeader(k, v))
  if (preset.body) builder.setBody(preset.body)
  builder.setTimeout(preset.timeout)
  builder.setRetries(preset.retries)
}

function addHeader() {
  if (!builder.newHeaderKey.value.trim()) return
  builder.addHeader(builder.newHeaderKey.value, builder.newHeaderValue.value)
  builder.newHeaderKey.value = ''
  builder.newHeaderValue.value = ''
}

function doBuild() {
  const result = builder.build()
  if (!result) {
    error.value = 'URL은 필수입니다.'
    builtRequest.value = null
  } else {
    error.value = ''
    builtRequest.value = result
  }
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 750px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">
      Builder 패턴
    </h1>
    <p style="color: #555;">
      <code>useRequestBuilder()</code> composable이 reactive 상태로 HTTP 요청을
      단계별로 조립한다. 각 설정 메서드는 빌더 자신을 반환해 체이닝이 가능하다.
      프리셋 버튼은 Director 역할로, 자주 쓰는 조합을 미리 정의한다.
    </p>

    <!-- Director: 프리셋 버튼들 -->
    <div style="margin-bottom: 1.5rem;">
      <strong>Director 프리셋:</strong>
      <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap;">
        <button @click="applyPreset(presets.get('https://api.example.com/users'))"
          style="padding: 6px 14px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #f0f9ff;">
          GET 요청
        </button>
        <button @click="applyPreset(presets.jsonPost('https://api.example.com/users'))"
          style="padding: 6px 14px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #f0fff4;">
          JSON POST 요청
        </button>
        <button @click="applyPreset(presets.resilient('https://api.example.com/data'))"
          style="padding: 6px 14px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fefcbf;">
          재시도 포함 요청
        </button>
        <button @click="builder.reset()"
          style="padding: 6px 14px; cursor: pointer; border-radius: 4px; border: 1px solid #e53e3e; color: #e53e3e; background: white;">
          초기화
        </button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- 왼쪽: Builder 단계별 설정 -->
      <div>
        <h3 style="margin-top: 0;">단계별 설정 (Builder)</h3>

        <div style="margin-bottom: 0.75rem;">
          <label style="font-weight: bold; font-size: 0.85rem;">메서드</label>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap;">
            <button
              v-for="m in ['GET','POST','PUT','PATCH','DELETE']"
              :key="m"
              @click="builder.setMethod(m)"
              :style="{
                padding: '4px 10px', cursor: 'pointer', borderRadius: '4px',
                border: '1px solid #ccc',
                background: builder.state.method === m ? '#4a5568' : 'white',
                color: builder.state.method === m ? 'white' : 'black',
              }"
            >{{ m }}</button>
          </div>
        </div>

        <div style="margin-bottom: 0.75rem;">
          <label style="font-weight: bold; font-size: 0.85rem;">URL</label>
          <input
            :value="builder.state.url"
            @input="(e) => builder.setUrl((e.target as HTMLInputElement).value)"
            placeholder="https://api.example.com/..."
            style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-top: 0.25rem;"
          />
        </div>

        <div style="margin-bottom: 0.75rem;">
          <label style="font-weight: bold; font-size: 0.85rem;">타임아웃 (ms)</label>
          <input
            type="number"
            :value="builder.state.timeout"
            @input="(e) => builder.setTimeout(Number((e.target as HTMLInputElement).value))"
            style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-top: 0.25rem;"
          />
        </div>

        <div style="margin-bottom: 0.75rem;">
          <label style="font-weight: bold; font-size: 0.85rem;">재시도 횟수</label>
          <input
            type="number"
            :value="builder.state.retries"
            @input="(e) => builder.setRetries(Number((e.target as HTMLInputElement).value))"
            min="0"
            style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-top: 0.25rem;"
          />
        </div>

        <!-- 헤더 추가 -->
        <div style="margin-bottom: 0.75rem;">
          <label style="font-weight: bold; font-size: 0.85rem;">헤더 추가</label>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
            <input v-model="builder.newHeaderKey.value" placeholder="키" style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" />
            <input v-model="builder.newHeaderValue.value" placeholder="값" style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" />
            <button @click="addHeader" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc;">+</button>
          </div>
          <div v-for="(v, k) in builder.state.headers" :key="k" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 4px; font-size: 0.8rem;">
            <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">{{ k }}: {{ v }}</code>
            <button @click="builder.removeHeader(String(k))" style="border: none; background: none; color: #e53e3e; cursor: pointer; font-size: 0.9rem;">✕</button>
          </div>
        </div>

        <button
          @click="doBuild"
          style="background: #2b6cb0; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 1rem; width: 100%;"
        >
          build() — 요청 생성
        </button>
        <div v-if="error" style="color: #e53e3e; margin-top: 0.5rem; font-size: 0.9rem;">{{ error }}</div>
      </div>

      <!-- 오른쪽: 실시간 미리보기 & 결과 -->
      <div>
        <h3 style="margin-top: 0;">실시간 미리보기</h3>
        <pre style="background: #f5f5f5; border-radius: 6px; padding: 1rem; font-size: 0.8rem; overflow: auto; margin: 0;">{{ preview }}</pre>

        <div v-if="builtRequest" style="margin-top: 1rem;">
          <h3>build() 결과 (Product)</h3>
          <pre style="background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 6px; padding: 1rem; font-size: 0.8rem; overflow: auto; margin: 0;">{{ JSON.stringify(builtRequest, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
