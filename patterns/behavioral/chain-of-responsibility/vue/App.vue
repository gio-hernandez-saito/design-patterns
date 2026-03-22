<script setup lang="ts">
/**
 * Chain of Responsibility 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   useValidationChain() composable → Handler 체인을 구성하고 실행하는 composable
 *   ValidatorHandler[]              → ConcreteHandler 배열: 각 검증 단계
 *   form (reactive)                 → 검증 대상 데이터
 *   체인 순서 시각화                  → 어떤 핸들러가 요청을 처리/통과시켰는지 표시
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 클래스 기반 체인(setNext().setNext())을 Vue에서는
 *   핸들러 함수 배열로 표현한다. 각 핸들러는 { canHandle, process } 두 함수를 가진다.
 *   배열을 순서대로 실행하며 "통과 → 다음 핸들러, 실패 → 중단"하는 체인을 구현한다.
 *   폼 검증은 Chain of Responsibility의 가장 직관적인 Vue 활용 사례다.
 */

import { reactive, ref, computed } from 'vue'

// ─── Handler 타입 ─────────────────────────────────────────────────────────────
interface ValidationResult {
  valid: boolean
  message: string
  handlerName: string
}

interface ValidatorHandler {
  name: string
  label: string  // UI 표시용
  validate: (form: typeof formData) => ValidationResult
}

// ─── 폼 데이터 (검증 대상) ────────────────────────────────────────────────────
const formData = reactive({
  username: '',
  email: '',
  password: '',
  age: '',
})

// ─── ConcreteHandler 배열 ─────────────────────────────────────────────────────
// TypeScript 버전의 GeneralSupportHandler, TechSupportHandler, ManagerHandler를
// Vue에서는 검증 함수 배열로 표현한다. 각 핸들러는 자신이 "처리할 수 있는지" 판단하고 처리한다.

const validators: ValidatorHandler[] = [
  {
    name: 'required',
    label: '1단계: 필수값 검증',
    validate(form) {
      if (!form.username.trim()) return { valid: false, message: '사용자 이름은 필수입니다.', handlerName: '필수값 검증기' }
      if (!form.email.trim()) return { valid: false, message: '이메일은 필수입니다.', handlerName: '필수값 검증기' }
      if (!form.password.trim()) return { valid: false, message: '비밀번호는 필수입니다.', handlerName: '필수값 검증기' }
      return { valid: true, message: '모든 필수값 입력됨', handlerName: '필수값 검증기' }
    },
  },
  {
    name: 'format',
    label: '2단계: 형식 검증',
    validate(form) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.email)) return { valid: false, message: '올바른 이메일 형식이 아닙니다.', handlerName: '형식 검증기' }
      if (form.username.length < 2) return { valid: false, message: '사용자 이름은 2자 이상이어야 합니다.', handlerName: '형식 검증기' }
      return { valid: true, message: '이메일 및 이름 형식 정상', handlerName: '형식 검증기' }
    },
  },
  {
    name: 'strength',
    label: '3단계: 비밀번호 강도 검증',
    validate(form) {
      if (form.password.length < 8) return { valid: false, message: '비밀번호는 8자 이상이어야 합니다.', handlerName: '비밀번호 강도 검증기' }
      if (!/[A-Z]/.test(form.password)) return { valid: false, message: '비밀번호에 대문자가 포함되어야 합니다.', handlerName: '비밀번호 강도 검증기' }
      if (!/[0-9]/.test(form.password)) return { valid: false, message: '비밀번호에 숫자가 포함되어야 합니다.', handlerName: '비밀번호 강도 검증기' }
      return { valid: true, message: '비밀번호 강도 충분', handlerName: '비밀번호 강도 검증기' }
    },
  },
  {
    name: 'age',
    label: '4단계: 나이 검증 (선택)',
    validate(form) {
      // 나이가 입력된 경우에만 검증한다 (선택적 핸들러)
      if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 14 || Number(form.age) > 120)) {
        return { valid: false, message: '나이는 14~120 사이의 숫자여야 합니다.', handlerName: '나이 검증기' }
      }
      return { valid: true, message: '나이 검증 통과 (또는 미입력)', handlerName: '나이 검증기' }
    },
  },
]

// ─── useValidationChain: 체인 실행 composable ─────────────────────────────────
/**
 * 핸들러 배열을 순서대로 실행한다.
 * 각 핸들러는 "통과(valid)"하면 다음 핸들러로, "실패(invalid)"하면 체인을 중단한다.
 * TypeScript 버전의 handle() 메서드(통과/전달/중단 로직)와 동일하다.
 */
function useValidationChain(handlers: ValidatorHandler[]) {
  const chainResults = ref<Array<ValidationResult & { status: 'pass' | 'fail' | 'skip' }>>([])
  const finalResult = ref<'idle' | 'success' | 'fail'>('idle')

  function runChain(form: typeof formData) {
    chainResults.value = []
    finalResult.value = 'idle'

    for (const handler of handlers) {
      const result = handler.validate(form)
      if (!result.valid) {
        // 실패: 이 핸들러에서 체인 중단
        chainResults.value.push({ ...result, status: 'fail' })
        // 나머지 핸들러는 건너뜀 표시
        const remaining = handlers.slice(handlers.indexOf(handler) + 1)
        remaining.forEach(h => chainResults.value.push({ valid: false, message: '이전 단계 실패로 건너뜀', handlerName: h.name + ' 검증기', status: 'skip' }))
        finalResult.value = 'fail'
        return false
      }
      // 통과: 다음 핸들러로 계속
      chainResults.value.push({ ...result, status: 'pass' })
    }

    finalResult.value = 'success'
    return true
  }

  return { chainResults, finalResult, runChain }
}

const chain = useValidationChain(validators)

function submitForm() {
  chain.runChain(formData)
}

// 실시간 검증 (watch 없이 버튼으로 트리거 — 의도적으로 수동 검증)
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Chain of Responsibility 패턴</h1>
    <p style="color: #555;">
      폼 제출 시 검증 핸들러들이 체인으로 연결되어 순서대로 실행된다.
      각 핸들러는 검증에 실패하면 체인을 중단하고, 통과하면 다음 핸들러로 넘긴다.
      클라이언트는 체인의 첫 번째 핸들러에만 요청을 전달한다.
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- 폼 입력 -->
      <div>
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem;">
          <h3 style="margin-top: 0;">회원가입 폼 (Client)</h3>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">사용자 이름 *</label>
            <input v-model="formData.username" placeholder="최소 2자"
              style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" />
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">이메일 *</label>
            <input v-model="formData.email" type="email" placeholder="user@example.com"
              style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" />
          </div>

          <div style="margin-bottom: 0.75rem;">
            <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">비밀번호 * <span style="font-weight:normal;font-size:0.8rem;color:#888;">(8자↑, 대문자+숫자 포함)</span></label>
            <input v-model="formData.password" type="password" placeholder="Password1"
              style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" />
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">나이 (선택)</label>
            <input v-model="formData.age" type="number" placeholder="14~120"
              style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" />
          </div>

          <button @click="submitForm"
            style="width: 100%; padding: 10px; background: #2b6cb0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
            제출 (체인 실행)
          </button>
        </div>
      </div>

      <!-- 체인 실행 결과 시각화 -->
      <div>
        <h3 style="margin-top: 0;">검증 체인 실행 과정</h3>

        <div v-if="chain.finalResult.value === 'idle'" style="color: #888; font-style: italic; font-size: 0.9rem; margin-bottom: 1rem;">
          폼을 작성하고 "제출" 버튼을 눌러 체인 실행을 확인하세요.
        </div>

        <!-- 핸들러별 결과 -->
        <div v-for="(result, i) in chain.chainResults.value" :key="i"
          :style="{
            border: '1px solid',
            borderColor: result.status === 'pass' ? '#9ae6b4' : result.status === 'fail' ? '#fc8181' : '#e2e8f0',
            borderRadius: '6px', padding: '0.75rem', marginBottom: '0.5rem',
            background: result.status === 'pass' ? '#f0fff4' : result.status === 'fail' ? '#fff5f5' : '#f7fafc',
          }">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1rem;">
              {{ result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '○' }}
            </span>
            <span :style="{ fontWeight: 'bold', fontSize: '0.85rem', color: result.status === 'pass' ? '#276749' : result.status === 'fail' ? '#c53030' : '#a0aec0' }">
              {{ validators[i]?.label ?? result.handlerName }}
            </span>
          </div>
          <div style="font-size: 0.8rem; color: #555; padding-left: 1.5rem;">
            {{ result.message }}
          </div>
        </div>

        <!-- 최종 결과 -->
        <div v-if="chain.finalResult.value !== 'idle'"
          :style="{
            padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.5rem',
            background: chain.finalResult.value === 'success' ? '#276749' : '#c53030',
            color: 'white', fontWeight: 'bold', textAlign: 'center',
          }">
          {{ chain.finalResult.value === 'success' ? '✓ 모든 검증 통과! 회원가입 완료' : '✗ 검증 실패 — 체인 중단' }}
        </div>
      </div>
    </div>
  </div>
</template>
