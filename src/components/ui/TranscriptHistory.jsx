import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, CalendarIcon, ClockIcon, UserGroupIcon, ChevronRightIcon, ArrowDownTrayIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { SparklesIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';

const TranscriptHistory = ({ projectId = null, onTranscriptSelect, onClose }) => {
    const [transcripts, setTranscripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTranscript, setSelectedTranscript] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProject, setFilterProject] = useState(projectId || 'all');
    const [pagination, setPagination] = useState({
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false
    });
    const [stats, setStats] = useState({
        totalTranscripts: 0,
        aiEnhancedCount: 0,
        totalParticipants: 0,
        recentTranscripts: []
    });

    // Fetch transcripts
    useEffect(() => {
        fetchTranscripts();
        fetchStats();
    }, [filterProject, pagination.offset]);

    const fetchTranscripts = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams({
                limit: pagination.limit,
                offset: pagination.offset
            });
            
            if (filterProject && filterProject !== 'all') {
                params.append('projectId', filterProject);
            }

            const response = await fetch(`/api/voice-transcripts?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setTranscripts(result.data.transcripts);
                    setPagination(result.data.pagination);
                }
            } else {
                throw new Error('Failed to fetch transcripts');
            }
        } catch (err) {
            console.error('Error fetching transcripts:', err);
            setError('Failed to load transcript history');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const params = filterProject && filterProject !== 'all' 
                ? `?projectId=${filterProject}` 
                : '';
            
            const response = await fetch(`/api/voice-transcripts/stats/summary${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setStats(result.data);
                }
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchTranscriptDetails = async (transcriptId) => {
        try {
            const response = await fetch(`/api/voice-transcripts/${transcriptId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setSelectedTranscript(result.data.transcript);
                    if (onTranscriptSelect) {
                        onTranscriptSelect(result.data.transcript);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching transcript details:', err);
        }
    };

    const deleteTranscript = async (transcriptId, e) => {
        e.stopPropagation();
        
        if (!window.confirm('Are you sure you want to delete this transcript?')) {
            return;
        }

        try {
            const response = await fetch(`/api/voice-transcripts/${transcriptId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                }
            });

            if (response.ok) {
                // Refresh the list
                fetchTranscripts();
                fetchStats();
                if (selectedTranscript?.id === transcriptId) {
                    setSelectedTranscript(null);
                }
            }
        } catch (err) {
            console.error('Error deleting transcript:', err);
            alert('Failed to delete transcript');
        }
    };

    const downloadTranscript = async (transcript, format, e) => {
        e.stopPropagation();
        
        try {
            const response = await fetch('/api/transcripts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                },
                body: JSON.stringify({
                    summary: transcript,
                    formats: [format],
                    projectId: transcript.projectId,
                    sessionId: transcript.sessionId
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.downloadLinks) {
                    // Trigger download
                    const url = result.data.downloadLinks[format];
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `transcript_${transcript.sessionId}.${format}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        } catch (err) {
            console.error('Error downloading transcript:', err);
            alert('Failed to download transcript');
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (duration) => {
        if (!duration || duration === 'Unknown') return 'N/A';
        return duration;
    };

    const filteredTranscripts = transcripts.filter(t => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            t.executiveSummary?.toLowerCase().includes(search) ||
            t.project?.projectName?.toLowerCase().includes(search) ||
            t.sessionId?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] flex">
                {/* Left Panel - Transcript List */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-900">Transcript History</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="text-center">
                                <div className="text-xl font-bold text-blue-600">{stats.totalTranscripts}</div>
                                <div className="text-xs text-gray-500">Total</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-green-600">{stats.aiEnhancedCount}</div>
                                <div className="text-xs text-gray-500">AI Enhanced</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-purple-600">{stats.totalParticipants}</div>
                                <div className="text-xs text-gray-500">Participants</div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search transcripts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Transcript List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-600 p-4">{error}</div>
                        ) : filteredTranscripts.length === 0 ? (
                            <div className="text-center text-gray-500 p-8">
                                <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>No transcripts found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredTranscripts.map((transcript) => (
                                    <div
                                        key={transcript.id}
                                        onClick={() => fetchTranscriptDetails(transcript.id)}
                                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                            selectedTranscript?.id === transcript.id ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {transcript.isAiEnhanced && (
                                                        <SparklesIcon className="w-4 h-4 text-purple-500" />
                                                    )}
                                                    <span className="font-medium text-sm text-gray-900">
                                                        {transcript.project?.projectName || 'General Conversation'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {formatDate(transcript.callDate)}
                                                </div>
                                            </div>
                                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" />
                                                {formatDuration(transcript.duration)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <UserGroupIcon className="w-3 h-3" />
                                                {transcript.participantCount} participant(s)
                                            </div>
                                        </div>

                                        {transcript.executiveSummary && (
                                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                                {transcript.executiveSummary}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={(e) => downloadTranscript(transcript, 'pdf', e)}
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4 inline mr-1" />
                                                PDF
                                            </button>
                                            <button
                                                onClick={(e) => downloadTranscript(transcript, 'json', e)}
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4 inline mr-1" />
                                                JSON
                                            </button>
                                            <button
                                                onClick={(e) => deleteTranscript(transcript.id, e)}
                                                className="text-xs text-red-600 hover:text-red-800 ml-auto"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.hasMore && (
                        <div className="p-3 border-t border-gray-200">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                                className="w-full py-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel - Transcript Details */}
                <div className="flex-1 flex flex-col">
                    {selectedTranscript ? (
                        <>
                            {/* Transcript Header */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedTranscript.project?.projectName || 'Voice Transcript'}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {selectedTranscript.isAiEnhanced && (
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                                                <SparklesIcon className="w-3 h-3" />
                                                AI Enhanced
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                                    <div>
                                        <span className="font-medium">Date:</span> {formatDate(selectedTranscript.callDate)}
                                    </div>
                                    <div>
                                        <span className="font-medium">Duration:</span> {formatDuration(selectedTranscript.duration)}
                                    </div>
                                    <div>
                                        <span className="font-medium">Participants:</span> {selectedTranscript.participantCount}
                                    </div>
                                    <div>
                                        <span className="font-medium">Session:</span> {selectedTranscript.sessionId}
                                    </div>
                                </div>
                            </div>

                            {/* Transcript Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Executive Summary */}
                                {selectedTranscript.executiveSummary && (
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-900 mb-2">Executive Summary</h4>
                                        <p className="text-sm text-gray-700">{selectedTranscript.executiveSummary}</p>
                                    </div>
                                )}

                                {/* Key Decisions */}
                                {selectedTranscript.keyDecisions?.length > 0 && (
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 mb-2">Key Decisions</h4>
                                        <ul className="space-y-2">
                                            {selectedTranscript.keyDecisions.map((decision, idx) => (
                                                <li key={idx} className="text-sm text-gray-700">
                                                    • {decision.decision}
                                                    {decision.rationale && (
                                                        <div className="text-xs text-gray-500 ml-3 mt-1">
                                                            Rationale: {decision.rationale}
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Action Items */}
                                {selectedTranscript.actionItems?.length > 0 && (
                                    <div className="bg-orange-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-orange-900 mb-2">Action Items</h4>
                                        <ul className="space-y-2">
                                            {selectedTranscript.actionItems.map((item, idx) => (
                                                <li key={idx} className="text-sm text-gray-700">
                                                    • {item.action}
                                                    <div className="text-xs text-gray-500 ml-3 mt-1">
                                                        Assignee: {item.assignee} | Priority: {item.priority}
                                                        {item.dueDate && ` | Due: ${item.dueDate}`}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Full Transcript */}
                                {selectedTranscript.fullTranscript?.length > 0 && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-3">Full Conversation</h4>
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {selectedTranscript.fullTranscript.map((entry, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`font-medium text-sm ${
                                                            entry.speaker === 'User' ? 'text-blue-600' : 'text-green-600'
                                                        }`}>
                                                            {entry.speaker === 'User' ? '👤 Customer' : '🤖 Assistant'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(entry.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{entry.message}</p>
                                                    {entry.confidence && entry.confidence !== 'high' && (
                                                        <span className="text-xs text-gray-400">
                                                            ({entry.confidence} confidence)
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => downloadTranscript(selectedTranscript, 'pdf', e)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4 inline mr-2" />
                                        Download PDF
                                    </button>
                                    <button
                                        onClick={(e) => downloadTranscript(selectedTranscript, 'json', e)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4 inline mr-2" />
                                        Download JSON
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => deleteTranscript(selectedTranscript.id, e)}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                                >
                                    <TrashIcon className="w-4 h-4 inline mr-2" />
                                    Delete Transcript
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <DocumentTextIcon className="w-16 h-16 mx-auto mb-4" />
                                <p className="text-lg">Select a transcript to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TranscriptHistory;