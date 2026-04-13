# Design Inspection Report - Hamo

**Date**: 2026-04-14
**App**: Hamo (악보 협업 PWA)
**Focus**: 디자인 토큰 전체 점검 — 하얀 배경에 하얀 글씨 문제 해결, 모든 input/button/텍스트 색상 토큰 수정

---

## 1. 현재 디자인 시스템 분석

### 1.1 색상 토큰 현황

**tailwind.config.ts에 정의된 커스텀 색상:**
```typescript
colors: {
  primary: '#2563eb',      // 파란색 (단일값)
  secondary: '#7c3aed',    // 보라색 (단일값)
  success: '#10b981',      // 초록색 (단일값)
  error: '#ef4444',        // 빨간색 (단일값)
  warning: '#f59e0b',      // 주황색 (단일값)
}
```

**문제점:**
- 각 색상이 단일 값만 정의됨 (예: primary는 #2563eb 하나뿐)
- Tailwind 표준 톤(100-900)이 없음 → `primary-600`, `primary-700` 등의 참조 불가능
- Button.tsx, Header.tsx 등에서 `primary-600`, `neutral-200`, `neutral-900` 등을 사용하지만 tailwind.config에 정의되지 않음 (현재는 Tailwind 기본 색상으로 폴백)

### 1.2 컴포넌트별 색상 사용 현황

**Button.tsx:**
```
primary: 'bg-primary-600 text-white'           ❌ primary-600 미정의
secondary: 'bg-neutral-200 text-neutral-900'  ⚠️  Tailwind 기본값 사용
outline: 'border-2 border-neutral-300'        ⚠️  Tailwind 기본값 사용
danger: 'bg-red-600 text-white'               ⚠️  Tailwind 기본값 사용
```

**Header.tsx:**
- Logo: `text-primary-600` ❌ 미정의
- Avatar: `bg-primary-100 text-primary-600` ❌ 미정의
- 텍스트: `text-neutral-900`, `text-neutral-500` ⚠️ 기본값 사용

**Modal.tsx:**
- 제목: `text-neutral-900` ⚠️ 기본값 사용
- 테두리: `border-neutral-200` ⚠️ 기본값 사용

**Toast.tsx:**
- success: `bg-green-50 text-green-900` ⚠️ 기본값 사용
- error: `bg-red-50 text-red-900` ⚠️ 기본값 사용
- warning: `bg-yellow-50 text-yellow-900` ⚠️ 기본값 사용

**globals.css:**
- Body: `bg-white text-gray-900` ✓ 정상
- scrollbar: `bg-gray-100`, `bg-gray-400` ⚠️ gray 사용

### 1.3 발견된 주요 문제

#### A. 하얀 배경에 하얀 글씨 문제 없음 (현재)
- `globals.css`에서 `body`는 `bg-white text-gray-900`으로 적절한 대비
- 모든 텍스트는 어두운 색상(neutral-900, gray-900, red-900 등)으로 정의
- **대비 문제 없음** (흰 글씨 사용 안 함)

#### B. 색상 토큰 미정의 문제 (심각)
- `primary-600`, `primary-700`, `primary-100` 등이 tailwind.config에서 정의되지 않음
- Button, Header 컴포넌트에서 이들을 참조하나 현재는 브라우저 기본 색상으로 렌더링될 가능성
- 일관된 디자인 시스템 부재 → 유지보수 어려움

#### C. 색상 토큰 일관성 부재
- 여러 색상 팔레트 혼용 (gray, neutral, red, green, yellow, blue, purple 등)
- 커스텀 색상(primary, secondary 등)과 Tailwind 기본 색상이 섞여 있음
- Input/Button/텍스트 색상이 정의되지 않음

#### D. 다크 모드 고려 부족
- `globals.css`에 dark 모드 기본 설정 있음: `dark:bg-gray-950 dark:text-gray-50`
- 하지만 컴포넌트들(Button, Header, Modal)에는 dark 모드 클래스 없음
- 다크 모드 활성화 시 색상 대비 문제 발생 가능

---

## 2. 설계 요구사항

### 사용자 요청 분석

**요청**: "디자인 토큰 전체 점검 — 하얀 배경에 하얀 글씨 문제 해결, 모든 input/button/텍스트 색상 토큰 수정"

- ✓ 색상 토큰 전체 정의 필요
- ✓ 버튼/입력 필드 색상 토큰 수정
- ✓ 텍스트 색상 토큰 수정
- ✓ 명도 대비 검증 필요

### 목표
1. **색상 토큰 완전 정의**: primary, secondary, success, error, warning, neutral 각각 100-900 톤
2. **컴포넌트 색상 통일**: Button, Input, Text 모두 토큰 기반으로 변경
3. **WCAG AA 대비 기준 충족**: 텍스트와 배경의 명도 비율 4.5:1 이상
4. **다크 모드 지원**: 모든 색상에 dark: 대응

---

## 3. 현재 상태 요약

| 항목 | 상태 | 심각도 |
|------|------|--------|
| 색상 토큰 정의 | 불완전 (기본값만) | 🔴 높음 |
| 버튼 색상 | primary-600 등 미정의 | 🔴 높음 |
| 텍스트 색상 | 혼재 (gray, neutral 등) | 🟡 중간 |
| 입력 필드 색상 | 정의 없음 | 🔴 높음 |
| 다크 모드 | 기본만 있고 컴포넌트 미반영 | 🟡 중간 |
| 대비 문제 | 없음 (현재 적절함) | ✓ 정상 |

---

## 4. 개선 계획 방향

1. **tailwind.config.ts 개선**
   - primary, secondary, success, error, warning, neutral 각 100-900 톤 정의
   - 또는 CSS 변수(--color-primary-600 등) 도입

2. **토큰 기반 리팩토링**
   - Button, Input, Modal 등 모든 컴포넌트 색상을 토큰 참조로 변경
   - CVA(Class Variance Authority)와 일관성 유지

3. **다크 모드 완성**
   - 모든 색상에 dark: 모드 추가
   - 다크 모드 시 색상 톤 조정 (예: primary-600 → primary-400)

4. **WCAG 대비 검증**
   - 모든 텍스트/배경 조합에 대해 4.5:1 이상 명도 비율 확인

---

## 5. 다음 단계

→ **Design Planner** 호출하여:
- 상세 색상 팔레트 정의 (120+ 토큰)
- 토큰 적용 전략 제시
- 디자인킷 HTML + tokens.css 생성
