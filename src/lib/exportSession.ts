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

// ── 경로 그리기 ─────────────────────────────────────────────────────────────────
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
    ctx.lineWidth = path.width;
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

// ── 악보(이미지/PDF) + 레이어 → Canvas 배열 ─────────────────────────────────────
async function renderSheetWithLayers(
  url: string,
  fileType: string,
  paths: DrawPath[]
): Promise<HTMLCanvasElement[]> {
  const SCALE = 2;
  const canvases: HTMLCanvasElement[] = [];

  if (fileType === 'pdf') {
    const pdf = await pdfjs.getDocument(url).promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx as any, viewport }).promise;

      if (paths.length > 0) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = canvas.width;
        layerCanvas.height = canvas.height;
        renderPathsOnCtx(layerCanvas.getContext('2d')!, paths, canvas.width, canvas.height);
        ctx.drawImage(layerCanvas, 0, 0);
      }
      canvases.push(canvas);
    }
  } else {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth * SCALE;
    canvas.height = img.naturalHeight * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (paths.length > 0) {
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = canvas.width;
      layerCanvas.height = canvas.height;
      renderPathsOnCtx(layerCanvas.getContext('2d')!, paths, canvas.width, canvas.height);
      ctx.drawImage(layerCanvas, 0, 0);
    }
    canvases.push(canvas);
  }

  return canvases;
}

// ── 송폼 텍스트 추출 ─────────────────────────────────────────────────────────────
function getSongFormMeta(item: SessionItem) {
  const form = item.song_form;
  const title = form?.name || item.sheet?.title || '(제목 없음)';
  const key = form?.key || '';
  const tempo = item.tempo_override
    ? `♩${item.tempo_override}`
    : form?.tempo
    ? `♩${form.tempo}`
    : '';

  const sections = ((form?.sections ?? []) as SongSection[]);
  const flow = normalizeFlow(form?.flow as any)
    .map((f) => {
      const label = getSectionLabel(sections, f.id);
      return label ? (f.repeat && f.repeat > 1 ? `${label}×${f.repeat}` : label) : null;
    })
    .filter(Boolean)
    .join(' - ');

  return { title, key, tempo, flow };
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
  const HEADER_H = 18;

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
      const canvases = await renderSheetWithLayers(url, latest.file_type, mergedPaths);
      const meta = getSongFormMeta(item);

      for (const canvas of canvases) {
        if (!isFirst) pdf.addPage();
        isFirst = false;

        // 송폼 헤더
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(meta.title, MARGIN, 8);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const metaLine = [meta.key, meta.tempo].filter(Boolean).join('  ');
        if (metaLine) pdf.text(metaLine, MARGIN, 13);
        if (meta.flow) pdf.text(meta.flow, MARGIN, 17);

        // 악보 이미지
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const aspect = canvas.height / canvas.width;
        const imgW = PAGE_W - MARGIN * 2;
        const imgH = Math.min(imgW * aspect, PAGE_H - HEADER_H - MARGIN);
        pdf.addImage(imgData, 'JPEG', MARGIN, HEADER_H, imgW, imgH);
      }
    } catch (e) {
      console.error('[export] item failed:', item.id, e);
    }
  }

  pdf.save(`${sessionName || '세션'}-export.pdf`);
}
