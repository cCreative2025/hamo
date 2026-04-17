import * as pdfjs from 'pdfjs-dist';
import { getSignedUrl } from './signedUrlCache';
import { getSectionLabel } from '@/components/SongFormBuilder';
import { normalizeFlow, SongSection, SessionItem } from '@/types';
import type { SessionLayer } from '@/stores/sessionPlayerStore';
import type { DrawPath } from '@/components/DrawingCanvas';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const SCALE = 2;
const HEADER_CSS_H = 44; // 화면 SongFormBar 높이(px 기준)

// ── 헬퍼: 둥근 사각형 ────────────────────────────────────────────────────────────
function ctxRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

const SECTION_BG: Record<string, string> = {
  I: '#525252', V: '#1d4ed8', PC: '#a16207',
  C: '#7e22ce', B: '#15803d', O: '#737373',
};
function getSectionBg(type: string) { return SECTION_BG[type] ?? '#6d28d9'; }

// ── 송폼 메타 추출 ────────────────────────────────────────────────────────────────
function getSongFormMeta(item: SessionItem) {
  const form = item.song_form;
  const title = form?.name || item.sheet?.title || '(제목 없음)';
  const key = form?.key || '';
  const tempo = item.tempo_override
    ? `♩${item.tempo_override}`
    : form?.tempo ? `♩${form.tempo}` : '';

  const sections = ((form?.sections ?? []) as SongSection[]);
  const flowItems = normalizeFlow(form?.flow as any)
    .map((f) => {
      const section = sections.find((s) => s.id === f.id);
      if (!section) return null;
      const label = getSectionLabel(sections, f.id);
      return label ? { label, type: section.type, repeat: f.repeat ?? 1 } : null;
    })
    .filter(Boolean) as { label: string; type: string; repeat: number }[];

  return { title, key, tempo, flowItems };
}

// ── 송폼바 헤더 Canvas 렌더링 ────────────────────────────────────────────────────
// 화면의 SongFormBar(까만 배경 + 템포/키/곡진행 배지)를 Canvas로 그림 — 한글 정상 출력
function renderHeaderCanvas(
  meta: ReturnType<typeof getSongFormMeta>,
  canvasW: number,
): HTMLCanvasElement {
  const S = SCALE;
  const H = HEADER_CSS_H * S;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 배경
  ctx.fillStyle = '#171717';
  ctx.fillRect(0, 0, canvasW, H);

  const fs = 12 * S;
  const pad = 10 * S;
  const bpx = 6 * S;
  const bpy = 3 * S;
  const r = 4 * S;
  const gap = 5 * S;
  const midY = H / 2;
  const FONT = `-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", BlinkMacSystemFont, sans-serif`;

  ctx.textBaseline = 'middle';
  let x = pad;

  // ── 템포 배지 (주황) ─────────────────────────────────────────────────────────
  if (meta.tempo) {
    ctx.font = `bold ${fs}px ${FONT}`;
    const tw = ctx.measureText(meta.tempo).width;
    const bw = tw + bpx * 2;
    const bh = fs + bpy * 2;
    ctx.fillStyle = '#c2410c';
    ctxRoundRect(ctx, x, midY - bh / 2, bw, bh, r);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(meta.tempo, x + bpx, midY);
    x += bw + gap;
    ctx.fillStyle = '#3f3f3f';
    ctx.fillRect(x, midY - 8 * S, S, 16 * S);
    x += gap + S;
  }

  // ── 키 (파랑) ────────────────────────────────────────────────────────────────
  if (meta.key) {
    ctx.font = `bold ${fs}px ${FONT}`;
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(meta.key, x, midY);
    x += ctx.measureText(meta.key).width + gap;
    ctx.fillStyle = '#3f3f3f';
    ctx.fillRect(x, midY - 8 * S, S, 16 * S);
    x += gap + S;
  }

  // ── 곡 제목 (흰색 굵게) ──────────────────────────────────────────────────────
  ctx.font = `bold ${fs}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(meta.title, x, midY);
  x += ctx.measureText(meta.title).width + gap * 2;

  // ── 곡진행 배지 ──────────────────────────────────────────────────────────────
  for (let i = 0; i < meta.flowItems.length; i++) {
    const { label, type, repeat } = meta.flowItems[i];
    const badgeText = repeat > 1 ? `${label}×${repeat}` : label;
    const bfs = 11 * S;
    ctx.font = `bold ${bfs}px ${FONT}`;
    const tw = ctx.measureText(badgeText).width;
    const bw = tw + bpx * 2;
    const bh = bfs + bpy * 2;

    if (x + bw > canvasW - pad) break; // 넘치면 생략

    ctx.fillStyle = getSectionBg(type);
    ctxRoundRect(ctx, x, midY - bh / 2, bw, bh, r - S);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, x + bpx, midY);
    x += bw + Math.round(3 * S);

    if (i < meta.flowItems.length - 1) {
      ctx.font = `${10 * S}px ${FONT}`;
      ctx.fillStyle = '#525252';
      ctx.fillText('—', x, midY);
      x += ctx.measureText('—').width + Math.round(3 * S);
    }
  }

  return canvas;
}

// ── 헤더 + 악보 Canvas 합성 ──────────────────────────────────────────────────────
function combineCanvases(header: HTMLCanvasElement, sheet: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sheet.width;
  canvas.height = header.height + sheet.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(header, 0, 0);
  ctx.drawImage(sheet, 0, header.height);
  return canvas;
}

// ── 경로 그리기 (export용 — width를 SCALE에 맞게 스케일링) ───────────────────────
function renderPathsOnCtx(
  ctx: CanvasRenderingContext2D,
  paths: DrawPath[],
  w: number,
  h: number
) {
  for (const path of paths) {
    if (path.points.length < 2) continue;
    ctx.save();
    ctx.globalCompositeOperation =
      path.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = path.tool === 'eraser' ? 'rgba(0,0,0,1)' : path.color;
    ctx.lineWidth = path.width * SCALE; // 화면 1px → export SCALE px
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path.points[0].x * w, path.points[0].y * h);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x * w, path.points[i].y * h);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── 이미지 로드 ──────────────────────────────────────────────────────────────────
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// ── 악보(이미지/PDF) + 레이어 + 헤더 → Canvas 배열 ─────────────────────────────
async function renderSheetWithLayers(
  url: string,
  fileType: string,
  paths: DrawPath[],
  meta: ReturnType<typeof getSongFormMeta>,
): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = [];

  if (fileType === 'pdf') {
    const pdf = await pdfjs.getDocument(url).promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: SCALE });

      const sheetCanvas = document.createElement('canvas');
      sheetCanvas.width = viewport.width;
      sheetCanvas.height = viewport.height;
      const ctx = sheetCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
      await page.render({ canvasContext: ctx as any, viewport }).promise;

      if (paths.length > 0) {
        renderPathsOnCtx(ctx, paths, sheetCanvas.width, sheetCanvas.height);
      }

      const header = renderHeaderCanvas(meta, sheetCanvas.width);
      canvases.push(combineCanvases(header, sheetCanvas));
    }
  } else {
    const img = await loadImage(url);
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = img.naturalWidth * SCALE;
    sheetCanvas.height = img.naturalHeight * SCALE;
    const ctx = sheetCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
    ctx.drawImage(img, 0, 0, sheetCanvas.width, sheetCanvas.height);

    if (paths.length > 0) {
      renderPathsOnCtx(ctx, paths, sheetCanvas.width, sheetCanvas.height);
    }

    const header = renderHeaderCanvas(meta, sheetCanvas.width);
    canvases.push(combineCanvases(header, sheetCanvas));
  }

  return canvases;
}

// ── 메인 export 함수 ─────────────────────────────────────────────────────────────
export interface ExportOptions {
  items: SessionItem[];
  layers: SessionLayer[];
  visibleLayers: Record<string, boolean>;
  showBase: boolean;
  sessionName: string;
}

export async function exportSessionAsPDF(options: ExportOptions): Promise<void> {
  const { items, layers, visibleLayers, showBase, sessionName } = options;

  const { default: jsPDF } = await import('jspdf');

  const songItems = items.filter((item) => item.type === 'song');
  if (songItems.length === 0) return;

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 6;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let isFirst = true;

  for (const item of songItems) {
    const versions = ((item.sheet?.sheet_versions ?? []) as any[])
      .slice()
      .sort((a, b) => b.version_number - a.version_number);
    const latest = versions[0];
    if (!latest?.file_path) continue;

    // 보이는 레이어 경로 수집
    const mergedPaths: DrawPath[] = [];

    if (showBase && item.song_form?.drawing_data) {
      mergedPaths.push(...(item.song_form.drawing_data as DrawPath[]));
    }

    const itemLayers = layers.filter(
      (l) =>
        l.session_song_id === item.id ||
        (item.song_form_id && l.song_form_id === item.song_form_id)
    );
    for (const layer of itemLayers) {
      if (visibleLayers[layer.id] === false) continue;
      mergedPaths.push(...((layer.drawing_data as DrawPath[]) ?? []));
    }

    try {
      const url = await getSignedUrl(latest.file_path);
      const meta = getSongFormMeta(item);
      const canvases = await renderSheetWithLayers(url, latest.file_type, mergedPaths, meta);

      for (const canvas of canvases) {
        if (!isFirst) pdf.addPage();
        isFirst = false;

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const aspect = canvas.height / canvas.width;
        const imgW = PAGE_W - MARGIN * 2;
        const imgH = Math.min(imgW * aspect, PAGE_H - MARGIN * 2);
        pdf.addImage(imgData, 'JPEG', MARGIN, MARGIN, imgW, imgH);
      }
    } catch (e) {
      console.error('[export] item failed:', item.id, e);
    }
  }

  pdf.save(`${sessionName || '세션'}-export.pdf`);
}
