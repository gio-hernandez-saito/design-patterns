<script setup lang="ts">
/**
 * Singleton 패턴 — Vue 구현
 *
 * Vue에서의 Singleton 역할 매핑:
 *   useAppConfig (composable) → Singleton: 모듈 스코프 변수로 단일 인스턴스를 보장한다
 *   provide/inject              → 전역 진입점: 하위 컴포넌트 어디서든 동일 인스턴스에 접근
 *   ConfigPanel (컴포넌트)      → Client: 설정을 읽고 쓰는 소비자
 *
 * 왜 이렇게 구현하는가?
 *   - Vue에서는 클래스 생성자 대신 composable 모듈 파일의 최상위 변수가
 *     "오직 하나"를 보장한다. ES 모듈은 동일 모듈 경로를 두 번 import해도
 *     같은 인스턴스를 반환하기 때문이다.
 *   - provide/inject를 사용하면 App 레벨에서 한 번 주입한 인스턴스를
 *     자식 컴포넌트 트리 어디서든 inject()로 꺼낼 수 있다.
 */

import { ref, reactive, provide, inject, type InjectionKey } from 'vue'

// ─── Singleton 구현: 모듈 스코프 변수 ────────────────────────────────────────
// 이 변수들은 파일이 처음 import될 때 딱 한 번 생성된다.
// 어디서 useAppConfig()를 호출하든 항상 같은 reactive 객체를 참조한다.
// 이것이 Vue에서 Singleton을 구현하는 핵심 방법이다.

/** 설정 저장소 — 모듈 스코프에서 단 하나만 존재 */
const _config = reactive<Record<string, string>>({
  logLevel: 'info',
  apiUrl: 'https://api.example.com',
  timeout: '5000',
})

/**
 * Singleton composable: 전역 앱 설정을 관리한다.
 *
 * 어디서 호출해도 동일한 _config 객체를 참조하므로
 * 한 컴포넌트에서 변경하면 다른 컴포넌트에서도 즉시 반영된다.
 */
function useAppConfig() {
  function get(key: string): string | undefined {
    return _config[key]
  }

  function set(key: string, value: string): void {
    _config[key] = value
  }

  function getAll(): Record<string, string> {
    // 반응형 객체를 일반 객체로 복사해 반환한다
    return { ..._config }
  }

  return { config: _config, get, set, getAll }
}

// ─── provide/inject 키 ────────────────────────────────────────────────────────
// InjectionKey를 사용하면 타입 안전하게 provide/inject할 수 있다.
// Symbol을 키로 쓰는 이유: 문자열 키 충돌을 방지하기 위해
const AppConfigKey: InjectionKey<ReturnType<typeof useAppConfig>> = Symbol('AppConfig')

// ─── App 루트에서 Singleton을 제공(provide)한다 ──────────────────────────────
// provide는 한 번만 호출하면 하위 모든 컴포넌트에서 inject로 접근 가능하다.
const appConfig = useAppConfig()
provide(AppConfigKey, appConfig)

// ─── 데모 UI 상태 ─────────────────────────────────────────────────────────────
// 인스턴스 동일성을 증명하기 위해 두 개의 독립적인 "패널"에서 같은 설정에 접근한다.
// Panel A와 Panel B는 각자 useAppConfig()를 호출하지만 동일 인스턴스를 참조한다.

// Panel A에서 사용하는 설정 참조 (inject 대신 직접 사용해 동일 인스턴스임을 확인)
const configA = useAppConfig()
// Panel B에서도 같은 composable 호출
const configB = useAppConfig()

// 동일 인스턴스 여부: configA와 configB의 config가 같은 reactive 객체인지 확인
const isSameInstance = configA.config === configB.config

const newKey = ref('')
const newValue = ref('')
const actionLog = ref<string[]>([])

function addConfig() {
  if (!newKey.value.trim()) return
  // configA에서 값을 설정하면 configB에서도 즉시 보인다 (동일 인스턴스)
  configA.set(newKey.value.trim(), newValue.value)
  actionLog.value.push(`[패널 A] "${newKey.value}" = "${newValue.value}" 설정`)
  newKey.value = ''
  newValue.value = ''
}

// B패널에서 logLevel 변경 (A패널 설정과 즉시 동기화됨을 확인하기 위해)
const bLogLevel = ref('debug')
function changeLevelFromB() {
  configB.set('logLevel', bLogLevel.value)
  actionLog.value.push(`[패널 B] logLevel = "${bLogLevel.value}" 변경`)
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">
      Singleton 패턴
    </h1>
    <p style="color: #555;">
      Vue에서 Singleton은 <code>composable 모듈 스코프 변수</code>로 구현한다.
      ES 모듈 시스템이 같은 파일을 두 번 import해도 동일 인스턴스를 반환하기 때문에
      어디서 <code>useAppConfig()</code>를 호출해도 같은 reactive 객체를 공유한다.
    </p>

    <!-- 동일 인스턴스 증명 배너 -->
    <div :style="{
      padding: '0.75rem 1rem',
      borderRadius: '6px',
      marginBottom: '1.5rem',
      background: isSameInstance ? '#d4edda' : '#f8d7da',
      border: `1px solid ${isSameInstance ? '#28a745' : '#dc3545'}`,
    }">
      <strong>인스턴스 동일성 검증:</strong>
      패널 A의 <code>config</code> === 패널 B의 <code>config</code>?
      <strong>{{ isSameInstance ? '✓ 동일 (Singleton!)' : '✗ 다름' }}</strong>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- 패널 A: 설정 추가 -->
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem;">
        <h3 style="margin-top: 0; color: #0066cc;">패널 A — 설정 추가</h3>
        <div style="margin-bottom: 0.5rem;">
          <input
            v-model="newKey"
            placeholder="키 (예: theme)"
            style="width: 100%; box-sizing: border-box; padding: 6px; margin-bottom: 6px;"
          />
          <input
            v-model="newValue"
            placeholder="값 (예: dark)"
            style="width: 100%; box-sizing: border-box; padding: 6px; margin-bottom: 6px;"
          />
          <button @click="addConfig" style="padding: 6px 12px; cursor: pointer;">
            설정 추가
          </button>
        </div>
        <div style="font-size: 0.85rem; color: #555;">
          패널 A에서 설정을 추가하면 패널 B에도 즉시 반영됩니다.
        </div>
      </div>

      <!-- 패널 B: 설정 변경 -->
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem;">
        <h3 style="margin-top: 0; color: #cc6600;">패널 B — logLevel 변경</h3>
        <select v-model="bLogLevel" style="padding: 6px; margin-bottom: 6px; display: block;">
          <option value="debug">debug</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <button @click="changeLevelFromB" style="padding: 6px 12px; cursor: pointer;">
          B에서 변경
        </button>
        <div style="font-size: 0.85rem; color: #555; margin-top: 6px;">
          패널 B의 변경이 패널 A의 설정 목록에도 반영됩니다.
        </div>
      </div>
    </div>

    <!-- 현재 설정 목록 (두 패널이 공유하는 단일 인스턴스의 내용) -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-top: 1.5rem;">
      <h3 style="margin-top: 0;">공유 설정 저장소 (Singleton 상태)</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="text-align: left; padding: 6px; border: 1px solid #ddd;">키</th>
            <th style="text-align: left; padding: 6px; border: 1px solid #ddd;">값</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key) in appConfig.config" :key="key">
            <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">{{ key }}</td>
            <td style="padding: 6px; border: 1px solid #ddd;">{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 액션 로그 -->
    <div v-if="actionLog.length" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
      <h3 style="margin-top: 0;">액션 로그</h3>
      <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.85rem; color: #333;">
        <li v-for="(log, i) in actionLog" :key="i">{{ log }}</li>
      </ul>
    </div>
  </div>
</template>
