import React, { useEffect, useState } from 'react';

// Minimal, safe transcript history modal used as a drop-in replacement for the corrupted TranscriptHistory.jsx
// Props:
// - projectId: optional project id to filter transcripts
// - onTranscriptSelect: function(transcriptSummary)
// - onClose: function()
export default function TranscriptHistory2({ projectId = null, onTranscriptSelect, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true); setError('');
      try {
        // Placeholder: in future, fetch from /api/voice-transcripts or a dedicated service
        // For now, provide a small sample so the UI works and build is unblocked
        const sample = [
          { id: 't1', title: 'Call summary (Today 10:12 AM)', date: new Date().toISOString(), preview: 'Discussed progress and next steps.' },
          { id: 't0', title: 'Call summary (Yesterday 4:05 PM)', date: new Date(Date.now() - 86400000).toISOString(), preview: 'Customer confirmed appointment.' }
        ];
        if (!cancelled) setItems(sample);
      } catch (e) {
        if (!cancelled) setError('Failed to load transcript history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-[61] w-full max-w-lg rounded-xl shadow-2xl border bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <div className="font-semibold">Transcript History</div>
            <div className="text-xs text-gray-500">{projectId ? `Project: ${projectId}` : 'All Projects'}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" title="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading && <div className="text-sm text-gray-500">Loading…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="text-sm text-gray-500">No transcripts found.</div>
          )}
          {!loading && !error && items.length > 0 && (
            <div className="space-y-2">
              {items.map(it => (
                <button
                  key={it.id}
                  onClick={() => onTranscriptSelect && onTranscriptSelect(it)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="text-sm font-medium">{it.title}</div>
                  <div className="text-xs text-gray-500">{new Date(it.date).toLocaleString()}</div>
                  {it.preview && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{it.preview}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}
