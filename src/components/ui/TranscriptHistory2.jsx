import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../services/api';

// Minimal, safe transcript history modal used as a drop-in replacement for the corrupted TranscriptHistory.jsx
// Props:
// - projectId: optional project id to filter transcripts
// - onTranscriptSelect: function(transcriptSummary)
// - onClose: function()
export default function TranscriptHistory2({ projectId = null, onTranscriptSelect, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async (startOffset = 0, append = false) => {
      setLoading(true); setError('');
      try {
        // Build URL with optional projectId
        const params = new URLSearchParams();
        if (projectId) params.set('projectId', projectId);
        params.set('limit', '25');
        params.set('offset', String(startOffset));
        const url = `${API_BASE_URL}/voice-transcripts${params.toString() ? `?${params.toString()}` : ''}`;

        // Include auth token if present
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345';
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (!res.ok) {
          const msg = res.status === 401 ? 'Login required to view transcripts.' : 'Failed to load transcript history';
          throw new Error(msg);
        }

        const data = await res.json();
        // Server format: { success, data: { transcripts, pagination }, message }
        const list = data?.data?.transcripts || [];
        const pagination = data?.data?.pagination || { hasMore: false };

        const mapped = list.map(t => {
          const date = t.callDate ? new Date(t.callDate) : (t.createdAt ? new Date(t.createdAt) : new Date());
          const projectName = t.project?.projectName || t.project?.name || '';
          const title = projectName
            ? `${projectName} — ${date.toLocaleString()}`
            : `Call — ${date.toLocaleString()}`;
          return {
            id: t.id,
            title,
            date: date.toISOString(),
            preview: t.executiveSummary || (Array.isArray(t.fullTranscript) && t.fullTranscript[0]?.message) || '' ,
            raw: t
          };
        });

        let finalList = append ? [...items, ...mapped] : mapped;
        // Fallback to locally saved transcripts if server returns none
        if (finalList.length === 0) {
          try {
            const localRaw = localStorage.getItem('voiceTranscripts');
            if (localRaw) {
              const localArr = JSON.parse(localRaw);
              if (Array.isArray(localArr) && localArr.length > 0) {
                finalList = localArr.map(it => ({
                  id: it.id || it.sessionId || `local_${it.date || Date.now()}`,
                  title: it.title || `Call — ${new Date(it.date || Date.now()).toLocaleString()}`,
                  date: it.date || new Date().toISOString(),
                  preview: it.preview || '',
                  raw: it.raw || it
                }));
              }
            }
          } catch (_) {}
        }

        // Sort newest first by date
        finalList.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!cancelled) {
          setItems(finalList);
          setOffset(startOffset + mapped.length);
          setHasMore(Boolean(pagination.hasMore));
        }
      } catch (e) {
        // On error, try localStorage fallback
        try {
          let finalList = [];
          const localRaw = localStorage.getItem('voiceTranscripts');
          if (localRaw) {
            const localArr = JSON.parse(localRaw);
            if (Array.isArray(localArr) && localArr.length > 0) {
              finalList = localArr.map(it => ({
                id: it.id || it.sessionId || `local_${it.date || Date.now()}`,
                title: it.title || `Call — ${new Date(it.date || Date.now()).toLocaleString()}`,
                date: it.date || new Date().toISOString(),
                preview: it.preview || '',
                raw: it.raw || it
              }));
            }
          }
          if (!cancelled) {
            if (finalList.length > 0) {
              setItems(finalList);
              setError('');
              setHasMore(false);
            } else {
              setError(e?.message || 'Failed to load transcript history');
            }
          }
        } catch (_) {
          if (!cancelled) setError(e?.message || 'Failed to load transcript history');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData(0, false);
    return () => { cancelled = true; };
  }, [projectId]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      // Reuse fetchData with append mode
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      params.set('limit', '25');
      params.set('offset', String(offset));
      const url = `${API_BASE_URL}/voice-transcripts${params.toString() ? `?${params.toString()}` : ''}`;
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345';
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data?.data?.transcripts || [];
        const pagination = data?.data?.pagination || { hasMore: false };
        const mapped = list.map(t => {
          const date = t.callDate ? new Date(t.callDate) : (t.createdAt ? new Date(t.createdAt) : new Date());
          const projectName = t.project?.projectName || t.project?.name || '';
          const title = projectName
            ? `${projectName} — ${date.toLocaleString()}`
            : `Call — ${date.toLocaleString()}`;
          return {
            id: t.id,
            title,
            date: date.toISOString(),
            preview: t.executiveSummary || (Array.isArray(t.fullTranscript) && t.fullTranscript[0]?.message) || '' ,
            raw: t
          };
        });
        const merged = [...items, ...mapped].sort((a, b) => new Date(b.date) - new Date(a.date));
        setItems(merged);
        setOffset(offset + mapped.length);
        setHasMore(Boolean(pagination.hasMore));
      }
    } catch (_) {
      // ignore load more failures
    } finally {
      setLoadingMore(false);
    }
  };

  // Group items by date label
  const getGroupLabel = (d) => {
    const now = new Date();
    const date = new Date(d);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfToday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 6);
    if (date >= startOfToday) return 'Today';
    if (date >= startOfYesterday && date < startOfToday) return 'Yesterday';
    if (date >= startOfWeek) return 'Last 7 Days';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const groupsMap = items.reduce((acc, it) => {
    const label = getGroupLabel(it.date);
    if (!acc[label]) acc[label] = [];
    acc[label].push(it);
    return acc;
  }, {});
  // Order groups by the newest item in each group
  const orderedGroups = Object.entries(groupsMap)
    .map(([label, arr]) => ({ label, arr: arr.sort((a, b) => new Date(b.date) - new Date(a.date)), newest: Math.max(...arr.map(x => new Date(x.date).getTime())) }))
    .sort((a, b) => b.newest - a.newest);

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
            <div className="space-y-4">
              {orderedGroups.map(group => (
                <div key={group.label}>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.label}</div>
                  <div className="space-y-2">
                    {group.arr.map(it => (
                      <button
                        key={it.id}
                        onClick={() => onTranscriptSelect && onTranscriptSelect(it.raw || it)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium">{it.title}</div>
                        <div className="text-xs text-gray-500">{new Date(it.date).toLocaleString()}</div>
                        {it.preview && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{it.preview}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-xs text-gray-500">{items.length} loaded</div>
          <div className="flex items-center gap-2">
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={`px-3 py-1.5 rounded-md border text-sm ${loadingMore ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
            <button onClick={onClose} className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
