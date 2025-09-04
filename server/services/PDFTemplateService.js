const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

class PDFTemplateService {
  /**
   * Generate PDF using actual PDF template as base and fill in fields
   */
  static async generateFromTemplate(templatePath, outputPath, fieldData) {
    try {
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      // Create a new PDF document
      const doc = new PDFDocument({ 
        size: 'LETTER', 
        margin: 50,
        autoFirstPage: false
      });

      // Create write stream
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Add the template PDF as a background
      // Note: PDFKit doesn't support direct PDF embedding, so we'll create a similar layout
      await this.createTemplateLayout(doc, fieldData);

      // Finalize the document
      doc.end();

      // Wait for write to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return true;
    } catch (error) {
      console.error('Error generating PDF from template:', error);
      throw error;
    }
  }

  /**
   * Create layout based on template type
   */
  static async createTemplateLayout(doc, fieldData) {
    const templateType = this.detectTemplateType(fieldData);
    
    switch (templateType) {
      case 'warranty_2_year':
        return this.create2YearWarrantyLayout(doc, fieldData);
      case 'warranty_5_year':
        return this.create5YearWarrantyLayout(doc, fieldData);
      case 'warranty_certification_transfer':
        return this.createWarrantyTransferLayout(doc, fieldData);
      case 'inspection_report':
        return this.createInspectionReportLayout(doc, fieldData);
      case 'roof_certification_3_year':
        return this.create3YearRoofCertificationLayout(doc, fieldData);
      case 'lead_based_paint':
        return this.createLeadBasedPaintLayout(doc, fieldData);
      default:
        return this.createGenericLayout(doc, fieldData);
    }
  }

  /**
   * Detect template type from field data
   */
  static detectTemplateType(fieldData) {
    if (fieldData.warranty_type === '2_year' || fieldData.warranty_end_date) {
      const endDate = new Date(fieldData.warranty_end_date);
      const startDate = new Date(fieldData.warranty_start_date);
      const yearsDiff = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
      
      if (yearsDiff >= 4.5) return 'warranty_5_year';
      if (yearsDiff >= 1.5) return 'warranty_2_year';
    }
    
    if (fieldData.original_owner_name && fieldData.new_owner_name) {
      return 'warranty_certification_transfer';
    }
    
    if (fieldData.inspection_date && fieldData.inspector_name) {
      return 'inspection_report';
    }
    
    if (fieldData.certification_start_date && fieldData.certification_end_date) {
      const endDate = new Date(fieldData.certification_end_date);
      const startDate = new Date(fieldData.certification_start_date);
      const yearsDiff = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
      
      if (yearsDiff >= 2.5) return 'roof_certification_3_year';
    }
    
    if (fieldData.applicant_first_name && fieldData.certification_type) {
      return 'lead_based_paint';
    }
    
    return 'generic';
  }

  /**
   * Create 2-Year Warranty Layout
   */
  static create2YearWarrantyLayout(doc, data) {
    // Header
    doc.addPage();
    doc.fontSize(24).font('Helvetica-Bold').text('2-YEAR WARRANTY', { align: 'center' });
    doc.moveDown(0.5);
    
    // Company Info
    doc.fontSize(14).font('Helvetica').text('UPFRONT RESTORATION & ROOFING', { align: 'center' });
    doc.moveDown(2);
    
    // Project Info
    doc.fontSize(12).font('Helvetica-Bold').text('Project Information:');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Project Number: ${data.project_number || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Customer Name: ${data.customer_name || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Property Address: ${data.property_address || ''}`);
    doc.moveDown(1);
    
    // Warranty Details
    doc.fontSize(12).font('Helvetica-Bold').text('Warranty Details:');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Start Date: ${data.warranty_start_date || ''}`);
    doc.fontSize(11).font('Helvetica').text(`End Date: ${data.warranty_end_date || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Materials: ${data.roofing_materials || ''}`);
    doc.moveDown(1);
    
    // Coverage
    doc.fontSize(12).font('Helvetica-Bold').text('Coverage:');
    doc.fontSize(11).font('Helvetica').text(data.coverage_details || 'Standard 2-year warranty coverage for roofing materials and workmanship.');
    doc.moveDown(2);
    
    // Signature
    if (data.signature) {
      doc.fontSize(11).font('Helvetica').text(`Customer Signature: ${data.signature}`);
    }
  }

  /**
   * Create 5-Year Upfront Warranty Layout
   */
  static create5YearWarrantyLayout(doc, data) {
    // Header
    doc.addPage();
    doc.fontSize(24).font('Helvetica-Bold').text('5-YEAR UPFRONT WARRANTY', { align: 'center' });
    doc.moveDown(0.5);
    
    // Company Info
    doc.fontSize(14).font('Helvetica').text('UPFRONT RESTORATION & ROOFING', { align: 'center' });
    doc.moveDown(2);
    
    // Project Info
    doc.fontSize(12).font('Helvetica-Bold').text('Project Information:');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Project Number: ${data.project_number || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Customer Name: ${data.customer_name || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Property Address: ${data.property_address || ''}`);
    doc.moveDown(1);
    
    // Warranty Details
    doc.fontSize(12).font('Helvetica-Bold').text('Extended Warranty Details:');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Start Date: ${data.warranty_start_date || ''}`);
    doc.fontSize(11).font('Helvetica').text(`End Date: ${data.warranty_end_date || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Premium Amount: $${data.premium_amount || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Deductible: $${data.deductible_amount || ''}`);
    doc.moveDown(1);
    
    // Coverage Limits
    doc.fontSize(12).font('Helvetica-Bold').text('Coverage Limits:');
    doc.fontSize(11).font('Helvetica').text(data.coverage_limits || 'Extended coverage with premium payment.');
    doc.moveDown(2);
    
    // Signature
    if (data.signature) {
      doc.fontSize(11).font('Helvetica').text(`Customer Signature: ${data.signature}`);
    }
  }

  /**
   * Create 3-Year Roof Certification Layout
   */
  static create3YearRoofCertificationLayout(doc, data) {
    // Header
    doc.addPage();
    doc.fontSize(24).font('Helvetica-Bold').text('3-YEAR ROOF CERTIFICATION', { align: 'center' });
    doc.moveDown(0.5);
    
    // Company Info
    doc.fontSize(14).font('Helvetica').text('UPFRONT RESTORATION & ROOFING', { align: 'center' });
    doc.moveDown(2);
    
    // Certification Details
    doc.fontSize(12).font('Helvetica-Bold').text('Certification Details:');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Project Number: ${data.project_number || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Customer Name: ${data.customer_name || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Property Address: ${data.property_address || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Start Date: ${data.certification_start_date || ''}`);
    doc.fontSize(11).font('Helvetica').text(`End Date: ${data.certification_end_date || ''}`);
    doc.moveDown(1);
    
    // Materials and Installation
    doc.fontSize(12).font('Helvetica-Bold').text('Materials & Installation:');
    doc.fontSize(11).font('Helvetica').text(`Materials Used: ${data.roofing_materials || ''}`);
    doc.fontSize(11).font('Helvetica').text(`Installation Date: ${data.installation_date || ''}`);
    doc.moveDown(1);
    
    // Quality Standards
    doc.fontSize(12).font('Helvetica-Bold').text('Quality Standards:');
    doc.fontSize(11).font('Helvetica').text(data.quality_standards || 'Meets all industry quality standards and building codes.');
    doc.moveDown(1);
    
    // Certifying Authority
    doc.fontSize(12).font('Helvetica-Bold').text('Certifying Authority:');
    doc.fontSize(11).font('Helvetica').text(data.certifying_authority || 'UPFRONT RESTORATION & ROOFING');
    doc.moveDown(2);
    
    // Signature
    if (data.signature) {
      doc.fontSize(11).font('Helvetica').text(`Authorized Signature: ${data.signature}`);
    }
  }

  /**
   * Create generic layout for other templates
   */
  static createGenericLayout(doc, data) {
    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').text('Generated Document', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(11).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('Document Fields:', { underline: true });
    
    Object.entries(data || {}).forEach(([key, value]) => {
      doc.moveDown(0.2).fontSize(11).font('Helvetica').text(`${key}: ${String(value || '')}`);
    });
  }

  // Add other template layouts as needed...
  static createWarrantyTransferLayout(doc, data) {
    // Implementation for warranty transfer
    return this.createGenericLayout(doc, data);
  }

  static createInspectionReportLayout(doc, data) {
    // Implementation for inspection reports
    return this.createGenericLayout(doc, data);
  }

  static createLeadBasedPaintLayout(doc, data) {
    // Implementation for lead-based paint certification
    return this.createGenericLayout(doc, data);
  }
}

module.exports = PDFTemplateService;
