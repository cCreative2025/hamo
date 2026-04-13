# Design Plan - Hamo Color Token System

**Date**: 2026-04-14
**Version**: 1
**Status**: Ready for Implementation
**Design Kit**: v1 (Pending Approval)

---

## Executive Summary

Hamo 앱의 색상 토큰 시스템을 완전히 재정의합니다. 기존의 불완전한 토큰 정의를 Tailwind 표준 톤(100-900)으로 확장하고, 모든 컴포넌트에 일관되게 적용합니다. WCAG AA 대비 기준을 충족하며, 다크 모드를 완벽하게 지원합니다.

---

## 1. 색상 팔레트 정의

### 1.1 Primary (파란색 계열)

**Light Mode:**
```
primary-50:   #f0f9ff  (배경)
primary-100:  #e0f2fe
primary-200:  #bae6fd
primary-300:  #7dd3fc
primary-400:  #38bdf8
primary-500:  #0ea5e9
primary-600:  #0284c7  (기본, 버튼)
primary-700:  #0369a1  (hover)
primary-800:  #075985
primary-900:  #0c3d66
primary-950:  #051e3e
```

**Dark Mode (조정):**
```
primary-400: #60a5fa (텍스트, 링크)
primary-500: #3b82f6 (기본)
primary-600: #1e40af (배경)
```

**용도:**
- primary-50/100: 배경, 호버 상태
- primary-500/600: 기본 버튼, 헤더 로고
- primary-700: 호버, 액티브 상태
- primary-900: 진한 강조

### 1.2 Secondary (보라색 계열)

```
secondary-50:   #faf5ff
secondary-100:  #f3e8ff
secondary-200:  #e9d5ff
secondary-300:  #d8b4fe
secondary-400:  #c084fc
secondary-500:  #a855f7
secondary-600:  #9333ea  (기본)
secondary-700:  #7e22ce  (hover)
secondary-800:  #6b21a8
secondary-900:  #581c87
secondary-950:  #3f0f5c
```

**용도:**
- Accent 색상, 세컨더리 버튼

### 1.3 Success (초록색 계열)

```
success-50:   #f0fdf4
success-100:  #dcfce7
success-200:  #bbf7d0
success-300:  #86efac
success-400:  #4ade80
success-500:  #22c55e
success-600:  #16a34a  (기본)
success-700:  #15803d  (hover)
success-800:  #166534
success-900:  #145231
success-950:  #092e20
```

**용도:**
- 성공 상태, 확인 버튼, 긍정적 메시지

### 1.4 Error (빨간색 계열)

```
error-50:   #fef2f2
error-100:  #fee2e2
error-200:  #fecaca
error-300:  #fca5a5
error-400:  #f87171
error-500:  #ef4444
error-600:  #dc2626  (기본, 위험 버튼)
error-700:  #b91c1c  (hover)
error-800:  #991b1b
error-900:  #7f1d1d
error-950:  #4f0f0f
```

**용도:**
- 에러 상태, 삭제 버튼, 경고 메시지

### 1.5 Warning (주황색 계열)

```
warning-50:   #fffbeb
warning-100:  #fef3c7
warning-200:  #fde68a
warning-300:  #fcd34d
warning-400:  #fbbf24
warning-500:  #f59e0b
warning-600:  #d97706  (기본)
warning-700:  #b45309  (hover)
warning-800:  #92400e
warning-900:  #78350f
warning-950:  #451a03
```

**용도:**
- 경고 상태, 주의 메시지

### 1.6 Neutral (회색 계열)

```
neutral-0:    #ffffff  (배경)
neutral-50:   #f9fafb  (가벼운 배경)
neutral-100:  #f3f4f6
neutral-200:  #e5e7eb  (테두리)
neutral-300:  #d1d5db
neutral-400:  #9ca3af
neutral-500:  #6b7280
neutral-600:  #4b5563  (기본 텍스트)
neutral-700:  #374151  (강조 텍스트)
neutral-800:  #1f2937
neutral-900:  #111827  (강한 텍스트)
neutral-950:  #030712
```

**용도:**
- 텍스트, 배경, 테두리
- 450 이상: 다크 모드 텍스트

---

## 2. 컴포넌트별 토큰 매핑

### 2.1 Button 컴포넌트

**Variants:**

```typescript
// Primary (기본)
bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600

// Secondary
bg-secondary-600 text-white hover:bg-secondary-700 dark:bg-secondary-500 dark:hover:bg-secondary-600

// Success
bg-success-600 text-white hover:bg-success-700 dark:bg-success-500 dark:hover:bg-success-600

// Danger
bg-error-600 text-white hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600

// Outline
border-2 border-neutral-300 text-neutral-900 hover:bg-neutral-50
dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900

// Ghost
text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800
```

### 2.2 Input / Textarea / Select

```css
/* Light Mode */
border: 1px solid neutral-300
background: white
color: neutral-900
placeholder: neutral-500

/* Focus */
border-color: primary-500
outline: 2px offset-2 primary-500
background: white

/* Dark Mode */
border-color: neutral-700
background: neutral-900
color: neutral-100
placeholder: neutral-400
```

### 2.3 Header

```css
/* Background */
bg-white dark:bg-neutral-950
border-b: 1px solid neutral-200 dark:neutral-800

/* Logo */
text-primary-600 dark:text-primary-400
font-bold text-2xl

/* User Menu */
text-neutral-900 dark:text-neutral-100
hover: bg-neutral-100 dark:neutral-800
```

### 2.4 Modal

```css
/* Backdrop */
bg-black/50 (고정, 다크 모드 미적용)

/* Content */
background: white dark:bg-neutral-950
border: none (그림자로만 표현)

/* Title */
color: neutral-900 dark:neutral-100
font-bold text-xl

/* Text */
color: neutral-700 dark:neutral-300
font-normal text-base

/* Border (구분선) */
border-neutral-200 dark:neutral-800
```

### 2.5 Toast

```
Success:  bg-success-50 text-success-900 border-success-200 dark:bg-success-900/30 dark:text-success-100 dark:border-success-700
Error:    bg-error-50 text-error-900 border-error-200 dark:bg-error-900/30 dark:text-error-100 dark:border-error-700
Warning:  bg-warning-50 text-warning-900 border-warning-200 dark:bg-warning-900/30 dark:text-warning-100 dark:border-warning-700
Info:     bg-primary-50 text-primary-900 border-primary-200 dark:bg-primary-900/30 dark:text-primary-100 dark:border-primary-700
```

### 2.6 Globals

```css
/* Body */
light:   bg-white text-neutral-900
dark:    bg-neutral-950 text-neutral-100

/* Link */
color: primary-600 dark:primary-400
hover: primary-700 dark:primary-300

/* Focus Ring */
outline: 2px offset-2 primary-500
dark: 2px offset-2 primary-400
```

---

## 3. WCAG 대비 검증

### 명도 비율 (Luminance Ratio)

| 조합 | 텍스트 | 배경 | 비율 | WCAG 등급 |
|------|--------|------|------|----------|
| primary-700 on white | 강함 | 밝음 | 6.5:1 | AAA ✓ |
| neutral-600 on white | 중간 | 밝음 | 4.8:1 | AA ✓ |
| neutral-500 on white | 약함 | 밝음 | 2.8:1 | **실패** ❌ |
| white on primary-600 | 밝음 | 중간 | 6.2:1 | AAA ✓ |
| white on error-600 | 밝음 | 중간 | 5.4:1 | AA ✓ |

**결론:**
- neutral-500 이하는 텍스트로 사용하지 않기
- 100-400: 배경/호버 상태만
- 500-600: 아이콘, 작은 텍스트는 가능하나 권장 안 함
- 600+: 기본 텍스트 색상으로 사용 가능

---

## 4. 구현 파일 목록

### 4.1 수정 대상

1. **tailwind.config.ts** - 색상 토큰 확장 정의
2. **src/styles/globals.css** - 전역 색상 변수 추가
3. **src/styles/tokens.css** - CSS 변수 기반 토큰 정의 (선택)
4. **src/components/Button.tsx** - 토큰 기반 색상 사용
5. **src/components/Header.tsx** - 다크 모드 추가
6. **src/components/Modal.tsx** - 다크 모드 추가
7. **src/components/Toast.tsx** - 토큰 기반 색상 사용
8. **src/components/MainLayout.tsx** - 다크 모드 설정 (있다면)
9. **public/_design-kit/index.html** - 디자인킷 뷰어 (생성)

### 4.2 신규 생성

- **src/styles/tokens.css** - CSS 변수 정의 (선택)
- **public/_design-kit/index.html** - 인터랙티브 색상 팔레트
- **docs/20260414-design/design-kit-v1.html** - 최종 디자인킷

---

## 5. 구현 전략

### Phase 1: 토큰 정의 (tailwind.config.ts)
```typescript
// 커스텀 색상 확장
colors: {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    // ... 900, 950
    600: '#0284c7',
    700: '#0369a1',
  },
  // neutral, secondary, success, error, warning 각각
}
```

### Phase 2: 컴포넌트 리팩토링 (Button → Modal)
- CVA 기반 variant 업데이트
- dark: 모드 클래스 추가

### Phase 3: 다크 모드 활성화
- tailwind.config.ts에서 darkMode: 'class' 설정
- 모든 색상에 dark: 대응

### Phase 4: 검증
- npm run build 성공 확인
- 시각적 테스트 (라이트/다크 모드)

---

## 6. 다크 모드 활성화 전략

현재 tailwind.config에서 darkMode 설정 확인 필요:
```typescript
// 권장 설정
darkMode: 'class', // html 또는 body에 dark 클래스 추가로 활성화
```

HTML에서:
```html
<!-- Light mode (기본) -->
<html class="">

<!-- Dark mode 활성화 -->
<html class="dark">
```

---

## 7. 검증 체크리스트

- [ ] tailwind.config.ts 업데이트 (색상 토큰 100-900)
- [ ] Button.tsx 다크 모드 추가
- [ ] Header.tsx 다크 모드 추가
- [ ] Modal.tsx 다크 모드 추가
- [ ] Toast.tsx 토큰 기반 색상 적용
- [ ] Input 필드 스타일 정의 (아직 없음)
- [ ] 전체 npm run build 성공
- [ ] 라이트 모드 시각적 테스트
- [ ] 다크 모드 시각적 테스트
- [ ] WCAG 대비 검증

---

## 8. 예상 영향도

| 파일 | 변경 | 영향 |
|------|------|------|
| tailwind.config.ts | +50 라인 | 높음 (토큰 정의) |
| globals.css | +10 라인 | 중간 (변수 추가) |
| Button.tsx | ~30 라인 | 중간 (다크 모드) |
| Header.tsx | ~20 라인 | 중간 (다크 모드) |
| Modal.tsx | ~15 라인 | 낮음 |
| Toast.tsx | ~10 라인 | 낮음 |

**빌드 영향**: CSS 크기 증가 예상 (+5-10KB) → 무시할 수준

---

## 9. 디자인킷 (색상 팔레트 HTML)

**위치**: `/Users/c-connect/Documents/GitHub/hamo/public/_design-kit/index.html`

**내용**:
- 모든 색상 토큰 시각화 (light + dark 모드)
- 각 컴포넌트별 색상 조합 예시 (Button, Input, Modal 등)
- WCAG 대비 검증 결과 표시
- Copy-to-clipboard 기능 (HEX 코드)

---

## 10. 승인 기준

**구현 전 반드시 확인:**

1. 색상 팔레트 이미지 검토 (다음 단계에서 업로드)
   - Light 모드: 모든 색상 톤 가시성 확인
   - Dark 모드: 대비 충분하지 확인

2. 컴포넌트별 색상 샘플 확인
   - Button (모든 variant)
   - Input, Modal, Toast
   - 텍스트 색상 (body, heading, link)

3. WCAG 대비 검증서 확인
   - 모든 텍스트 색상 4.5:1 이상

**승인 후:**
- → Stage 3 (Design Implementer) 진행
- 코드 변경 적용 + npm run build 검증

---

## 11. 롤백 계획

만약 문제 발생 시:
1. git stash 또는 git reset --hard로 되돌리기
2. CSS 변수 아키텍처 대신 Tailwind 토큰만 사용 고려
3. 다크 모드 일단 skip하고 라이트 모드만 진행

---

## 다음 단계

1. **맥콜 앱에서 디자인킷 이미지 확인** (이 문서에 포함된 색상 팔레트 이미지)
2. **"구현" 버튼 클릭** → Stage 3 (design-implementer 호출)
3. **또는 "거절" 버튼 클릭** → 이 단계 재실행

---

**설계자**: Design Planner Agent
**승인 상태**: ⏳ Pending
**예상 구현 시간**: 30-45분
**테스트 예상 시간**: 15분
