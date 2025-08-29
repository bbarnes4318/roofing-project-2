const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
    asyncHandler, 
    sendSuccess, 
    sendError,
    AppError 
} = require('../middleware/errorHandler');
const transcriptAIService = require('../services/TranscriptAIService');
const pdfGeneratorService = require('../services/PDFGeneratorService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @desc    Generate AI-enhanced transcript with GPT-5
// @route   POST /api/transcripts/enhance
// @access  Private
router.post('/enhance', asyncHandler(async (req, res, next) => {
    try {
        const { fullTranscript, metadata, projectInfo } = req.body;
        
        if (!fullTranscript || !Array.isArray(fullTranscript)) {
            return next(new AppError('Full transcript data is required', 400));
        }

        // Generate AI-enhanced summary using GPT-5
        const enhancedSummary = await transcriptAIService.generateProfessionalSummary({
            fullTranscript,
            metadata,
            projectInfo
        });

        sendSuccess(res, 200, { 
            summary: enhancedSummary
        }, 'Transcript enhanced successfully with GPT-5');

    } catch (error) {
        console.error('Error enhancing transcript:', error);
        return next(new AppError('Failed to enhance transcript', 500));
    }
}));

// @desc    Generate transcript files in multiple formats
// @route   POST /api/transcripts/generate
// @access  Private
router.post('/generate', asyncHandler(async (req, res, next) => {
    try {
        const { summary, formats, projectId, sessionId, useAI = false } = req.body;
        
        if (!summary || !formats || !Array.isArray(formats)) {
            return next(new AppError('Summary data and formats array are required', 400));
        }

        // Generate timestamp for file naming
        const timestamp = new Date().toISOString().split('T')[0];
        const projectPrefix = projectId ? `project_${projectId}_` : '';
        
        // Generate files based on requested formats
        const downloadLinks = {};
        const baseFileName = `${projectPrefix}transcript_${timestamp}`;

        for (const format of formats) {
            let fileContent = '';
            let mimeType = '';
            
            switch (format.toLowerCase()) {
                case 'pdf':
                    // Generate real PDF using PDFKit
                    const pdfBuffer = await pdfGeneratorService.generateTranscriptPDF(summary);
                    downloadLinks.pdf = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
                    break;
                    
                case 'json':
                    fileContent = JSON.stringify(summary, null, 2);
                    downloadLinks.json = generateDataURI(fileContent, 'application/json', `${baseFileName}.json`);
                    break;
                    
                case 'txt':
                    fileContent = generatePlainTextTranscript(summary);
                    downloadLinks.txt = generateDataURI(fileContent, 'text/plain', `${baseFileName}.txt`);
                    break;
                    
                case 'docx':
                    // For now, return a simple text format (in production, would generate actual DOCX)
                    fileContent = generateWordDocumentTranscript(summary);
                    downloadLinks.docx = generateDataURI(fileContent, 'text/plain', `${baseFileName}.docx`);
                    break;
                    
                default:
                    console.warn(`Unsupported format: ${format}`);
            }
        }

        sendSuccess(res, 200, { 
            downloadLinks,
            sessionId,
            timestamp,
            generatedFormats: Object.keys(downloadLinks)
        }, 'Transcript files generated successfully');

    } catch (error) {
        console.error('Error generating transcript files:', error);
        return next(new AppError('Failed to generate transcript files', 500));
    }
}));

// Helper function to generate data URI for immediate download
function generateDataURI(content, mimeType, filename) {
    const base64Content = Buffer.from(content, 'utf8').toString('base64');
    return `data:${mimeType};charset=utf-8;base64,${base64Content}`;
}

// Generate plain text transcript
function generatePlainTextTranscript(summary) {
    let text = '';
    
    // Header
    text += `VOICE CALL TRANSCRIPT & SUMMARY\n`;
    text += `=====================================\n\n`;
    
    // Metadata
    if (summary.metadata) {
        text += `Call Date: ${summary.metadata.callDate}\n`;
        text += `Call Time: ${summary.metadata.callTime}\n`;
        text += `Duration: ${summary.metadata.duration}\n`;
        text += `Participants: ${summary.metadata.participantCount}\n`;
        
        if (summary.metadata.project) {
            text += `Project: ${summary.metadata.project.name}\n`;
            text += `Project Number: #${summary.metadata.project.number}\n`;
            if (summary.metadata.project.address) {
                text += `Address: ${summary.metadata.project.address}\n`;
            }
        }
        text += `\n`;
    }
    
    // Executive Summary
    text += `EXECUTIVE SUMMARY\n`;
    text += `=================\n`;
    text += `${summary.executiveSummary}\n\n`;
    
    // Key Decisions
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
        text += `KEY DECISIONS & APPROVALS\n`;
        text += `========================\n`;
        summary.keyDecisions.forEach((decision, index) => {
            text += `${index + 1}. ${decision.decision}\n`;
            text += `   Speaker: ${decision.speaker}\n`;
            text += `   Time: ${new Date(decision.timestamp).toLocaleTimeString()}\n\n`;
        });
    }
    
    // Action Items
    if (summary.actionItems && summary.actionItems.length > 0) {
        text += `ACTION ITEMS\n`;
        text += `============\n`;
        summary.actionItems.forEach((item, index) => {
            text += `${index + 1}. ${item.action}\n`;
            text += `   Assignee: ${item.assignee}\n`;
            text += `   Priority: ${item.priority}\n\n`;
        });
    }
    
    // Materials
    if (summary.materialsList && summary.materialsList.length > 0) {
        text += `MATERIALS DISCUSSED\n`;
        text += `===================\n`;
        summary.materialsList.forEach((material, index) => {
            text += `${index + 1}. ${material.material}\n`;
            text += `   Context: "${material.mentioned}"\n\n`;
        });
    }
    
    // Risks
    if (summary.risks && summary.risks.length > 0) {
        text += `RISKS & OPEN ISSUES\n`;
        text += `===================\n`;
        summary.risks.forEach((risk, index) => {
            text += `${index + 1}. ${risk.risk}\n`;
            text += `   Severity: ${risk.severity}\n`;
            text += `   Status: ${risk.status}\n\n`;
        });
    }
    
    // Full Transcript
    text += `FULL CONVERSATION TRANSCRIPT\n`;
    text += `============================\n`;
    if (summary.fullTranscript && summary.fullTranscript.length > 0) {
        summary.fullTranscript.forEach((exchange, index) => {
            const time = new Date(exchange.timestamp).toLocaleTimeString();
            const speaker = exchange.speaker === 'User' ? 'You' : 'Assistant';
            text += `[${time}] ${speaker}: ${exchange.message}\n`;
            if (exchange.confidence !== 'high') {
                text += `   (${exchange.confidence} confidence)\n`;
            }
            text += `\n`;
        });
    } else {
        text += `No transcript available.\n\n`;
    }
    
    // Footer
    text += `\n=====================================\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `Generated by: Bubbles AI Assistant\n`;
    
    return text;
}

// Generate Word document transcript (simplified)
function generateWordDocumentTranscript(summary) {
    // For now, return formatted text (in production, would generate actual DOCX)
    let doc = '';
    
    doc += `VOICE CALL TRANSCRIPT & SUMMARY\n\n`;
    
    if (summary.metadata && summary.metadata.project) {
        doc += `Project: ${summary.metadata.project.name}\n`;
        doc += `Date: ${summary.metadata.callDate}\n`;
        doc += `Duration: ${summary.metadata.duration}\n\n`;
    }
    
    doc += `EXECUTIVE SUMMARY\n`;
    doc += `${summary.executiveSummary}\n\n`;
    
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
        doc += `KEY DECISIONS:\n`;
        summary.keyDecisions.forEach((decision, index) => {
            doc += `• ${decision.decision}\n`;
        });
        doc += `\n`;
    }
    
    if (summary.actionItems && summary.actionItems.length > 0) {
        doc += `ACTION ITEMS:\n`;
        summary.actionItems.forEach((item, index) => {
            doc += `• ${item.action} (${item.assignee})\n`;
        });
        doc += `\n`;
    }
    
    doc += `FULL TRANSCRIPT:\n`;
    if (summary.fullTranscript && summary.fullTranscript.length > 0) {
        summary.fullTranscript.forEach((exchange, index) => {
            const time = new Date(exchange.timestamp).toLocaleTimeString();
            const speaker = exchange.speaker === 'User' ? 'Customer' : 'Assistant';
            doc += `[${time}] ${speaker}: ${exchange.message}\n`;
        });
    }
    
    return doc;
}

// Generate HTML that can be printed/saved as PDF
function generatePDFHTMLTranscript(summary) {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Voice Call Transcript</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        .metadata {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .metadata-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .metadata-item {
            display: flex;
        }
        .metadata-label {
            font-weight: bold;
            margin-right: 10px;
            min-width: 100px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            background: #2563eb;
            color: white;
            padding: 12px 20px;
            margin: 0 0 20px 0;
            border-radius: 6px;
            font-size: 18px;
            font-weight: bold;
        }
        .decision-item, .action-item, .material-item, .risk-item {
            background: #f9fafb;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 0 6px 6px 0;
        }
        .action-item {
            border-left-color: #f59e0b;
        }
        .material-item {
            border-left-color: #8b5cf6;
        }
        .risk-item {
            border-left-color: #ef4444;
        }
        .transcript-entry {
            margin-bottom: 15px;
            padding: 15px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
        }
        .speaker {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .user { color: #2563eb; }
        .assistant { color: #059669; }
        .timestamp {
            font-size: 12px;
            color: #6b7280;
            float: right;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        .executive-summary {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 0 6px 6px 0;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        .badge-high { background: #fee2e2; color: #dc2626; }
        .badge-medium { background: #fef3c7; color: #d97706; }
        .badge-low { background: #d1fae5; color: #059669; }
        @media print {
            body { margin: 20px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🏗️ Kenstruction Voice Call Transcript</div>
        <div class="subtitle">Professional Construction Project Management</div>
    </div>

    <div class="metadata">
        <div class="metadata-grid">
            <div class="metadata-item">
                <span class="metadata-label">Date:</span>
                <span>${summary.metadata?.callDate || currentDate}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Time:</span>
                <span>${summary.metadata?.callTime || currentTime}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Duration:</span>
                <span>${summary.metadata?.duration || 'Unknown'}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Participants:</span>
                <span>${summary.metadata?.participantCount || 1}</span>
            </div>`;

    if (summary.metadata?.project) {
        html += `
            <div class="metadata-item">
                <span class="metadata-label">Project:</span>
                <span>${summary.metadata.project.name}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Project #:</span>
                <span>#${summary.metadata.project.number}</span>
            </div>`;
        
        if (summary.metadata.project.address) {
            html += `
            <div class="metadata-item" style="grid-column: 1 / -1;">
                <span class="metadata-label">Address:</span>
                <span>${summary.metadata.project.address}</span>
            </div>`;
        }
    }
    
    html += `
        </div>
    </div>

    <div class="section">
        <div class="executive-summary">
            <h2 style="margin-top: 0; color: #2563eb;">Executive Summary</h2>
            <p style="margin-bottom: 0;">${summary.executiveSummary || 'No summary available.'}</p>
        </div>
    </div>`;

    // Key Decisions
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
        html += `
    <div class="section">
        <h2 class="section-title">Key Decisions & Approvals</h2>`;
        
        summary.keyDecisions.forEach((decision, index) => {
            html += `
        <div class="decision-item">
            <strong>${decision.decision}</strong>
            <div style="margin-top: 8px; font-size: 13px; color: #6b7280;">
                <strong>Speaker:</strong> ${decision.speaker} • 
                <strong>Time:</strong> ${new Date(decision.timestamp).toLocaleTimeString()}
            </div>
        </div>`;
        });
        
        html += `
    </div>`;
    }

    // Action Items
    if (summary.actionItems && summary.actionItems.length > 0) {
        html += `
    <div class="section">
        <h2 class="section-title">Action Items</h2>`;
        
        summary.actionItems.forEach((item, index) => {
            const badgeClass = item.priority === 'high' ? 'badge-high' : 
                              item.priority === 'medium' ? 'badge-medium' : 'badge-low';
            html += `
        <div class="action-item">
            <strong>${item.action}</strong>
            <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 13px; color: #6b7280;"><strong>Assignee:</strong> ${item.assignee}</span>
                <span class="badge ${badgeClass}">${item.priority} priority</span>
            </div>
        </div>`;
        });
        
        html += `
    </div>`;
    }

    // Materials
    if (summary.materialsList && summary.materialsList.length > 0) {
        html += `
    <div class="section">
        <h2 class="section-title">Materials Discussed</h2>`;
        
        summary.materialsList.forEach((material, index) => {
            html += `
        <div class="material-item">
            <strong>${material.material}</strong>
            <div style="margin-top: 5px; font-size: 13px; color: #6b7280; font-style: italic;">
                "${material.mentioned}"
            </div>
        </div>`;
        });
        
        html += `
    </div>`;
    }

    // Risks
    if (summary.risks && summary.risks.length > 0) {
        html += `
    <div class="section">
        <h2 class="section-title">Risks & Open Issues</h2>`;
        
        summary.risks.forEach((risk, index) => {
            const badgeClass = risk.severity === 'high' ? 'badge-high' : 
                              risk.severity === 'medium' ? 'badge-medium' : 'badge-low';
            html += `
        <div class="risk-item">
            <strong>${risk.risk}</strong>
            <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                <span class="badge ${badgeClass}">${risk.severity} severity</span>
                <span style="font-size: 13px; color: #6b7280;">${risk.status}</span>
            </div>
        </div>`;
        });
        
        html += `
    </div>`;
    }

    // Full Transcript
    html += `
    <div class="section">
        <h2 class="section-title">Full Conversation Transcript</h2>`;
    
    if (summary.fullTranscript && summary.fullTranscript.length > 0) {
        summary.fullTranscript.forEach((exchange, index) => {
            const speakerClass = exchange.speaker === 'User' ? 'user' : 'assistant';
            const speakerLabel = exchange.speaker === 'User' ? '👤 Customer' : '🤖 Bubbles AI';
            const time = new Date(exchange.timestamp).toLocaleTimeString();
            
            html += `
        <div class="transcript-entry">
            <div class="speaker ${speakerClass}">
                ${speakerLabel}
                <span class="timestamp">${time}</span>
            </div>
            <div>${exchange.message}</div>`;
            
            if (exchange.confidence !== 'high') {
                html += `
            <div style="margin-top: 5px;">
                <span class="badge badge-medium">${exchange.confidence} confidence</span>
            </div>`;
            }
            
            html += `
        </div>`;
        });
    } else {
        html += `<p>No transcript available.</p>`;
    }
    
    html += `
    </div>

    <div class="footer">
        <p><strong>Generated:</strong> ${currentDate} at ${currentTime}</p>
        <p><strong>Generated by:</strong> Bubbles AI Assistant | Kenstruction Project Management System</p>
        <p style="font-style: italic;">This document contains confidential project information.</p>
    </div>
</body>
</html>`;

    return html;
}

module.exports = router;