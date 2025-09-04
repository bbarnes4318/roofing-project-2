const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGeneratorService {
    constructor() {
        this.primaryColor = '#2563eb';
        this.secondaryColor = '#059669';
        this.dangerColor = '#ef4444';
        this.warningColor = '#f59e0b';
    }

    async generateCertificateOfCompletionPDF(outputFilePath, data = {}, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                const writeStream = fs.createWriteStream(outputFilePath);
                doc.pipe(writeStream);

                // Header Logo
                try {
                    const logoCandidates = [
                        path.join(__dirname, '..', '..', 'public', 'upfront-red.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo-3.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo.png'),
                        path.join(__dirname, '..', 'uploads', 'company-assets', 'upfront-red.png')
                    ];
                    const logoPath = logoCandidates.find(p => fs.existsSync(p));
                    if (logoPath) {
                        doc.image(logoPath, 440, 40, { width: 120 });
                    }
                } catch (_) {}

                // Title
                doc.font('Helvetica-Bold').fontSize(18).fill('#111827');
                doc.text('Certificate of Completion', 50, 60, { align: 'left' });

                // Top fields row labels
                doc.moveDown(2);
                const startY = doc.y;
                const labelFont = 'Helvetica';
                doc.font(labelFont).fontSize(10).fill('#111827');
                const col1X = 50, col2X = 220, col3X = 400;
                const underline = (x, y, width) => {
                    doc.moveTo(x, y + 12).lineTo(x + width, y + 12).stroke('#e11d48');
                };

                // Values
                const jobNumber = data.project_number || data.projectNumber || '';
                const customerName = data.customer_name || data.customerName || '';
                const address = data.address || data.location || '';

                doc.text('Job Number', col1X, startY);
                underline(col1X, startY, 120);
                doc.text('Customer Name', col2X, startY);
                underline(col2X, startY, 150);
                doc.text('Address', col3X, startY);
                underline(col3X, startY, 150);

                // Overlay values above lines
                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(String(jobNumber || ''), col1X + 2, startY - 2, { width: 120 });
                doc.text(String(customerName || ''), col2X + 2, startY - 2, { width: 150 });
                doc.text(String(address || ''), col3X + 2, startY - 2, { width: 180 });

                doc.moveDown(2);

                // Completion section
                doc.font('Helvetica-Bold').fontSize(11).fill('#111827');
                doc.text('Completion', 50, doc.y);
                doc.moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).stroke('#e11d48');
                doc.moveDown(0.8);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                const paragraphs = [
                    'Thank you for the opportunity to serve you! If you have any additional questions or concerns, please contact us.',
                    'The undersigned certifies, to the best of their knowledge, that the work covered by the "Customer Agreement", between Upfront Restoration & Roofing, Inc. and the homeowner or their representative, has been completed.',
                    'The undersigned has reviewed all work performed and completed by Upfront Restoration & Roofing and certifies that materials supplied by the Contractor and the work performed have been done to their satisfaction.',
                    'All contractors, subcontractors, and suppliers who provided labor or materials in connection with the repairs to this property are authorized to be paid in full from insurance proceeds.'
                ];
                paragraphs.forEach(p => {
                    doc.text(p, 50, doc.y + 6, { width: 512, align: 'left' });
                    doc.moveDown(0.6);
                });

                doc.moveDown(1.2);

                // Signature section
                doc.font('Helvetica-Bold').fontSize(11).fill('#111827');
                doc.text('Signature', 50, doc.y);
                doc.moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).stroke('#e11d48');
                doc.moveDown(1.5);

                const sigY = doc.y;
                // Lines
                doc.moveTo(50, sigY).lineTo(260, sigY).stroke('#9ca3af'); // signature line
                doc.moveTo(320, sigY).lineTo(562, sigY).stroke('#9ca3af'); // date line

                // Captions
                doc.font('Helvetica').fontSize(9).fill('#6b7280');
                doc.text('Homeowner or Representative', 50, sigY + 4, { width: 210 });
                doc.text('Date', 320, sigY + 4, { width: 210 });

                // Filled values (optional)
                const signature = data.signature || customerName || '';
                const date = data.date || '';
                doc.font('Helvetica').fontSize(10).fill('#111827');
                if (signature) doc.text(String(signature), 52, sigY - 14, { width: 208 });
                if (date) doc.text(String(date), 322, sigY - 14, { width: 208 });

                doc.end();

                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            } catch (err) {
                reject(err);
            }
        });
    }
    async generateTranscriptPDF(summary) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'LETTER',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    },
                    info: {
                        Title: 'Voice Call Transcript & Summary',
                        Author: 'Kenstruction AI Assistant',
                        Subject: 'Project Discussion Transcript',
                        Keywords: 'roofing, construction, transcript, summary',
                        CreationDate: new Date()
                    }
                });

                // Collect PDF data
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });

                // Header with logo and title
                this.addHeader(doc, summary);

                // Executive Summary
                this.addExecutiveSummary(doc, summary);

                // Project Status
                if (summary.projectStatus) {
                    this.addSection(doc, 'PROJECT STATUS', summary.projectStatus, 'status');
                }

                // Key Decisions
                if (summary.keyDecisions && summary.keyDecisions.length > 0) {
                    this.addKeyDecisions(doc, summary.keyDecisions);
                }

                // Action Items
                if (summary.actionItems && summary.actionItems.length > 0) {
                    this.addActionItems(doc, summary.actionItems);
                }

                // Materials and Specifications
                if (summary.materialsAndSpecifications && summary.materialsAndSpecifications.length > 0) {
                    this.addMaterials(doc, summary.materialsAndSpecifications);
                }

                // Schedule and Timeline
                if (summary.scheduleAndTimeline) {
                    this.addSchedule(doc, summary.scheduleAndTimeline);
                }

                // Risks and Issues
                if (summary.risksAndIssues && summary.risksAndIssues.length > 0) {
                    this.addRisks(doc, summary.risksAndIssues);
                }

                // Budget and Costs
                if (summary.budgetAndCosts) {
                    this.addBudget(doc, summary.budgetAndCosts);
                }

                // Technical Details
                if (summary.technicalDetails && summary.technicalDetails.length > 0) {
                    this.addTechnicalDetails(doc, summary.technicalDetails);
                }

                // Next Steps
                if (summary.nextSteps && summary.nextSteps.length > 0) {
                    this.addNextSteps(doc, summary.nextSteps);
                }

                // Full Transcript
                this.addFullTranscript(doc, summary.fullTranscript);

                // Footer
                this.addFooter(doc);

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    addHeader(doc, summary) {
        // Company logo/name
        doc.fontSize(24)
           .fillColor(this.primaryColor)
           .text('🏗️ Kenstruction', 50, 50)
           .fontSize(10)
           .fillColor('#666666')
           .text('Professional Construction Project Management', 50, 80);

        // Document title
        doc.fontSize(18)
           .fillColor('#000000')
           .text('Voice Call Transcript & Summary', 50, 110);

        // Metadata box
        doc.roundedRect(50, 140, 512, 80, 5)
           .stroke('#e5e7eb');

        const metadata = summary.metadata || {};
        doc.fontSize(9)
           .fillColor('#333333');

        // Two column layout for metadata
        const col1X = 60;
        const col2X = 300;
        let yPos = 150;

        doc.text(`Date: ${metadata.callDate || 'N/A'}`, col1X, yPos);
        doc.text(`Duration: ${metadata.duration || 'N/A'}`, col2X, yPos);
        
        yPos += 15;
        doc.text(`Time: ${metadata.callTime || 'N/A'}`, col1X, yPos);
        doc.text(`Participants: ${metadata.participantCount || 'N/A'}`, col2X, yPos);

        if (metadata.project) {
            yPos += 15;
            doc.text(`Project: ${metadata.project.name}`, col1X, yPos);
            doc.text(`Project #: ${metadata.project.number}`, col2X, yPos);
            
            if (metadata.project.address) {
                yPos += 15;
                doc.text(`Address: ${metadata.project.address}`, col1X, yPos, { width: 450 });
            }
        }

        doc.moveDown(3);
    }

    addExecutiveSummary(doc, summary) {
        doc.y = 240;
        this.addSectionTitle(doc, 'EXECUTIVE SUMMARY');
        
        doc.fontSize(10)
           .fillColor('#333333')
           .text(summary.executiveSummary || 'No executive summary available.', 50, doc.y, {
               width: 512,
               align: 'justify',
               lineGap: 2
           });
        
        doc.moveDown();
    }

    addKeyDecisions(doc, decisions) {
        this.addSectionTitle(doc, 'KEY DECISIONS & APPROVALS');
        
        decisions.forEach((decision, index) => {
            // Decision box
            doc.roundedRect(50, doc.y, 512, 60, 3)
               .fillAndStroke('#f0fdf4', '#10b981');
            
            const startY = doc.y + 10;
            
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(`${index + 1}. ${decision.decision}`, 60, startY, { width: 492 });
            
            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#666666');
            
            if (decision.rationale) {
                doc.text(`Rationale: ${decision.rationale}`, 60, doc.y + 5, { width: 492 });
            }
            
            const detailsY = doc.y + 5;
            doc.text(`Speaker: ${decision.speaker || 'N/A'}`, 60, detailsY);
            if (decision.impact) {
                doc.text(`Impact: ${decision.impact}`, 250, detailsY);
            }
            
            doc.y = startY + 60 + 10;
        });
        
        doc.moveDown();
    }

    addActionItems(doc, actions) {
        this.addSectionTitle(doc, 'ACTION ITEMS');
        
        actions.forEach((item, index) => {
            const priorityColor = item.priority === 'high' ? '#fee2e2' : 
                                 item.priority === 'medium' ? '#fef3c7' : '#d1fae5';
            
            doc.roundedRect(50, doc.y, 512, 70, 3)
               .fillAndStroke('#fffbeb', '#f59e0b');
            
            const startY = doc.y + 10;
            
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(`${index + 1}. ${item.action}`, 60, startY, { width: 492 });
            
            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#666666');
            
            const detailsY = doc.y + 8;
            doc.text(`Assignee: ${item.assignee || 'TBD'}`, 60, detailsY);
            doc.text(`Due: ${item.dueDate || 'TBD'}`, 200, detailsY);
            doc.text(`Priority: ${item.priority || 'medium'}`, 340, detailsY);
            
            if (item.dependencies) {
                doc.text(`Dependencies: ${item.dependencies}`, 60, doc.y + 5, { width: 492 });
            }
            
            doc.y = startY + 70 + 10;
        });
        
        doc.moveDown();
    }

    addMaterials(doc, materials) {
        this.addSectionTitle(doc, 'MATERIALS & SPECIFICATIONS');
        
        // Create a table
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 200;
        const col3 = 320;
        const col4 = 420;
        const col5 = 490;
        
        // Table header
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#ffffff');
        
        doc.rect(col1, tableTop, 512, 20)
           .fill(this.primaryColor);
        
        doc.text('Material', col1 + 5, tableTop + 5, { width: col2 - col1 - 10 });
        doc.text('Quantity', col2 + 5, tableTop + 5, { width: col3 - col2 - 10 });
        doc.text('Specifications', col3 + 5, tableTop + 5, { width: col4 - col3 - 10 });
        doc.text('Cost', col4 + 5, tableTop + 5, { width: col5 - col4 - 10 });
        doc.text('Lead Time', col5 + 5, tableTop + 5, { width: 562 - col5 - 10 });
        
        // Table rows
        let currentY = tableTop + 20;
        doc.font('Helvetica')
           .fontSize(8)
           .fillColor('#333333');
        
        materials.forEach((material, index) => {
            const rowHeight = 25;
            const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
            
            doc.rect(col1, currentY, 512, rowHeight)
               .fill(bgColor);
            
            doc.fillColor('#333333');
            doc.text(material.item || 'N/A', col1 + 5, currentY + 5, { width: col2 - col1 - 10 });
            doc.text(material.quantity || 'N/A', col2 + 5, currentY + 5, { width: col3 - col2 - 10 });
            doc.text(material.specifications || 'N/A', col3 + 5, currentY + 5, { width: col4 - col3 - 10 });
            doc.text(material.cost || 'N/A', col4 + 5, currentY + 5, { width: col5 - col4 - 10 });
            doc.text(material.leadTime || 'N/A', col5 + 5, currentY + 5, { width: 562 - col5 - 10 });
            
            currentY += rowHeight;
        });
        
        doc.y = currentY + 10;
        doc.moveDown();
    }

    addSchedule(doc, schedule) {
        this.addSectionTitle(doc, 'SCHEDULE & TIMELINE');
        
        doc.fontSize(9)
           .fillColor('#333333');
        
        // Current Phase
        doc.font('Helvetica-Bold')
           .text('Current Phase:', 50, doc.y);
        doc.font('Helvetica')
           .text(schedule.currentPhase || 'Not specified', 150, doc.y - 9);
        
        doc.moveDown(0.5);
        
        // Critical Path
        if (schedule.criticalPath) {
            doc.font('Helvetica-Bold')
               .text('Critical Path:', 50, doc.y);
            doc.font('Helvetica')
               .text(schedule.criticalPath, 150, doc.y - 9, { width: 412 });
            doc.moveDown(0.5);
        }
        
        // Upcoming Milestones
        if (schedule.upcomingMilestones && schedule.upcomingMilestones.length > 0) {
            doc.font('Helvetica-Bold')
               .text('Upcoming Milestones:', 50, doc.y);
            doc.moveDown(0.3);
            
            schedule.upcomingMilestones.forEach(milestone => {
                doc.font('Helvetica')
                   .text(`• ${milestone.milestone} - Target: ${milestone.targetDate || 'TBD'}`, 70, doc.y);
                doc.moveDown(0.3);
            });
        }
        
        doc.moveDown();
    }

    addRisks(doc, risks) {
        this.addSectionTitle(doc, 'RISKS & ISSUES');
        
        risks.forEach((risk, index) => {
            const severityColor = risk.severity === 'high' ? '#fee2e2' : 
                                 risk.severity === 'medium' ? '#fef3c7' : '#d1fae5';
            
            doc.roundedRect(50, doc.y, 512, 55, 3)
               .fillAndStroke('#fef2f2', '#ef4444');
            
            const startY = doc.y + 10;
            
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(`${index + 1}. ${risk.risk}`, 60, startY, { width: 492 });
            
            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#666666');
            
            const detailsY = doc.y + 8;
            doc.text(`Severity: ${risk.severity || 'medium'}`, 60, detailsY);
            doc.text(`Status: ${risk.status || 'open'}`, 200, detailsY);
            
            if (risk.mitigation) {
                doc.text(`Mitigation: ${risk.mitigation}`, 60, doc.y + 5, { width: 492 });
            }
            
            doc.y = startY + 55 + 10;
        });
        
        doc.moveDown();
    }

    addBudget(doc, budget) {
        this.addSectionTitle(doc, 'BUDGET & COSTS');
        
        doc.fontSize(9)
           .fillColor('#333333');
        
        // Discussed Costs
        if (budget.discussedCosts && budget.discussedCosts.length > 0) {
            doc.font('Helvetica-Bold')
               .text('Discussed Costs:', 50, doc.y);
            doc.moveDown(0.3);
            
            budget.discussedCosts.forEach(cost => {
                doc.font('Helvetica')
                   .text(`• ${cost}`, 70, doc.y);
                doc.moveDown(0.3);
            });
            doc.moveDown(0.5);
        }
        
        // Approved Expenses
        if (budget.approvedExpenses && budget.approvedExpenses.length > 0) {
            doc.font('Helvetica-Bold')
               .text('Approved Expenses:', 50, doc.y);
            doc.moveDown(0.3);
            
            budget.approvedExpenses.forEach(expense => {
                doc.font('Helvetica')
                   .text(`• ${expense}`, 70, doc.y);
                doc.moveDown(0.3);
            });
            doc.moveDown(0.5);
        }
        
        // Cost Saving Opportunities
        if (budget.costSavingOpportunities && budget.costSavingOpportunities.length > 0) {
            doc.font('Helvetica-Bold')
               .text('Cost Saving Opportunities:', 50, doc.y);
            doc.moveDown(0.3);
            
            budget.costSavingOpportunities.forEach(opportunity => {
                doc.font('Helvetica')
                   .text(`• ${opportunity}`, 70, doc.y);
                doc.moveDown(0.3);
            });
        }
        
        doc.moveDown();
    }

    addTechnicalDetails(doc, details) {
        this.addSectionTitle(doc, 'TECHNICAL DETAILS');
        
        details.forEach((detail, index) => {
            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text(`${index + 1}. ${detail.aspect}`, 50, doc.y);
            
            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#666666');
            
            if (detail.requirement) {
                doc.text(`Requirement: ${detail.requirement}`, 70, doc.y, { width: 492 });
            }
            if (detail.solution) {
                doc.text(`Solution: ${detail.solution}`, 70, doc.y, { width: 492 });
            }
            if (detail.considerations) {
                doc.text(`Considerations: ${detail.considerations}`, 70, doc.y, { width: 492 });
            }
            
            doc.moveDown(0.5);
        });
        
        doc.moveDown();
    }

    addNextSteps(doc, steps) {
        this.addSectionTitle(doc, 'NEXT STEPS');
        
        steps.forEach((step, index) => {
            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text(`${index + 1}. ${step.step}`, 50, doc.y);
            
            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#666666');
            
            const detailsY = doc.y;
            if (step.timing) {
                doc.text(`When: ${step.timing}`, 70, detailsY);
            }
            if (step.responsible) {
                doc.text(`Responsible: ${step.responsible}`, 250, detailsY - 8);
            }
            
            doc.moveDown(0.5);
        });
        
        doc.moveDown();
    }

    addFullTranscript(doc, transcript) {
        // Start new page for transcript
        doc.addPage();
        
        this.addSectionTitle(doc, 'FULL CONVERSATION TRANSCRIPT');
        
        if (!transcript || transcript.length === 0) {
            doc.fontSize(9)
               .fillColor('#666666')
               .text('No transcript available.', 50, doc.y);
            return;
        }
        
        transcript.forEach((entry, index) => {
            const speakerColor = entry.speaker === 'User' ? this.primaryColor : this.secondaryColor;
            const time = new Date(entry.timestamp).toLocaleTimeString();
            
            // Speaker and timestamp
            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor(speakerColor)
               .text(`${entry.speaker === 'User' ? '👤 Customer' : '🤖 AI Assistant'}`, 50, doc.y);
            
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#999999')
               .text(time, 500, doc.y - 9);
            
            // Message
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#333333')
               .text(entry.message, 50, doc.y + 2, { width: 512 });
            
            // Confidence indicator if not high
            if (entry.confidence && entry.confidence !== 'high') {
                doc.fontSize(8)
                   .fillColor('#999999')
                   .text(`(${entry.confidence} confidence)`, 50, doc.y);
            }
            
            doc.moveDown(0.5);
            
            // Check if we need a new page
            if (doc.y > 700) {
                doc.addPage();
            }
        });
    }

    addFooter(doc) {
        const pageCount = doc.bufferedPageRange().count;
        
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            
            // Footer line
            doc.moveTo(50, 742)
               .lineTo(562, 742)
               .stroke('#e5e7eb');
            
            // Footer text
            doc.fontSize(8)
               .fillColor('#999999')
               .text(`Page ${i + 1} of ${pageCount}`, 50, 750, { align: 'center', width: 512 });
            
            doc.fontSize(7)
               .text('Generated by Kenstruction AI Assistant', 50, 762, { align: 'center', width: 512 })
               .text(`Generated: ${new Date().toLocaleString()}`, 50, 772, { align: 'center', width: 512 });
        }
    }

    addSectionTitle(doc, title) {
        // Check if we need a new page
        if (doc.y > 650) {
            doc.addPage();
        }
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(this.primaryColor)
           .text(title, 50, doc.y);
        
        doc.moveTo(50, doc.y)
           .lineTo(562, doc.y)
           .stroke(this.primaryColor);
        
        doc.moveDown(0.5);
    }

    addSection(doc, title, content, type = 'default') {
        this.addSectionTitle(doc, title);
        
        const bgColor = type === 'status' ? '#eff6ff' : '#f9fafb';
        
        doc.roundedRect(50, doc.y, 512, 40, 3)
           .fill(bgColor);
        
        doc.fontSize(10)
           .fillColor('#333333')
           .text(content, 60, doc.y + 10, { width: 492 });
        
        doc.y += 50;
        doc.moveDown();
    }

    // ========================================
    // NEW TEMPLATE METHODS
    // ========================================

    async generate2YearWarrantyPDF(outputFilePath, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                const writeStream = fs.createWriteStream(outputFilePath);
                doc.pipe(writeStream);

                // Header Logo
                try {
                    const logoCandidates = [
                        path.join(__dirname, '..', '..', 'public', 'upfront-red.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo-3.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo.png')
                    ];
                    const logoPath = logoCandidates.find(p => fs.existsSync(p));
                    if (logoPath) {
                        doc.image(logoPath, 440, 40, { width: 120 });
                    }
                } catch (_) {}

                // Title
                doc.font('Helvetica-Bold').fontSize(24).fill('#111827');
                doc.text('2-YEAR WARRANTY', 50, 60, { align: 'center', width: 512 });

                // Company Info
                doc.font('Helvetica').fontSize(14).fill('#111827');
                doc.text('UPFRONT RESTORATION & ROOFING', 50, 90, { align: 'center', width: 512 });

                doc.moveDown(3);

                // Project Information Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Project Information:', 50, doc.y);
                doc.moveDown(0.5);

                const startY = doc.y;
                const labelFont = 'Helvetica';
                doc.font(labelFont).fontSize(10).fill('#111827');

                // Labels and underlines
                doc.text('Project Number:', 50, startY);
                doc.text('Customer Name:', 50, startY + 25);
                doc.text('Property Address:', 50, startY + 50);

                // Values
                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(String(data.project_number || ''), 150, startY);
                doc.text(String(data.customer_name || ''), 150, startY + 25);
                doc.text(String(data.property_address || ''), 150, startY + 50);

                // Underlines
                doc.moveTo(150, startY + 12).lineTo(450, startY + 12).stroke('#e11d48');
                doc.moveTo(150, startY + 37).lineTo(450, startY + 37).stroke('#e11d48');
                doc.moveTo(150, startY + 62).lineTo(450, startY + 62).stroke('#e11d48');

                doc.moveDown(2);

                // Warranty Details Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Warranty Details:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(`Start Date: ${data.warranty_start_date || ''}`, 50, doc.y);
                doc.text(`End Date: ${data.warranty_end_date || ''}`, 50, doc.y + 20);
                doc.text(`Materials: ${data.roofing_materials || ''}`, 50, doc.y + 40);

                doc.moveDown(2);

                // Coverage Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Coverage:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(data.coverage_details || 'Standard 2-year warranty coverage for roofing materials and workmanship.', 50, doc.y, { width: 512 });

                doc.moveDown(2);

                // Signature Section
                if (data.signature) {
                    doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                    doc.text('Customer Signature:', 50, doc.y);
                    doc.moveDown(0.5);

                    doc.font('Helvetica').fontSize(10).fill('#111827');
                    doc.text(data.signature, 50, doc.y);
                    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#e11d48');
                }

                doc.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async generate5YearWarrantyPDF(outputFilePath, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                const writeStream = fs.createWriteStream(outputFilePath);
                doc.pipe(writeStream);

                // Header Logo
                try {
                    const logoCandidates = [
                        path.join(__dirname, '..', '..', 'public', 'upfront-red.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo-3.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo.png')
                    ];
                    const logoPath = logoCandidates.find(p => fs.existsSync(p));
                    if (logoPath) {
                        doc.image(logoPath, 440, 40, { width: 120 });
                    }
                } catch (_) {}

                // Title
                doc.font('Helvetica-Bold').fontSize(24).fill('#111827');
                doc.text('5-YEAR UPFRONT WARRANTY', 50, 60, { align: 'center', width: 512 });

                // Company Info
                doc.font('Helvetica').fontSize(14).fill('#111827');
                doc.text('UPFRONT RESTORATION & ROOFING', 50, 90, { align: 'center', width: 512 });

                doc.moveDown(3);

                // Project Information Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Project Information:', 50, doc.y);
                doc.moveDown(0.5);

                const startY = doc.y;
                doc.font('Helvetica').fontSize(10).fill('#111827');

                // Labels and values
                doc.text('Project Number:', 50, startY);
                doc.text(String(data.project_number || ''), 150, startY);
                doc.text('Customer Name:', 50, startY + 25);
                doc.text(String(data.customer_name || ''), 150, startY + 25);
                doc.text('Property Address:', 50, startY + 50);
                doc.text(String(data.property_address || ''), 150, startY + 50);

                // Underlines
                doc.moveTo(150, startY + 12).lineTo(450, startY + 12).stroke('#e11d48');
                doc.moveTo(150, startY + 37).lineTo(450, startY + 37).stroke('#e11d48');
                doc.moveTo(150, startY + 62).lineTo(450, startY + 62).stroke('#e11d48');

                doc.moveDown(2);

                // Extended Warranty Details
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Extended Warranty Details:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(`Start Date: ${data.warranty_start_date || ''}`, 50, doc.y);
                doc.text(`End Date: ${data.warranty_end_date || ''}`, 50, doc.y + 20);
                doc.text(`Premium Amount: $${data.premium_amount || ''}`, 50, doc.y + 40);
                doc.text(`Deductible: $${data.deductible_amount || ''}`, 50, doc.y + 60);

                doc.moveDown(2);

                // Coverage Limits
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Coverage Limits:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(data.coverage_limits || 'Extended coverage with premium payment.', 50, doc.y, { width: 512 });

                doc.moveDown(2);

                // Signature Section
                if (data.signature) {
                    doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                    doc.text('Customer Signature:', 50, doc.y);
                    doc.moveDown(0.5);

                    doc.font('Helvetica').fontSize(10).fill('#111827');
                    doc.text(data.signature, 50, doc.y);
                    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#e11d48');
                }

                doc.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async generate3YearRoofCertificationPDF(outputFilePath, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                const writeStream = fs.createWriteStream(outputFilePath);
                doc.pipe(writeStream);

                // Header Logo
                try {
                    const logoCandidates = [
                        path.join(__dirname, '..', '..', 'public', 'upfront-red.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo-3.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo.png')
                    ];
                    const logoPath = logoCandidates.find(p => fs.existsSync(p));
                    if (logoPath) {
                        doc.image(logoPath, 440, 40, { width: 120 });
                    }
                } catch (_) {}

                // Title
                doc.font('Helvetica-Bold').fontSize(24).fill('#111827');
                doc.text('3-YEAR ROOF CERTIFICATION', 50, 60, { align: 'center', width: 512 });

                // Company Info
                doc.font('Helvetica').fontSize(14).fill('#111827');
                doc.text('UPFRONT RESTORATION & ROOFING', 50, 90, { align: 'center', width: 512 });

                doc.moveDown(3);

                // Certification Details Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Certification Details:', 50, doc.y);
                doc.moveDown(0.5);

                const startY = doc.y;
                doc.font('Helvetica').fontSize(10).fill('#111827');

                // Labels and values
                doc.text('Project Number:', 50, startY);
                doc.text(String(data.project_number || ''), 150, startY);
                doc.text('Customer Name:', 50, startY + 25);
                doc.text(String(data.customer_name || ''), 150, startY + 25);
                doc.text('Property Address:', 50, startY + 50);
                doc.text(String(data.property_address || ''), 150, startY + 50);
                doc.text('Start Date:', 50, startY + 75);
                doc.text(String(data.certification_start_date || ''), 150, startY + 75);
                doc.text('End Date:', 50, startY + 100);
                doc.text(String(data.certification_end_date || ''), 150, startY + 100);

                // Underlines
                doc.moveTo(150, startY + 12).lineTo(450, startY + 12).stroke('#e11d48');
                doc.moveTo(150, startY + 37).lineTo(450, startY + 37).stroke('#e11d48');
                doc.moveTo(150, startY + 62).lineTo(450, startY + 62).stroke('#e11d48');
                doc.moveTo(150, startY + 87).lineTo(450, startY + 87).stroke('#e11d48');
                doc.moveTo(150, startY + 112).lineTo(450, startY + 112).stroke('#e11d48');

                doc.moveDown(2);

                // Materials & Installation
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Materials & Installation:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(`Materials Used: ${data.roofing_materials || ''}`, 50, doc.y);
                doc.text(`Installation Date: ${data.installation_date || ''}`, 50, doc.y + 20);

                doc.moveDown(2);

                // Quality Standards
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Quality Standards:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(data.quality_standards || 'Meets all industry quality standards and building codes.', 50, doc.y, { width: 512 });

                doc.moveDown(2);

                // Certifying Authority
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Certifying Authority:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(data.certifying_authority || 'UPFRONT RESTORATION & ROOFING', 50, doc.y);

                doc.moveDown(2);

                // Signature Section
                if (data.signature) {
                    doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                    doc.text('Authorized Signature:', 50, doc.y);
                    doc.moveDown(0.5);

                    doc.font('Helvetica').fontSize(10).fill('#111827');
                    doc.text(data.signature, 50, doc.y);
                    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#e11d48');
                }

                doc.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async generateWarrantyTransferPDF(outputFilePath, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                const writeStream = fs.createWriteStream(outputFilePath);
                doc.pipe(writeStream);

                // Header Logo
                try {
                    const logoCandidates = [
                        path.join(__dirname, '..', '..', 'public', 'upfront-red.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo-3.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo.png')
                    ];
                    const logoPath = logoCandidates.find(p => fs.existsSync(p));
                    if (logoPath) {
                        doc.image(logoPath, 440, 40, { width: 120 });
                    }
                } catch (_) {}

                // Title
                doc.font('Helvetica-Bold').fontSize(24).fill('#111827');
                doc.text('WARRANTY/CERTIFICATION TRANSFER', 50, 60, { align: 'center', width: 512 });

                // Company Info
                doc.font('Helvetica').fontSize(14).fill('#111827');
                doc.text('UPFRONT RESTORATION & ROOFING', 50, 90, { align: 'center', width: 512 });

                doc.moveDown(3);

                // Transfer Details Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Transfer Details:', 50, doc.y);
                doc.moveDown(0.5);

                const startY = doc.y;
                doc.font('Helvetica').fontSize(10).fill('#111827');

                // Labels and values
                doc.text('Original Owner:', 50, startY);
                doc.text(String(data.original_owner_name || ''), 150, startY);
                doc.text('New Owner:', 50, startY + 25);
                doc.text(String(data.new_owner_name || ''), 150, startY + 25);
                doc.text('Property Address:', 50, startY + 50);
                doc.text(String(data.property_address || ''), 150, startY + 50);
                doc.text('Transfer Date:', 50, startY + 75);
                doc.text(String(data.transfer_date || ''), 150, startY + 75);

                // Underlines
                doc.moveTo(150, startY + 12).lineTo(450, startY + 12).stroke('#e11d48');
                doc.moveTo(150, startY + 37).lineTo(450, startY + 37).stroke('#e11d48');
                doc.moveTo(150, startY + 62).lineTo(450, startY + 62).stroke('#e11d48');
                doc.moveTo(150, startY + 87).lineTo(450, startY + 87).stroke('#e11d48');

                doc.moveDown(2);

                // Warranty Information
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Warranty Information:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(`Warranty Type: ${data.warranty_type || ''}`, 50, doc.y);
                doc.text(`Remaining Coverage: ${data.remaining_coverage || ''}`, 50, doc.y + 20);

                doc.moveDown(2);

                // Terms and Conditions
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Terms and Conditions:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(data.terms_conditions || 'Standard warranty transfer terms apply.', 50, doc.y, { width: 512 });

                doc.moveDown(2);

                // Signature Section
                if (data.signature) {
                    doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                    doc.text('Authorized Signature:', 50, doc.y);
                    doc.moveDown(0.5);

                    doc.font('Helvetica').fontSize(10).fill('#111827');
                    doc.text(data.signature, 50, doc.y);
                    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#e11d48');
                }

                doc.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async generateInspectionReportPDF(outputFilePath, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                const writeStream = fs.createWriteStream(outputFilePath);
                doc.pipe(writeStream);

                // Header Logo
                try {
                    const logoCandidates = [
                        path.join(__dirname, '..', '..', 'public', 'upfront-red.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo-3.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo.png')
                    ];
                    const logoPath = logoCandidates.find(p => fs.existsSync(p));
                    if (logoPath) {
                        doc.image(logoPath, 440, 40, { width: 120 });
                    }
                } catch (_) {}

                // Title
                doc.font('Helvetica-Bold').fontSize(24).fill('#111827');
                doc.text('ROOF INSPECTION REPORT', 50, 60, { align: 'center', width: 512 });

                // Company Info
                doc.font('Helvetica').fontSize(14).fill('#111827');
                doc.text('UPFRONT RESTORATION & ROOFING', 50, 90, { align: 'center', width: 512 });

                doc.moveDown(3);

                // Inspection Details Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Inspection Details:', 50, doc.y);
                doc.moveDown(0.5);

                const startY = doc.y;
                doc.font('Helvetica').fontSize(10).fill('#111827');

                // Labels and values
                doc.text('Inspection Date:', 50, startY);
                doc.text(String(data.inspection_date || ''), 150, startY);
                doc.text('Inspector Name:', 50, startY + 25);
                doc.text(String(data.inspector_name || ''), 150, startY + 25);
                doc.text('Property Address:', 50, startY + 50);
                doc.text(String(data.property_address || ''), 150, startY + 50);
                doc.text('Customer Name:', 50, startY + 75);
                doc.text(String(data.customer_name || ''), 150, startY + 75);

                // Underlines
                doc.moveTo(150, startY + 12).lineTo(450, startY + 12).stroke('#e11d48');
                doc.moveTo(150, startY + 37).lineTo(450, startY + 37).stroke('#e11d48');
                doc.moveTo(150, startY + 62).lineTo(450, startY + 62).stroke('#e11d48');
                doc.moveTo(150, startY + 87).lineTo(450, startY + 87).stroke('#e11d48');

                doc.moveDown(2);

                // Inspection Results
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Inspection Results:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(`Overall Condition: ${data.overall_condition || ''}`, 50, doc.y);
                doc.text(`Issues Found: ${data.issues_found || ''}`, 50, doc.y + 20);
                doc.text(`Recommendations: ${data.recommendations || ''}`, 50, doc.y + 40);

                doc.moveDown(2);

                // Next Steps
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Next Steps:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(data.next_steps || 'Schedule follow-up inspection if needed.', 50, doc.y, { width: 512 });

                doc.moveDown(2);

                // Signature Section
                if (data.signature) {
                    doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                    doc.text('Inspector Signature:', 50, doc.y);
                    doc.moveDown(0.5);

                    doc.font('Helvetica').fontSize(10).fill('#111827');
                    doc.text(data.signature, 50, doc.y);
                    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#e11d48');
                }

                doc.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async generateLeadBasedPaintPDF(outputFilePath, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                const writeStream = fs.createWriteStream(outputFilePath);
                doc.pipe(writeStream);

                // Header Logo
                try {
                    const logoCandidates = [
                        path.join(__dirname, '..', '..', 'public', 'upfront-red.png'),
                        path.join(__dirname, '..', '..', 'public', 'upfront-logo-3.png'),
                        path.join(__dirname, '..', 'public', 'upfront-logo.png')
                    ];
                    const logoPath = logoCandidates.find(p => fs.existsSync(p));
                    if (logoPath) {
                        doc.image(logoPath, 440, 40, { width: 120 });
                    }
                } catch (_) {}

                // Title
                doc.font('Helvetica-Bold').fontSize(24).fill('#111827');
                doc.text('LEAD-BASED PAINT CERTIFICATION', 50, 60, { align: 'center', width: 512 });

                // Company Info
                doc.font('Helvetica').fontSize(14).fill('#111827');
                doc.text('UPFRONT RESTORATION & ROOFING', 50, 90, { align: 'center', width: 512 });

                doc.moveDown(3);

                // Applicant Information Section
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Applicant Information:', 50, doc.y);
                doc.moveDown(0.5);

                const startY = doc.y;
                doc.font('Helvetica').fontSize(10).fill('#111827');

                // Labels and values
                doc.text('First Name:', 50, startY);
                doc.text(String(data.applicant_first_name || ''), 150, startY);
                doc.text('Last Name:', 50, startY + 25);
                doc.text(String(data.applicant_last_name || ''), 150, startY + 25);
                doc.text('Certification Type:', 50, startY + 50);
                doc.text(String(data.certification_type || ''), 150, startY + 50);
                doc.text('Property Address:', 50, startY + 75);
                doc.text(String(data.property_address || ''), 150, startY + 75);

                // Underlines
                doc.moveTo(150, startY + 12).lineTo(450, startY + 12).stroke('#e11d48');
                doc.moveTo(150, startY + 37).lineTo(450, startY + 37).stroke('#e11d48');
                doc.moveTo(150, startY + 62).lineTo(450, startY + 62).stroke('#e11d48');
                doc.moveTo(150, startY + 87).lineTo(450, startY + 87).stroke('#e11d48');

                doc.moveDown(2);

                // Certification Details
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Certification Details:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(`Issue Date: ${data.issue_date || ''}`, 50, doc.y);
                doc.text(`Expiration Date: ${data.expiration_date || ''}`, 50, doc.y + 20);
                doc.text(`Certification Number: ${data.certification_number || ''}`, 50, doc.y + 40);

                doc.moveDown(2);

                // Compliance Information
                doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                doc.text('Compliance Information:', 50, doc.y);
                doc.moveDown(0.5);

                doc.font('Helvetica').fontSize(10).fill('#111827');
                doc.text(data.compliance_info || 'Meets all EPA and state requirements for lead-based paint work.', 50, doc.y, { width: 512 });

                doc.moveDown(2);

                // Signature Section
                if (data.signature) {
                    doc.font('Helvetica-Bold').fontSize(12).fill('#111827');
                    doc.text('Authorized Signature:', 50, doc.y);
                    doc.moveDown(0.5);

                    doc.font('Helvetica').fontSize(10).fill('#111827');
                    doc.text(data.signature, 50, doc.y);
                    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#e11d48');
                }

                doc.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PDFGeneratorService();