const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

console.log('📝 FORM_SUBMISSIONS: Loading form submissions routes');

// Helper function to generate PDF from intake form data
async function generateIntakePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Producer Agreement & Application', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Submission ID: ${data.id}`, { align: 'center' });
      doc.text(`Received: ${new Date(data.receivedAt).toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Contact Information
      doc.fontSize(16).fillColor('#2563eb').text('Contact Information');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000000');
      doc.text(`Name: ${data.contact?.firstName || ''} ${data.contact?.lastName || ''}`);
      doc.text(`Email: ${data.contact?.email || ''}`);
      doc.text(`Phone: ${data.contact?.phone || ''}`);
      doc.moveDown(1.5);

      // Business Information
      doc.fontSize(16).fillColor('#2563eb').text('Business Information');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000000');
      doc.text(`Agency Name: ${data.business?.agencyName || 'N/A'}`);
      doc.text(`Website: ${data.business?.website || 'N/A'}`);
      doc.text(`Address: ${data.business?.address1 || ''} ${data.business?.address2 || ''}`);
      doc.text(`City: ${data.business?.city || ''}, ${data.business?.state || ''} ${data.business?.zip || ''}`);
      doc.moveDown(1.5);

      // License Information
      doc.fontSize(16).fillColor('#2563eb').text('License Information');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000000');
      doc.text(`NPN: ${data.npn || 'N/A'}`);
      doc.text(`States Licensed: ${Array.isArray(data.statesLicensed) ? data.statesLicensed.join(', ') : 'None'}`);
      doc.moveDown(1.5);

      // Background Information
      doc.fontSize(16).fillColor('#2563eb').text('Background Information');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000000');
      doc.text(`Prior Terminations: ${data.background?.priorTerminations ? 'Yes' : 'No'}`);
      if (data.background?.priorTerminationsExplain) {
        doc.text(`Explanation: ${data.background.priorTerminationsExplain}`);
      }
      doc.text(`Felonies: ${data.background?.felonies ? 'Yes' : 'No'}`);
      if (data.background?.feloniesExplain) {
        doc.text(`Explanation: ${data.background.feloniesExplain}`);
      }
      doc.text(`Bankruptcies: ${data.background?.bankruptcies ? 'Yes' : 'No'}`);
      if (data.background?.bankruptciesExplain) {
        doc.text(`Explanation: ${data.background.bankruptciesExplain}`);
      }
      doc.moveDown(2);

      // Acknowledgments & Signature
      doc.fontSize(16).fillColor('#2563eb').text('Acknowledgments & Signature');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000000');
      doc.text(`Producer Agreement Accepted: ${data.acknowledgments?.producerAgreementAccepted ? 'Yes' : 'No'}`);
      doc.text(`Privacy Notice Accepted: ${data.acknowledgments?.privacyNoticeAccepted ? 'Yes' : 'No'}`);
      doc.moveDown(1);
      
      // Signature section
      doc.fontSize(14).text('Electronic Signature:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(18).font('Helvetica-BoldOblique').text(data.acknowledgments?.signature || 'No Signature');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(`Date: ${data.acknowledgments?.signatureDate || ''}`);
      
      // Footer
      doc.moveDown(3);
      doc.fontSize(9).fillColor('#666666').text(
        'This document was electronically signed and submitted.',
        { align: 'center' }
      );
      doc.text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to generate W9 PDF
async function generateW9PDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Form W-9', { align: 'center' });
      doc.fontSize(14).text('Request for Taxpayer Identification Number and Certification', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Submission ID: ${data.id}`, { align: 'center' });
      doc.text(`Received: ${new Date(data.receivedAt).toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Name
      doc.fontSize(11);
      doc.text('Name (as shown on your income tax return):', { underline: true });
      doc.fontSize(14).text(data.name || '', { indent: 20 });
      doc.moveDown(1);

      // Business Name (if different)
      if (data.businessName) {
        doc.fontSize(11).text('Business name/disregarded entity name, if different from above:', { underline: true });
        doc.fontSize(14).text(data.businessName, { indent: 20 });
        doc.moveDown(1);
      }

      // Tax Classification
      doc.fontSize(11).text('Federal tax classification:', { underline: true });
      const classifications = {
        individual: 'Individual/sole proprietor',
        c_corp: 'C Corporation',
        s_corp: 'S Corporation',
        partnership: 'Partnership',
        trust_estate: 'Trust/estate',
        llc: 'Limited Liability Company',
        other: data.taxClassificationOther || 'Other'
      };
      doc.fontSize(14).text(classifications[data.taxClassification] || 'Not specified', { indent: 20 });
      doc.moveDown(1);

      // Address
      doc.fontSize(11).text('Address:', { underline: true });
      doc.fontSize(14).text(`${data.address || ''}`, { indent: 20 });
      doc.text(`${data.city || ''}, ${data.state || ''} ${data.zip || ''}`, { indent: 20 });
      doc.moveDown(1);

      // Taxpayer Identification Number
      doc.fontSize(11).text('Taxpayer Identification Number:', { underline: true });
      if (data.ssn) {
        doc.fontSize(14).text(`SSN: XXX-XX-${data.ssn.slice(-4)}`, { indent: 20 });
      } else if (data.ein) {
        doc.fontSize(14).text(`EIN: ${data.ein}`, { indent: 20 });
      } else {
        doc.fontSize(14).text('Not provided', { indent: 20 });
      }
      doc.moveDown(2);

      // Certification
      doc.fontSize(12).fillColor('#2563eb').text('Certification:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000').text(
        'Under penalties of perjury, I certify that:',
        { indent: 20 }
      );
      doc.text(
        '1. The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and',
        { indent: 30, align: 'left', width: 500 }
      );
      doc.text(
        '2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and',
        { indent: 30, align: 'left', width: 500 }
      );
      doc.text(
        '3. I am a U.S. citizen or other U.S. person; and',
        { indent: 30, align: 'left', width: 500 }
      );
      doc.text(
        '4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.',
        { indent: 30, align: 'left', width: 500 }
      );
      doc.moveDown(2);

      // Signature
      doc.fontSize(14).text('Electronic Signature:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(18).font('Helvetica-BoldOblique').text(data.signature || 'No Signature');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(`Date: ${data.signatureDate || new Date().toLocaleDateString()}`);

      // Footer
      doc.moveDown(3);
      doc.fontSize(9).fillColor('#666666').text(
        'This W-9 form was electronically signed and submitted.',
        { align: 'center' }
      );
      doc.text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// @desc    Receive form submission webhook (intake or W9)
// @route   POST /api/form-submissions/webhook
// @access  Public (webhook from external form service)
router.post('/webhook', asyncHandler(async (req, res) => {
  const submissionData = req.body;

  console.log('📥 FORM_SUBMISSION: Received webhook');
  console.log('📥 Submission ID:', submissionData.id);
  console.log('📥 Submission Type:', submissionData.type);

  if (!submissionData || !submissionData.type) {
    throw new AppError('Invalid submission data', 400);
  }

  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'form-submissions');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let pdfPath;
    let pdfFileName;

    if (submissionData.type === 'intake') {
      // Generate intake documents PDF
      pdfFileName = `intake_${submissionData.id}_${Date.now()}.pdf`;
      pdfPath = path.join(uploadsDir, pdfFileName);
      
      console.log('📄 Generating intake PDF:', pdfFileName);
      await generateIntakePDF(submissionData, pdfPath);
      console.log('✅ Intake PDF generated successfully');

    } else if (submissionData.type === 'w9') {
      // Generate W9 PDF
      pdfFileName = `w9_${submissionData.id}_${Date.now()}.pdf`;
      pdfPath = path.join(uploadsDir, pdfFileName);
      
      console.log('📄 Generating W9 PDF:', pdfFileName);
      await generateW9PDF(submissionData, pdfPath);
      console.log('✅ W9 PDF generated successfully');

    } else {
      throw new AppError(`Unknown submission type: ${submissionData.type}`, 400);
    }

    // Return success with PDF download URL
    const downloadUrl = `/api/form-submissions/download/${pdfFileName}`;

    res.json({
      success: true,
      message: `PDF generated successfully for ${submissionData.type} submission`,
      data: {
        submissionId: submissionData.id,
        type: submissionData.type,
        pdfFileName: pdfFileName,
        downloadUrl: downloadUrl,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new AppError(`Failed to generate PDF: ${error.message}`, 500);
  }
}));

// @desc    Download generated PDF
// @route   GET /api/form-submissions/download/:filename
// @access  Public
router.get('/download/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'uploads', 'form-submissions', filename);

  if (!fs.existsSync(filePath)) {
    throw new AppError('PDF not found', 404);
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
    }
  });
}));

// @desc    List all generated PDFs
// @route   GET /api/form-submissions/list
// @access  Public
router.get('/list', asyncHandler(async (req, res) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'form-submissions');
  
  if (!fs.existsSync(uploadsDir)) {
    return res.json({
      success: true,
      data: { files: [] },
      message: 'No submissions yet'
    });
  }

  const files = fs.readdirSync(uploadsDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => {
      const stats = fs.statSync(path.join(uploadsDir, f));
      return {
        filename: f,
        size: stats.size,
        createdAt: stats.birthtime,
        downloadUrl: `/api/form-submissions/download/${f}`
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json({
    success: true,
    data: { files },
    message: `Found ${files.length} PDF(s)`
  });
}));

module.exports = router;

