import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const PHRASES = [
  'Send upfront_warranty_5-year_v4.pdf to Sarah Owner with a message saying Please review.',
  'Create a task for Jane Doe to review inspection_report_v2.pdf in 3 days.',
  'Open inspection_report_v2.pdf and list the top 10 steps.',
  "Send the roof packet to the project manager and set a reminder next Tue 9am.",
];

export function CheatSheetPopover({ colorMode = false, onOpenQuickCard = () => {}, onClose = () => {}, className = '' }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copy = async (text, idx) => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch (_) {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1800);
    }
  };

  return (
    <div
      className={`p-3 rounded-lg shadow-xl z-40 ${colorMode ? 'bg-slate-800 text-slate-100 border border-slate-700' : 'bg-white text-gray-900 border border-gray-200'} ${className}`}
      style={{ width: 280 }}
      role="dialog"
      aria-label="Bubbles quick phrases"
    >
      <div className="font-semibold mb-1">Bubbles Quick Phrases</div>
      <ul className="text-sm mb-3" style={{ lineHeight: '1.35' }}>
        {PHRASES.map((p, i) => (
          <li key={i} className="flex items-start justify-between gap-2 mb-2">
            <div style={{ flex: 1, marginRight: 8 }} className="text-sm leading-snug break-words">{p}</div>
            <button
              onClick={() => copy(p, i)}
              className={`text-xs px-2 py-1 rounded ${copiedIndex === i ? 'bg-green-600 text-white' : (colorMode ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100')}`}
              aria-label={`Copy phrase ${i + 1}`}
            >
              {copiedIndex === i ? 'Copied' : 'Copy'}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className={`text-xs px-3 py-1.5 rounded border ${colorMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700/30' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}>Close</button>
        <button onClick={onOpenQuickCard} className={`text-xs px-3 py-1.5 rounded font-medium ${colorMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>Open Quick Card</button>
      </div>
    </div>
  );
}

export function CheatSheetModal({ visible, onClose = () => {}, colorMode = false }) {
  // Prevent background scroll while modal is open
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  if (!visible) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(2,6,23,0.58)', zIndex: 2147483647 }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`max-w-3xl w-[92%] max-h-[90vh] overflow-auto rounded-2xl p-6 shadow-2xl relative ${colorMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'}`}
        style={{ zIndex: 2147483648 }}
      >
        <div className="absolute top-3 right-3">
          <button onClick={onClose} aria-label="Close quick start" className={`p-2 rounded-full ${colorMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
            ✕
          </button>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Bubbles AI — Quick Start</h3>
            <p className={`text-sm ${colorMode ? 'text-slate-300' : 'text-gray-500'}`}>Use these phrases to send documents, create tasks, and set reminders via chat or voice.</p>
          </div>
          <div className="flex gap-2">
            <a href="/bubbles-quickstart.html" target="_blank" rel="noreferrer" className={`px-3 py-1.5 rounded text-sm ${colorMode ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>Open printable view</a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="font-semibold">Top Phrases</h4>
            <ol className="mt-2 space-y-2 text-sm">
              {PHRASES.map((p, i) => (
                <li key={i} className="rounded p-2 bg-transparent" style={{ lineHeight: 1.35 }}>{p}</li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="font-semibold">JSON Examples</h4>
            <div className="mt-2 text-xs">
              <div className="mb-2 font-medium">Send doc + notify + task</div>
              <pre className={`p-3 rounded text-xs ${colorMode ? 'bg-slate-800 text-slate-100' : 'bg-gray-50 text-gray-900'}`} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace' }}>{`{
  "message": "Send inspection_report_v2.pdf to Jane Doe and Carlos Martinez with a message saying Please review the inspection comments. Also create a task to follow up in 3 days.",
  "projectId": "proj_7a2f"
}`}</pre>
              <div className="mt-2 font-medium">Extract steps from doc</div>
              <pre className={`p-3 rounded text-xs ${colorMode ? 'bg-slate-800 text-slate-100' : 'bg-gray-50 text-gray-900'}`} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace' }}>{`{
  "message": "Open inspection_report_v2.pdf and give me the top 10 steps.",
  "projectId": "proj_7a2f"
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default function CheatSheet() { return null; }
