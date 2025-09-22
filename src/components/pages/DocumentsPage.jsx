import React, { useEffect, useMemo, useRef, useState } from 'react';
import EnhancedProjectDropdown from '../ui/EnhancedProjectDropdown';
import { ragService } from '../../services/ragService';
import { projectsService } from '../../services/api';
import { MagnifyingGlassIcon, PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import PdfViewer from '../ui/PdfViewer';

const DocumentThumb = ({ doc, onClick, active }) => {
  const isImage = doc.mimeType?.startsWith('image/');
  const isPdf = doc.mimeType === 'application/pdf';
  return (
    <div
      onClick={() => onClick(doc)}
      className={`border rounded-lg bg-white hover:shadow-md cursor-pointer overflow-hidden transition-all ${active ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {isImage ? (
          <img src={doc.thumbnailUrl || doc.signedUrl || '/ai.png'} alt={doc.originalName} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-500 text-sm">{isPdf ? 'PDF' : (doc.fileType || 'FILE')}</div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-medium text-gray-900 truncate">{doc.originalName || doc.fileName}</div>
        <div className="text-xs text-gray-500 truncate">{(doc.mimeType || '').split('/').pop()} • {Math.round((doc.fileSize || 0)/1024)} KB</div>
      </div>
    </div>
  );
};

const AssistantPane = ({ projectId, contextFileIds }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const renderContent = (text) => {
    // Minimal safe renderer similar to AIAssistantPage
    return String(text || '')
      .replace(/\n/g, '<br/>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  useEffect(() => {
    // scroll to bottom on new message
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const userMsg = { id: `u_${Date.now()}`, role: 'user', content: q, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await ragService.assistantQuery({ projectId, query: q, userId: null, contextFileIds, mode: 'chat' });
      const aiMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: res?.answer || 'No answer',
        sources: res?.sources || [],
        actions: res?.actions || [],
        ts: new Date()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: `e_${Date.now()}`, role: 'error', content: 'Assistant failed. Try again.', ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col border rounded-lg bg-white">
      <div className="p-3 border-b font-semibold">Assistant</div>
      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-lg p-2 text-sm ${m.role === 'user' ? 'bg-blue-50' : m.role === 'assistant' ? 'bg-gray-50' : 'bg-red-50'}`}>
            <div className="text-xs text-gray-500 mb-1">{m.role}</div>
            <div dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Sources: {m.sources.slice(0,3).map((s, i) => (
                  <span key={i} className="mr-2">[file:{s.fileId}{s.page ? ` page:${s.page}` : ''}{s.chunkId ? ` chunk:${s.chunkId}` : ''}]</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 border-t">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about these documents…"
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={send} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 flex items-center gap-1">
            {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DocumentsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [activeFileDetail, setActiveFileDetail] = useState(null);
  const fileInputRef = useRef(null);

  // Load projects
  useEffect(() => {
    (async () => {
      try {
        const resp = await projectsService.getAll();
        const apiProjects = resp?.data?.projects || resp?.data || [];
        const normalized = (apiProjects || []).map(p => ({ id: p.id || p._id, projectName: p.name || p.projectName, projectNumber: p.projectNumber, customer: p.customer }));
        setProjects(normalized);
      } catch (_) { setProjects([]); }
    })();
  }, []);

  const projectId = selectedProject?.id || null;

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // 1) initiate
      const init = await ragService.initiateUpload({
        jobId: null,
        projectId,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        uploaderId: null,
        metadata: {}
      });
      // 2) PUT to Spaces
      await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      // 3) complete
      await ragService.completeUpload({ uploadId: init.uploadId, jobId: null, fileUrl: null, checksum: null, metadata: {} });
      // 4) refresh list
      await runSearch();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      // reset
      if (e.target) e.target.value = '';
    }
  };

  const runSearch = async () => {
    setLoading(true);
    try {
      if (query.trim()) {
        const res = await ragService.listFilesSemantic({ projectId, query, limit: 30 });
        const ranked = res?.results || [];
        const docs = ranked.map(r => ({ ...(r.document || {}), score: r.score, snippet: r.snippet }));
        setFiles(docs);
      } else {
        const res = await ragService.listFiles({ projectId, limit: 30 });
        setFiles(res?.files || []);
      }
    } catch (e) {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runSearch(); }, [projectId]);

  const openFile = async (doc) => {
    setActiveFile(doc);
    try {
      const detail = await ragService.getFile(doc.id);
      setActiveFileDetail(detail);
    } catch (_) {
      setActiveFileDetail(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <div className="w-80">
            <EnhancedProjectDropdown
              projects={projects}
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              colorMode={false}
            />
          </div>
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
              placeholder={'Search documents semantically (e.g., "permit expiration date")'}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={runSearch} className="px-4 py-2 bg-blue-600 text-white rounded-md">Search</button>
          <div className="ml-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChosen} />
            <button onClick={handleUploadClick} className="px-4 py-2 bg-gray-100 border rounded-md hover:bg-gray-200">Upload</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6">
        {/* Left folder tree (static categories for now) */}
        <div className="col-span-2 hidden lg:block">
          <div className="bg-white border rounded-lg p-3">
            <div className="text-sm font-semibold mb-2">Folders</div>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">Photos</li>
              <li className="px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">Estimates</li>
              <li className="px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">Permits</li>
              <li className="px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">Drone</li>
              <li className="px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">Xactimate</li>
            </ul>
          </div>
        </div>

        {/* Middle grid */}
        <div className="col-span-12 lg:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">{loading ? 'Loading…' : `${files.length} results`}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((d) => (
              <DocumentThumb key={d.id} doc={d} onClick={openFile} active={activeFile?.id === d.id} />
            ))}
          </div>
        </div>

        {/* Right viewer + assistant */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="h-80 border rounded-lg bg-white overflow-hidden">
            <div className="p-2 border-b text-sm font-semibold">Viewer</div>
            <div className="h-[calc(100%-40px)]">
              {!activeFileDetail ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">Select a document</div>
              ) : (
                (activeFileDetail.signedUrl || activeFileDetail.streamUrl) ? (
                  (() => {
                    const viewUrl = activeFileDetail.streamUrl || activeFileDetail.signedUrl;
                    const isPdf = (activeFileDetail.mimeType === 'application/pdf' || (activeFile && activeFile.mimeType === 'application/pdf'));
                    return isPdf ? (
                      <PdfViewer url={viewUrl} className="w-full h-full" />
                    ) : (
                      <iframe title="doc" src={viewUrl} className="w-full h-full" />
                    );
                  })()
                ) : (
                  <div className="p-3 text-sm">No preview available.</div>
                )
              )}
            </div>
          </div>

          <div className="h-[420px]">
            <AssistantPane projectId={projectId} contextFileIds={activeFile ? [activeFile.id] : []} />
          </div>
        </div>
      </div>
    </div>
  );
}
