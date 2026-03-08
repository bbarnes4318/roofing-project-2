import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowImportService } from '../../services/api';
import { API_BASE_URL } from '../../services/api';
import { ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const WorkflowImportPage = ({ colorMode }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [importId, setImportId] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [startingPhase, setStartingPhase] = useState('LEAD');
  const [clearExisting, setClearExisting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({
    phase: 'phase',
    section: 'section',
    lineItem: 'line_item'
  });
  const [projects, setProjects] = useState([]);
  const [workflowPhases, setWorkflowPhases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Combine Workflows State ───
  const [systemWorkflows, setSystemWorkflows] = useState([]);
  const [customWorkflows, setCustomWorkflows] = useState([]);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState([]);
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const [orderedItems, setOrderedItems] = useState([]);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [combineLoading, setCombineLoading] = useState(false);
  const [combineSuccess, setCombineSuccess] = useState('');
  const [combineError, setCombineError] = useState('');
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
          }
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setProjects(result.data.projects || result.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch workflow phases
  useEffect(() => {
    const fetchWorkflowPhases = async () => {
      try {
        const api = (await import('../../services/api')).default;
        const response = await api.get('/workflow-data/phases');
        const result = response.data;
        if (result?.success && result.data) {
          const phases = result.data.map(phase => ({
            id: phase.id,
            name: phase.name,
            displayName: phase.displayName || phase.name
          }));
          setWorkflowPhases(phases);
          if (phases.length > 0) setStartingPhase(phases[0].id);
        } else {
          throw new Error('Invalid response');
        }
      } catch (err) {
        const fallback = [
          { id: 'LEAD', name: 'LEAD', displayName: 'Lead' },
          { id: 'PROSPECT', name: 'PROSPECT', displayName: 'Prospect' },
          { id: 'APPROVED', name: 'APPROVED', displayName: 'Approved' },
          { id: 'EXECUTION', name: 'EXECUTION', displayName: 'Execution' },
          { id: 'COMPLETION', name: 'COMPLETION', displayName: 'Completion' }
        ];
        setWorkflowPhases(fallback);
        setStartingPhase('LEAD');
      }
    };
    fetchWorkflowPhases();
  }, []);

  // Fetch all workflows for combine builder
  useEffect(() => {
    const fetchAllWorkflows = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };

        const sysResp = await fetch(`${API_BASE_URL}/workflow-data/full-structure`, { headers });
        if (sysResp.ok) {
          const sysData = await sysResp.json();
          if (sysData.success) setSystemWorkflows(sysData.data || []);
        }

        const cwResp = await fetch(`${API_BASE_URL}/workflow-data/custom-workflows`, { headers });
        if (cwResp.ok) {
          const cwData = await cwResp.json();
          if (cwData.success) setCustomWorkflows(cwData.data || []);
        }
      } catch (err) {
        console.error('Error fetching workflows for combine builder:', err);
      }
    };
    fetchAllWorkflows();
  }, [combineSuccess]);

  // Build available line items from selected workflows
  const availableLineItems = useMemo(() => {
    const items = [];
    selectedWorkflowIds.forEach(wfId => {
      const sysPhase = systemWorkflows.find(p => p.id === wfId);
      if (sysPhase) {
        (sysPhase.items || []).forEach(section => {
          (section.subtasks || []).forEach(li => {
            items.push({
              id: li.id,
              itemName: li.label,
              sectionName: section.label,
              workflowName: `System: ${sysPhase.label}`,
              workflowId: wfId
            });
          });
        });
      }
      const cw = customWorkflows.find(w => w.id === wfId);
      if (cw) {
        (cw.phases || []).forEach(phase => {
          (phase.sections || []).forEach(section => {
            (section.lineItems || []).forEach(li => {
              items.push({
                id: li.id,
                itemName: li.itemName,
                sectionName: section.displayName || section.sectionName,
                workflowName: `Custom: ${cw.name}`,
                workflowId: wfId
              });
            });
          });
        });
      }
    });
    return items;
  }, [selectedWorkflowIds, systemWorkflows, customWorkflows]);

  // Toggle line item
  const toggleLineItem = (item) => {
    setSelectedLineItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        setOrderedItems(o => o.filter(i => i.id !== item.id));
        return prev.filter(i => i.id !== item.id);
      } else {
        setOrderedItems(o => [...o, item]);
        return [...prev, item];
      }
    });
  };

  // Drag handlers
  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOverItem.current = idx; };
  const handleDragEnd = () => {
    const items = [...orderedItems];
    const dragged = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    setOrderedItems(items);
  };

  // Save combined workflow
  const handleSaveCombined = async () => {
    if (!newWorkflowName.trim()) { setCombineError('Please enter a name.'); return; }
    if (orderedItems.length === 0) { setCombineError('Please select at least one line item.'); return; }
    setCombineLoading(true);
    setCombineError('');
    setCombineSuccess('');
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const resp = await fetch(`${API_BASE_URL}/workflow-data/custom-workflows/combine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: JSON.stringify({
          name: newWorkflowName.trim(),
          description: `Combined from ${selectedWorkflowIds.length} source workflows`,
          items: orderedItems.map((item, idx) => ({ lineItemId: item.id, displayOrder: idx + 1 }))
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setCombineSuccess(`Workflow "${newWorkflowName}" created with ${orderedItems.length} items!`);
          setNewWorkflowName('');
          setSelectedWorkflowIds([]);
          setSelectedLineItems([]);
          setOrderedItems([]);
        } else {
          setCombineError(data.message || 'Failed to create workflow');
        }
      } else {
        setCombineError('Server error. Please try again.');
      }
    } catch (err) {
      setCombineError('Network error. Please try again.');
    } finally {
      setCombineLoading(false);
    }
  };

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return await workflowImportService.uploadFile(formData);
    },
    onSuccess: (data) => {
      setImportId(data.data.importId);
      setPreviewData(data.data);
      setCurrentStep('preview');
    },
    onError: (err) => {
      alert(`Upload failed: ${err.response?.data?.message || err.message}`);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async (params) => {
      return await workflowImportService.confirmImport(params.importId, {
        projectId: params.projectId,
        startingPhase: params.startingPhase,
        clearExisting: params.clearExisting
      });
    },
    onSuccess: () => {
      alert('Workflow imported successfully!');
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['workflows']);
      setCurrentStep('upload');
      setUploadedFile(null);
      setImportId(null);
      setPreviewData(null);
    },
    onError: (err) => {
      alert(`Import failed: ${err.response?.data?.message || err.message}`);
    }
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validExt = ['.xlsx', '.xls', '.csv'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExt.includes(ext)) { alert('Invalid file format.'); return; }
      setUploadedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const handleConfirmImport = () => {
    if (!selectedProject) { alert('Please select a project.'); return; }
    confirmMutation.mutate({ importId, projectId: selectedProject, startingPhase, clearExisting });
  };

  const downloadTemplate = (format) => { workflowImportService.downloadTemplate(format); };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ═══════════════════════ Import Workflow Card ═══════════════════════ */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Import Workflow Data</h1>
            <p className="mt-1 text-sm text-gray-600">Upload an Excel or CSV file with Phase, Section, and Line Item data</p>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              {['upload', 'preview', 'mapping', 'confirm'].map((step, i) => (
                <React.Fragment key={step}>
                  {i > 0 && <div className="flex-1 h-0.5 mx-4 bg-gray-300" />}
                  <div className="flex items-center" style={{ color: currentStep === step ? 'var(--color-primary-blueprint-blue)' : 'var(--color-neutral-gray-400)' }}>
                    <span className="flex items-center justify-center w-8 h-8 border-2 rounded-full" style={{ borderColor: currentStep === step ? 'var(--color-primary-blueprint-blue)' : 'var(--color-neutral-gray-300)' }}>
                      {i + 1}
                    </span>
                    <span className="ml-2 font-medium">
                      {step === 'upload' ? 'Upload File' : step === 'preview' ? 'Preview & Validate' : step === 'mapping' ? 'Configure Import' : 'Confirm'}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="p-6">
            {currentStep === 'upload' && (
              <div className="space-y-6">
                <div className="rounded-lg p-4" style={{ background: 'var(--color-primary-light-tint)' }}>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--color-primary-blueprint-blue)' }}>Download Template</h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--color-primary-blueprint-blue)' }}>Use our template to ensure your data is formatted correctly</p>
                  <div className="flex space-x-3">
                    <button onClick={() => downloadTemplate('xlsx')} className="px-4 py-2 text-white rounded" style={{ background: 'var(--color-primary-blueprint-blue)' }}>
                      <DocumentTextIcon className="w-4 h-4 inline mr-2" />Excel Template
                    </button>
                    <button onClick={() => downloadTemplate('csv')} className="px-4 py-2 text-white rounded" style={{ background: 'var(--color-success-green)' }}>
                      <DocumentTextIcon className="w-4 h-4 inline mr-2" />CSV Template
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 text-white rounded" style={{ background: 'var(--color-primary-blueprint-blue)' }}>Choose File</span>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                  </label>
                  <p className="mt-2 text-sm text-gray-600">or drag and drop your Excel/CSV file here</p>
                  <p className="mt-1 text-xs text-gray-500">Supported formats: .xlsx, .xls, .csv (max 10MB)</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2"><ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />File Requirements</h3>
                  <ul className="text-sm text-yellow-700 space-y-1 ml-7">
                    <li>• Must contain headers: Phase, Section, Line Item</li>
                    <li>• Optional headers: Description, Responsible Role, Estimated Duration, Alert Priority</li>
                    <li>• Phases must be: LEAD, PROSPECT, APPROVED, EXECUTION, SUPPLEMENT, or COMPLETION</li>
                    <li>• No empty rows between data</li>
                  </ul>
                </div>
              </div>
            )}

            {currentStep === 'preview' && previewData && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">File Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-sm text-gray-500">File Name</p><p className="font-medium">{previewData.fileName}</p></div>
                    <div><p className="text-sm text-gray-500">Total Rows</p><p className="font-medium">{previewData.totalRows}</p></div>
                    <div><p className="text-sm text-gray-500">Valid Rows</p><p className="font-medium" style={{ color: 'var(--color-success-green)' }}>{previewData.validRows}</p></div>
                    <div><p className="text-sm text-gray-500">Error Rows</p><p className="font-medium text-red-600">{previewData.errorRows}</p></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Data Preview (First 10 Rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line Item</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.preview.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.phase}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.section}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.lineItem}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.responsibleRole}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {previewData.errors && previewData.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-900 mb-2"><XCircleIcon className="w-5 h-5 inline mr-2" />Validation Errors</h3>
                    <ul className="text-sm text-red-700 space-y-1">
                      {previewData.errors.map((e, i) => <li key={i}>Row {e.rowNumber}: {e.error}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep('upload')} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Back</button>
                  <button onClick={() => setCurrentStep('mapping')} className="px-4 py-2 text-white rounded" style={{ background: 'var(--color-primary-blueprint-blue)' }} disabled={previewData.validRows === 0}>Continue</button>
                </div>
              </div>
            )}

            {currentStep === 'mapping' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Target Project</label>
                  <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">-- Select a Project --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectNumber} - {p.projectName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Starting Phase</label>
                  <select value={startingPhase} onChange={(e) => setStartingPhase(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    {workflowPhases.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">Import will begin from this phase and include all subsequent phases</p>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" id="clearExisting" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} className="h-4 w-4 rounded" style={{ accentColor: 'var(--color-primary-blueprint-blue)' }} />
                  <label htmlFor="clearExisting" className="ml-2 text-sm text-gray-700">Clear existing workflow data before importing</label>
                </div>

                {clearExisting && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-700"><ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />Warning: This will permanently delete all existing workflow data for this project</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep('preview')} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Back</button>
                  <button onClick={() => setCurrentStep('confirm')} className="px-4 py-2 text-white rounded" style={{ background: 'var(--color-primary-blueprint-blue)' }} disabled={!selectedProject}>Review Import</button>
                </div>
              </div>
            )}

            {currentStep === 'confirm' && previewData && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-3"><CheckCircleIcon className="w-5 h-5 inline mr-2" />Ready to Import</h3>
                  <div className="text-sm text-green-700 space-y-2">
                    <p>• {previewData.validRows} workflow items will be imported</p>
                    <p>• Phases: {previewData.summary.phases.join(', ')}</p>
                    <p>• {previewData.summary.sections} unique sections</p>
                    <p>• Starting from: {startingPhase} phase</p>
                    {clearExisting && <p className="text-yellow-700">• Existing workflow will be cleared</p>}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Target Project</h4>
                  <p className="text-sm text-gray-700">{projects.find(p => p.id === selectedProject)?.projectNumber} - {projects.find(p => p.id === selectedProject)?.projectName}</p>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep('mapping')} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Back</button>
                  <button onClick={handleConfirmImport} className="px-4 py-2 text-white rounded" style={{ background: 'var(--color-success-green)' }} disabled={confirmMutation.isLoading}>{confirmMutation.isLoading ? 'Importing...' : 'Confirm Import'}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════ Combine Workflows Card ═══════════════════════ */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-900">Combine Workflows</h2>
            <p className="mt-1 text-sm text-gray-600">Select line items from multiple workflows and combine them into a new custom workflow</p>
          </div>

          <div className="p-6 space-y-6">
            {combineSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">{combineSuccess}</p>
              </div>
            )}
            {combineError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{combineError}</p>
              </div>
            )}

            {/* Step 1: Select Source Workflows */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">1. Select Source Workflows</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {systemWorkflows.map(phase => {
                  const itemCount = (phase.items || []).reduce((acc, s) => acc + (s.subtasks || []).length, 0);
                  return (
                    <label key={phase.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedWorkflowIds.includes(phase.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={selectedWorkflowIds.includes(phase.id)} onChange={() => setSelectedWorkflowIds(prev => prev.includes(phase.id) ? prev.filter(id => id !== phase.id) : [...prev, phase.id])} className="w-4 h-4 rounded" style={{ accentColor: 'var(--color-primary-blueprint-blue)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{phase.label}</div>
                        <div className="text-xs text-gray-500">{itemCount} line items</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">System</span>
                    </label>
                  );
                })}
                {customWorkflows.map(cw => (
                  <label key={cw.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedWorkflowIds.includes(cw.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={selectedWorkflowIds.includes(cw.id)} onChange={() => setSelectedWorkflowIds(prev => prev.includes(cw.id) ? prev.filter(id => id !== cw.id) : [...prev, cw.id])} className="w-4 h-4 rounded" style={{ accentColor: 'var(--color-primary-blueprint-blue)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{cw.name}</div>
                      <div className="text-xs text-gray-500">{cw.totalItems} line items</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">Custom</span>
                  </label>
                ))}
                {systemWorkflows.length === 0 && customWorkflows.length === 0 && (
                  <p className="col-span-2 text-sm text-gray-500 italic py-4 text-center">No workflows found. Import or create workflows first.</p>
                )}
              </div>
            </div>

            {/* Step 2: Select Line Items */}
            {selectedWorkflowIds.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  2. Select Line Items <span className="ml-2 text-xs font-normal text-gray-500">({selectedLineItems.length} selected)</span>
                </h3>
                <div className="border rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {availableLineItems.length === 0 ? (
                    <p className="text-sm text-gray-500 italic p-4 text-center">No line items found in selected workflows.</p>
                  ) : availableLineItems.map(item => (
                    <label key={item.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selectedLineItems.find(i => i.id === item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={!!selectedLineItems.find(i => i.id === item.id)} onChange={() => toggleLineItem(item)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--color-primary-blueprint-blue)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate">{item.itemName}</div>
                        <div className="text-xs text-gray-500">{item.sectionName}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500 whitespace-nowrap">{item.workflowName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Reorder & Save */}
            {orderedItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  3. Drag to Reorder <span className="ml-2 text-xs font-normal text-gray-500">({orderedItems.length} items)</span>
                </h3>
                <div className="border rounded-lg divide-y divide-gray-100 mb-4">
                  {orderedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-400 select-none">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                        </svg>
                      </span>
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate">{item.itemName}</div>
                        <div className="text-xs text-gray-500 truncate">{item.sectionName}</div>
                      </div>
                      <button onClick={() => toggleLineItem(item)} className="text-red-400 hover:text-red-600 transition-colors p-1" title="Remove">
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="Enter workflow name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveCombined}
                    disabled={combineLoading || !newWorkflowName.trim()}
                    className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                    style={{ background: 'var(--color-success-green)' }}
                  >
                    {combineLoading ? 'Saving...' : 'Save Workflow'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowImportPage;