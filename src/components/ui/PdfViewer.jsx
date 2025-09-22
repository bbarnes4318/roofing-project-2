import React, { useEffect, useRef, useState, useCallback } from 'react';

// Load pdfjs from CDN to avoid bundler dependency issues
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await loadScript('https://unpkg.com/pdfjs-dist@4.7.76/legacy/build/pdf.min.js');
  await loadScript('https://unpkg.com/pdfjs-dist@4.7.76/legacy/build/pdf.worker.min.js');
  if (window.pdfjsLib) {
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.7.76/legacy/build/pdf.worker.min.js';
    } catch (_) {}
    return window.pdfjsLib;
  }
  throw new Error('Failed to load pdfjs');
}

export default function PdfViewer({ url, className = '' }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const pdfjsLib = await ensurePdfJs();
        const task = pdfjsLib.getDocument({
          url,
          withCredentials: false,
          disableRange: true,
          disableStream: true,
          disableAutoFetch: true
        });
        const doc = await task.promise;
        if (cancelled) return;
        setPdf(doc);
        setPageCount(doc.numPages);
        setPageNumber(1);
      } catch (e) {
        console.error('PDF load error:', e);
        if (!cancelled) setError('Failed to load PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (url) load();
    return () => { cancelled = true; };
  }, [url]);

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return;
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = { canvasContext: ctx, viewport };
      await page.render(renderContext).promise;
    } catch (e) {
      console.error('PDF render error:', e);
    }
  }, [pdf, pageNumber, scale]);

  useEffect(() => { renderPage(); }, [renderPage]);

  const canPrev = pageNumber > 1;
  const canNext = pageNumber < pageCount;

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      <div className="flex items-center gap-2 p-2 border-b bg-white">
        <button
          className={`px-2 py-1 border rounded ${!canPrev ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canPrev}
          onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
          title="Previous page"
        >
          ◀
        </button>
        <div className="text-sm">Page</div>
        <input
          type="number"
          min={1}
          max={pageCount || 1}
          value={pageNumber}
          onChange={(e) => {
            const v = Math.max(1, Math.min(Number(e.target.value || 1), pageCount || 1));
            setPageNumber(v);
          }}
          className="w-16 border rounded px-2 py-1 text-sm"
        />
        <div className="text-sm">of {pageCount || 1}</div>
        <button
          className={`px-2 py-1 border rounded ${!canNext ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canNext}
          onClick={() => setPageNumber((n) => Math.min(pageCount || 1, n + 1))}
          title="Next page"
        >
          ▶
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button className="px-2 py-1 border rounded" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} title="Zoom out">−</button>
          <div className="text-sm w-10 text-center">{Math.round(scale * 100)}%</div>
          <button className="px-2 py-1 border rounded" onClick={() => setScale((s) => Math.min(3, s + 0.1))} title="Zoom in">+</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 flex items-start justify-center p-2">
        {loading && <div className="text-sm text-gray-500 p-2">Loading PDF…</div>}
        {error && <div className="text-sm text-red-600 p-2">{error}</div>}
        <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
      </div>
    </div>
  );
}
