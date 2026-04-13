import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 숫자를 템포 포맷으로 변환 (BPM)
 */
export function formatTempo(bpm: number): string {
  return `${bpm} BPM`;
}

/**
 * 시간을 MM:SS 포맷으로 변환
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 파일 크기를 읽기 좋은 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 날짜를 읽기 좋은 형식으로 변환
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 상대적 시간 표시 (예: "2시간 전")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return formatDate(d);
}

/**
 * 문자열을 UUID 형식으로 검증
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 임의의 게스트 코드 생성 (6자리 영숫자)
 */
export function generateGuestCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 한글 초성 추출 (ㄱ,ㄴ,ㄷ,ㄹ... / 영문 A-Z / 숫자·기타 = #)
 */
const KOREAN_INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
export function getKoreanInitial(text: string): string {
  if (!text) return '#';
  const code = text.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return KOREAN_INITIALS[Math.floor((code - 0xAC00) / 588)];
  }
  if (code >= 65 && code <= 90) return text[0].toUpperCase();
  if (code >= 97 && code <= 122) return text[0].toUpperCase();
  return '#';
}

/**
 * 색상 객체를 CSS 스타일로 변환
 */
export function rgbToCss(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Konva.js Stage를 이미지로 내보내기
 */
export async function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  fileName: string
): Promise<void> {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${fileName}-${Date.now()}.png`;
  link.click();
}
