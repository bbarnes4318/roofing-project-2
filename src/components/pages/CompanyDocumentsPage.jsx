import React, { useEffect, useState } from 'react';
import { companyDocsService, API_ORIGIN } from '../../services/api';

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 text-xs font-semibold rounded-md border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
  >
    {children}
  </button>
);

export default function CompanyDocumentsPage({ colorMode }) {
  const [activeTab, setActiveTab] = useState('Customer Assets');
  const [assets, setAssets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tplUploading, setTplUploading] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', description: '', format: 'DOCX', section: 'CUSTOMER_INFORMATIONALS', fields: '[]', file: null });
  const [assetSection, setAssetSection] = useState('CUSTOMER_INFORMATIONALS');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', format: 'DOCX', section: 'CUSTOMER_INFORMATIONALS', fields: '[]', file: null });
  const [openAssetSectionKey, setOpenAssetSectionKey] = useState(null);
  const [allAssetsExpanded, setAllAssetsExpanded] = useState(false);
  const [openTplSectionKey, setOpenTplSectionKey] = useState(null);
  const [allTplExpanded, setAllTplExpanded] = useState(false);

  const sections = [
    { value: 'EIGHT_ELEVEN_INFO', label: '811 Info' },
    { value: 'CHECKLISTS', label: 'Checklists' },
    { value: 'CUSTOMER_INFORMATIONALS', label: 'Customer Informationals' },
    { value: 'CONTRACTS_SIGNED_DOCUMENTS', label: 'Contracts & Signed Documents' },
    { value: 'JOB_SITE_PAPERWORK', label: 'Job Site Paperwork' },
    { value: 'OFFICE_DOCUMENTS', label: 'Office Documents' },
    { value: 'PROJECT_MANAGEMENT_DOCUMENTS', label: 'Project Management Documents' },
    { value: 'SALES_MATERIALS_INFORMATION', label: 'Sales, Materials & Info' },
    { value: 'SOPS_TRAINING', label: 'SOPs & Training' },
    { value: 'CERTS_WARRANTIES_INSPECTIONS', label: 'Certifications, Warranties & Inspections' },
    { value: 'INSURANCE_CERTIFICATIONS', label: 'Insurance Certifications' },
  ];

  const loadAssets = async () => {
    setLoading(true); setError('');
    try {
      console.log('🔍 Loading assets...');
      const res = await companyDocsService.listAssets();
      console.log('🔍 Assets response:', res);
      setAssets(res.data.assets || []);
    } catch (e) {
      console.error('❌ Failed to load assets:', e);
      setError(e.message || 'Failed to load assets');
    } finally { setLoading(false); }
  };

  const loadTemplates = async () => {
    setLoading(true); setError('');
    try {
      const res = await companyDocsService.listTemplates();
      setTemplates(res.data.templates || []);
    } catch (e) {
      setError(e.message || 'Failed to load templates');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'Customer Assets') loadAssets();
    if (activeTab === 'Project Templates') loadTemplates();
  }, [activeTab]);

  const handleAssetUpload = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      console.log('🔍 Uploading asset:', file.name, 'to section:', assetSection);
      await companyDocsService.uploadAsset(file, { title: file.name, section: assetSection });
      console.log('✅ Asset uploaded successfully');
      await loadAssets();
    } catch (e) {
      console.error('❌ Upload failed:', e);
      setError(e.message || 'Upload failed');
    } finally { setUploading(false); ev.target.value = ''; }
  };

  const [generateForm, setGenerateForm] = useState({ templateId: '', projectId: '', title: '', data: '{}' });
  const handleGenerate = async () => {
    try {
      const payload = {
        templateId: generateForm.templateId || undefined,
        projectId: generateForm.projectId,
        title: generateForm.title || 'Generated Document',
        data: JSON.parse(generateForm.data || '{}')
      };
      const res = await companyDocsService.generate(payload);
      alert('Document generated');
      // Optionally navigate to project documents area
    } catch (e) {
      alert(e.message || 'Generation failed');
    }
  };

  const handleTemplateFile = (ev) => {
    const file = ev.target.files?.[0];
    setTplForm({ ...tplForm, file });
  };

  const handleTemplateUpload = async () => {
    if (!tplForm.file || !tplForm.name) {
      setError('Template name and file are required');
      return;
    }
    setTplUploading(true); setError('');
    try {
      const fields = JSON.parse(tplForm.fields || '[]');
      await companyDocsService.createTemplate(tplForm.file, {
        name: tplForm.name,
        description: tplForm.description,
        format: tplForm.format,
        section: tplForm.section,
        fields
      });
      setTplForm({ name: '', description: '', format: 'DOCX', section: 'CUSTOMER_INFORMATIONALS', fields: '[]', file: null });
      await loadTemplates();
      alert('Template uploaded');
    } catch (e) {
      setError(e.message || 'Failed to upload template');
    } finally {
      setTplUploading(false);
    }
  };

  const handleExportTemplate = async (template) => {
    try {
      const link = document.createElement('a');
      link.href = `${API_ORIGIN}${template.templateFileUrl}`;
      link.download = `${template.name}.${String(template.format || 'docx').toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Failed to export template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) return;
    
    try {
      await companyDocsService.deleteTemplate(templateId);
      await loadTemplates();
    } catch (e) {
      setError(e.message || 'Failed to delete template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name,
      description: template.description || '',
      format: template.format,
      section: template.section || 'CUSTOMER_INFORMATIONALS',
      fields: JSON.stringify(template.fields || [], null, 2),
      file: null
    });
  };

  const handleEditSubmit = async () => {
    if (!editingTemplate) return;
    
    try {
      await companyDocsService.updateTemplate(editingTemplate.id, editForm, editForm.file);
      setEditingTemplate(null);
      setEditForm({ name: '', description: '', format: 'DOCX', section: 'CUSTOMER_INFORMATIONALS', fields: '[]', file: null });
      await loadTemplates();
    } catch (e) {
      setError(e.message || 'Failed to update template');
    }
  };

  const handleEditCancel = () => {
    setEditingTemplate(null);
    setEditForm({ name: '', description: '', format: 'DOCX', section: 'CUSTOMER_INFORMATIONALS', fields: '[]', file: null });
  };

  // Group lists by section label for clean UI
  const groupBySection = (items) => {
    const map = new Map();
    items.forEach((it) => {
      const key = it.section || 'UNCATEGORIZED';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    });
    return Array.from(map.entries());
  };

  const sectionLabel = (value) => sections.find(s => s.value === value)?.label || 'Uncategorized';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <TabButton active={activeTab === 'Customer Assets'} onClick={() => setActiveTab('Customer Assets')}>Customer-facing PDFs</TabButton>
        <TabButton active={activeTab === 'Project Templates'} onClick={() => setActiveTab('Project Templates')}>Project-specific Templates</TabButton>
        <TabButton active={activeTab === 'Generate'} onClick={() => setActiveTab('Generate')}>Generate</TabButton>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-600">{error}</div>
      )}

      {activeTab === 'Customer Assets' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Customer-facing documents</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setAllAssetsExpanded(true); setOpenAssetSectionKey('__ALL__'); }}
                className="px-2 py-1 text-[11px] font-semibold rounded border border-gray-300 hover:bg-gray-50"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => { setAllAssetsExpanded(false); setOpenAssetSectionKey(null); }}
                className="px-2 py-1 text-[11px] font-semibold rounded border border-gray-300 hover:bg-gray-50"
              >
                Collapse All
              </button>
              <select className="border rounded px-2 py-1 text-xs" value={assetSection} onChange={e => setAssetSection(e.target.value)}>
                {sections.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
              <label className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded cursor-pointer">
                {uploading ? 'Uploading…' : 'Upload PDF'}
                <input type="file" accept="application/pdf" className="hidden" onChange={handleAssetUpload} disabled={uploading} />
              </label>
            </div>
          </div>
          {loading ? (
            <div className="text-xs text-gray-600">Loading…</div>
          ) : (
            groupBySection(assets).map(([sec, list]) => (
              <div key={sec} className="mb-3 border rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    if (allAssetsExpanded) return; // disable individual toggle when expanded all
                    setOpenAssetSectionKey(openAssetSectionKey === sec ? null : sec)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors border-b"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800">{sectionLabel(sec)}</span>
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                      {(assets || []).filter(a => (a.section || 'UNCATEGORIZED') === sec).length}
                    </span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${(allAssetsExpanded || openAssetSectionKey === sec) ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z" clipRule="evenodd" />
                  </svg>
                </button>
                <div
                  className={`px-3 transition-all duration-300 ease-in-out overflow-hidden ${(allAssetsExpanded || openAssetSectionKey === sec) ? 'max-h-[1000px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}
                >
                  <ul className="divide-y">
                    {list.map(a => (
                      <li key={a.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="truncate">
                          <div className="font-semibold truncate">{a.title}</div>
                          <div className="text-gray-500 truncate">{a.fileUrl}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={`${API_ORIGIN}${a.fileUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Preview</a>
                          <a href={`${API_ORIGIN}${a.fileUrl}`} download className="text-blue-600 hover:underline">Download</a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
          {!loading && assets.length === 0 && (
            <div className="py-6 text-center text-xs text-gray-500">No assets yet</div>
          )}
        </div>
      )}

      {activeTab === 'Project Templates' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Templates</h3>
              <p className="text-xs text-gray-600">Manage the templates that power autogenerated project documents.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setAllTplExpanded(true); setOpenTplSectionKey('__ALL__'); }}
                className="px-2 py-1 text-[11px] font-semibold rounded border border-gray-300 hover:bg-gray-50"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => { setAllTplExpanded(false); setOpenTplSectionKey(null); }}
                className="px-2 py-1 text-[11px] font-semibold rounded border border-gray-300 hover:bg-gray-50"
              >
                Collapse All
              </button>
            </div>
          </div>
          <div className="border rounded-md p-3 mb-4">
            <div className="text-xs font-semibold mb-2">Upload New Template</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-700 mb-1">Name</label>
                <input className="w-full border rounded px-2 py-1" value={tplForm.name} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Format</label>
                <select className="w-full border rounded px-2 py-1" value={tplForm.format} onChange={e => setTplForm({ ...tplForm, format: e.target.value })}>
                  <option value="DOCX">DOCX</option>
                  <option value="HTML">HTML</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Section</label>
                <select className="w-full border rounded px-2 py-1" value={tplForm.section} onChange={e => setTplForm({ ...tplForm, section: e.target.value })}>
                  {sections.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-1">Description</label>
                <input className="w-full border rounded px-2 py-1" value={tplForm.description} onChange={e => setTplForm({ ...tplForm, description: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-1">Fields (JSON array)</label>
                <textarea className="w-full border rounded px-2 py-1 h-24" value={tplForm.fields} onChange={e => setTplForm({ ...tplForm, fields: e.target.value })} placeholder='[{"key":"client_name","label":"Client Name","type":"TEXT","required":true}]' />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Template File</label>
                <input type="file" accept=".docx,.html,.htm,.pdf" onChange={handleTemplateFile} />
              </div>
            </div>
            <div className="mt-3">
              <button onClick={handleTemplateUpload} disabled={tplUploading} className={`px-3 py-2 text-xs font-semibold rounded-md ${tplUploading ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white'}`}>{tplUploading ? 'Uploading…' : 'Upload Template'}</button>
            </div>
          </div>

          {/* Edit Template Form */}
          {editingTemplate && (
            <div className="border rounded-md p-3 mb-4 bg-gray-50">
              <div className="text-xs font-semibold mb-2">Edit Template: {editingTemplate.name}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-700 mb-1">Name</label>
                  <input className="w-full border rounded px-2 py-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Format</label>
                  <select className="w-full border rounded px-2 py-1" value={editForm.format} onChange={e => setEditForm({ ...editForm, format: e.target.value })}>
                    <option value="DOCX">DOCX</option>
                    <option value="HTML">HTML</option>
                    <option value="PDF">PDF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Section</label>
                  <select className="w-full border rounded px-2 py-1" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })}>
                    {sections.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-1">Description</label>
                  <input className="w-full border rounded px-2 py-1" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-1">Fields (JSON array)</label>
                  <textarea className="w-full border rounded px-2 py-1 h-24" value={editForm.fields} onChange={e => setEditForm({ ...editForm, fields: e.target.value })} placeholder='[{"key":"client_name","label":"Client Name","type":"TEXT","required":true}]' />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Replace File (optional)</label>
                  <input type="file" accept=".docx,.html,.htm,.pdf" onChange={e => setEditForm({ ...editForm, file: e.target.files?.[0] || null })} />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={handleEditSubmit} className="px-3 py-2 text-xs font-semibold rounded-md bg-green-600 text-white">Update Template</button>
                <button onClick={handleEditCancel} className="px-3 py-2 text-xs font-semibold rounded-md bg-gray-600 text-white">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-xs text-gray-600">Loading…</div>
          ) : (
            groupBySection(templates).map(([sec, list]) => (
              <div key={sec} className="mb-3 border rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    if (allTplExpanded) return;
                    setOpenTplSectionKey(openTplSectionKey === sec ? null : sec)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 ${openTplSectionKey === sec || allTplExpanded ? 'bg-blue-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors border-b`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800">{sectionLabel(sec)}</span>
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                      {list.length}
                    </span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-blue-500 transition-transform duration-300 ${(allTplExpanded || openTplSectionKey === sec) ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z" clipRule="evenodd" />
                  </svg>
                </button>
                <div
                  className={`px-3 transition-all duration-300 ease-in-out overflow-hidden ${(allTplExpanded || openTplSectionKey === sec) ? 'max-h-[1200px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}
                >
                  <ul className="divide-y">
                    {list.map(t => (
                      <li key={t.id} className="py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{t.name} <span className="text-gray-500">({t.format})</span></div>
                            <div className="text-gray-600">Fields: {t.fields?.length || 0}</div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => handleExportTemplate(t)} className="text-blue-600 hover:underline text-xs">Export Blank Template</button>
                            <a href={`${API_ORIGIN}${t.templateFileUrl}`} download className="text-blue-600 hover:underline text-xs">Download</a>
                            <button
                              onClick={() => handleEditTemplate(t)}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
          {!loading && templates.length === 0 && (
            <div className="py-6 text-center text-xs text-gray-500">No templates yet</div>
          )}
        </div>
      )}

      {activeTab === 'Generate' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-bold mb-3">Generate a Project Document</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-gray-700 mb-1">Template (optional)</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={generateForm.templateId}
                onChange={e => setGenerateForm({ ...generateForm, templateId: e.target.value })}
              >
                <option value="">— None —</option>
                {(templates || []).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Project ID</label>
              <input className="w-full border rounded px-2 py-1" value={generateForm.projectId} onChange={e => setGenerateForm({ ...generateForm, projectId: e.target.value })} placeholder="project UUID" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Title</label>
              <input className="w-full border rounded px-2 py-1" value={generateForm.title} onChange={e => setGenerateForm({ ...generateForm, title: e.target.value })} placeholder="Generated Document" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Data (JSON)</label>
              <textarea className="w-full border rounded px-2 py-1 h-28" value={generateForm.data} onChange={e => setGenerateForm({ ...generateForm, data: e.target.value })} placeholder='{"client_name":"Acme"}' />
            </div>
          </div>
          <div className="mt-3">
            <button onClick={handleGenerate} className="px-3 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white">Generate PDF</button>
          </div>
        </div>
      )}
    </div>
  );
}


