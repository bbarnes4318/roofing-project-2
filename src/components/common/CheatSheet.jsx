import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const PHRASES = [
  'Send inspection_report_v2.pdf to the homeowner with a quick status update.',
  'Create a task for Sarah to order shingles for project 10023 by Friday and attach the takeoff.',
  'Set a reminder for the install crew tomorrow at 8am to upload day-one photos.',
  'Ask Bubbles to summarize punchlist_notes.pdf and share the highlights with the production manager.',
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
        className={`max-w-4xl w-[96%] max-h-[84vh] overflow-hidden rounded-2xl p-6 shadow-2xl relative ${colorMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'}`}
        style={{ zIndex: 2147483648 }}
      >
        <div className="absolute top-3 right-3">
          <button onClick={onClose} aria-label="Close quick start" className={`p-2 rounded-full ${colorMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="max-w-2xl">
              <h3 className="text-xl font-bold">Bubbles Assistant Playbook</h3>
              <p className={`mt-1 text-sm leading-relaxed ${colorMode ? 'text-slate-300' : 'text-gray-600'}`}>
                Speak naturally. Give Bubbles the goal, who should get it, and which documents to attach. These quick plays keep projects moving without leaving your desk or jobsite.
              </p>
            </div>
            <a href="/bubbles-quickstart.html" target="_blank" rel="noreferrer" className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${colorMode ? 'border-slate-600 text-slate-100 hover:bg-slate-800/60' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} transition`}>Printable guide</a>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-3">
              <div className={`rounded-2xl border ${colorMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'} p-4 shadow-sm`}> 
                <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-500">Prompts that work</h4>
                <ul className={`mt-2 space-y-1.5 text-sm ${colorMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  {PHRASES.map((phrase, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className={`flex-shrink-0 mt-[3px] w-4 h-4 rounded-full text-[10px] font-semibold flex items-center justify-center ${colorMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>{idx + 1}</span>
                      <span className="leading-snug">{phrase}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`rounded-2xl border ${colorMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-white'} p-4 shadow-sm`}> 
                <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Attachments made easy</h4>
                <ul className={`mt-2 space-y-1.5 text-sm ${colorMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  <li><strong>Exact names win:</strong> “Attach measurement_notes.pdf.”</li>
                  <li><strong>Not sure?</strong> Ask “What documents are on project 10045?” then tell Bubbles which one to send.</li>
                  <li><strong>Bundle files:</strong> “Send the permit.pdf <em>and</em> latest_photos.zip to accounting.”</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div className={`rounded-2xl border ${colorMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-white'} p-4 shadow-sm`}> 
                <h4 className="text-xs font-semibold uppercase tracking-wide text-orange-500">Voice: natural names first</h4>
                <div className={`mt-2 text-sm ${colorMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  <p className="leading-snug"><strong>Speak it normally:</strong> “Attach the roofing doc forty-eight thirty-eight F F one PDF.” Bubbles handles underscores and dashes automatically.</p>
                  <p className="leading-snug mt-2"><strong>Add detail if needed:</strong> Mention the project, uploader, or “the warranty PDF from today” so it matches the right file.</p>
                  <p className="leading-snug mt-2"><strong>Fallback:</strong> Only spell it out (“roofing underscore doc…”) if Bubbles asks for clarification.</p>
                </div>
              </div>

              <div className={`rounded-2xl border ${colorMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-white'} p-4 shadow-sm`}> 
                <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-500">Reliable workflow</h4>
                <ul className={`mt-2 space-y-1.5 text-sm ${colorMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  <li><strong>1. State the job:</strong> “Send a status update to Maria about today’s roof progress.”</li>
                  <li><strong>2. Add project & people:</strong> Include project number or names so Bubbles routes it correctly.</li>
                  <li><strong>3. Approve the recap:</strong> Bubbles repeats the plan. Say “Looks good” or make tweaks.</li>
                  <li><strong>Need help?</strong> Email <a href="mailto:support@kenstruction.com" className="underline">support@kenstruction.com</a>.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default function CheatSheet() { return null; }
