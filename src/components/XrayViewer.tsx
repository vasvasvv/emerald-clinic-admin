import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

interface XrayViewerFile {
  id: string;
  /** URL або шлях до файлу — передається в api.getProtectedImageBlob */
  url: string;
  /** Підпис під знімком */
  label?: string;
}

interface XrayViewerProps {
  files: XrayViewerFile[];
  /** Індекс початкового знімка */
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Fullscreen viewer рентген-знімків.
 * — Клавіші: Esc = закрити, ← → = навігація, +/- = зум, 0 = скинути зум
 * — Touch: pinch-to-zoom, свайп ← → для навігації
 * — Максимальна якість: завантажує originalUrl якщо є, інакше previewUrl
 */
export function XrayViewer({ files, initialIndex = 0, onClose }: XrayViewerProps) {
  const [index, setIndex] = useState(Math.min(initialIndex, files.length - 1));
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const prevBlobUrl = useRef<string | null>(null);

  const file = files[index];

  // Завантажуємо зображення при зміні файлу
  useEffect(() => {
    if (!file) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });

      try {
        const token = getAdminToken();
        if (!token) return;
        const blob = await api.getProtectedImageBlob(token, file.url);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = url;
        setBlobUrl(url);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === '0') resetZoom();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const prev = () => {
    if (files.length < 2) return;
    setIndex((i) => (i - 1 + files.length) % files.length);
  };

  const next = () => {
    if (files.length < 2) return;
    setIndex((i) => (i + 1) % files.length);
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 8));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.min(Math.max(z + delta, 0.25), 8));
  };

  // Touch pinch-to-zoom + swipe
  const touchDist = (touches: React.TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const swipeStart = useRef<{ x: number; time: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: touchDist(e.touches), zoom };
      swipeStart.current = null;
    } else if (e.touches.length === 1) {
      swipeStart.current = { x: e.touches[0].clientX, time: Date.now() };
      if (zoom > 1) {
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          ox: offset.x,
          oy: offset.y,
        };
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const newDist = touchDist(e.touches);
      const ratio = newDist / pinchStart.current.dist;
      setZoom(Math.min(Math.max(pinchStart.current.zoom * ratio, 0.25), 8));
    } else if (e.touches.length === 1 && zoom > 1 && dragStart.current) {
      setOffset({
        x: dragStart.current.ox + (e.touches[0].clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.touches[0].clientY - dragStart.current.y),
      });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinchStart.current) {
      pinchStart.current = null;
      return;
    }
    if (swipeStart.current && zoom <= 1 && files.length > 1) {
      const dx = e.changedTouches[0].clientX - swipeStart.current.x;
      const dt = Date.now() - swipeStart.current.time;
      if (Math.abs(dx) > 60 && dt < 400) {
        if (dx < 0) next();
        else prev();
      }
    }
    dragStart.current = null;
    swipeStart.current = null;
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" style={{ touchAction: 'none' }}>
      {/* ── TOP BAR ── */}
      <div className="relative z-10 flex items-center justify-between gap-3 bg-black/80 px-4 py-3 backdrop-blur-sm">
        {/* Підпис */}
        <div className="min-w-0">
          {file.label && <p className="truncate text-sm font-medium text-white">{file.label}</p>}
          {files.length > 1 && (
            <p className="text-xs text-white/50">
              {index + 1} / {files.length}
            </p>
          )}
        </div>

        {/* Зум контролі */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Зменшити (−)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="flex h-8 min-w-[44px] items-center justify-center rounded-lg px-2 text-xs font-mono text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Скинути зум (0)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Збільшити (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Скинути (0)"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Закрити */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          title="Закрити (Esc)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── IMAGE AREA ── */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm text-white/40">Завантаження...</p>
          </div>
        ) : blobUrl ? (
          <img
            ref={imgRef}
            src={blobUrl}
            alt={file.label ?? 'Рентген-знімок'}
            draggable={false}
            className="max-h-full max-w-full select-none"
            style={{
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease',
              imageRendering: zoom >= 2 ? 'pixelated' : 'auto',
            }}
          />
        ) : (
          <p className="text-sm text-white/40">Не вдалося завантажити знімок</p>
        )}

        {/* Навігаційні стрілки */}
        {files.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* ── THUMBNAIL STRIP (якщо кілька знімків) ── */}
      {files.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto bg-black/80 px-4 py-2 backdrop-blur-sm">
          {files.map((f, i) => (
            <ThumbnailItem key={f.id} file={f} active={i === index} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThumbnailItem({ file, active, onClick }: { file: XrayViewerFile; active: boolean; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const load = async () => {
      try {
        const token = getAdminToken();
        if (!token) return;
        const blob = await api.getProtectedImageBlob(token, file.url);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        /* ignore */
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.url]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 w-12 flex-none overflow-hidden rounded-lg border-2 transition-all ${
        active ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
      }`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="h-full w-full bg-white/10" />
      )}
    </button>
  );
}

export type { XrayViewerFile };
