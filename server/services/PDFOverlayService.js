const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFPage, rgb } = require('pdf-lib');

class PDFOverlayService {
  /**
   * Overlay text on an existing PDF template at specific coordinates
   */
  static async overlayTextOnPDF(templatePath, outputPath, fieldData, templateName) {
    try {
      // Load the existing PDF template
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const pages = pdfDoc.getPages();
      
      if (pages.length === 0) {
        throw new Error('Template PDF has no pages');
      }
      
      const page = pages[0]; // Work with first page
      
      // Define field positions for each template type
      const fieldPositions = this.getFieldPositions(templateName, fieldData);
      
      // Overlay each field at its position
      for (const [fieldKey, fieldValue] of Object.entries(fieldData)) {
        if (fieldValue && fieldPositions[fieldKey]) {
          const position = fieldPositions[fieldKey];
          this.addTextToPage(page, fieldValue, position);
        }
      }
      
      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, modifiedPdfBytes);
      
      console.log(`Successfully overlaid text on PDF template: ${outputPath}`);
    } catch (error) {
      console.error('Error overlaying text on PDF:', error);
      throw error;
    }
  }
  
  /**
   * Get field positions based on template type
   */
  static getFieldPositions(templateName, fieldData) {
    const PDFCoordinateMapper = require('./PDFCoordinateMapper');
    return PDFCoordinateMapper.getFieldPositions(templateName, fieldData);
  }
  
  /**
   * Add text to a PDF page at specific coordinates
   */
  static addTextToPage(page, text, position) {
    try {
      page.drawText(String(text), {
        x: position.x,
        y: position.y,
        size: position.fontSize || 12,
        color: rgb(0, 0, 0) // Black text
      });
    } catch (error) {
      console.error(`Error adding text "${text}" at position:`, error);
    }
  }
  
  /**
   * Generate document by overlaying text on template
   */
  static async generateDocument(templateId, outputPath, fieldData) {
    try {
      // Get template from database to find the file path
      const { PrismaClient } = require('@prisma/client');
      const { prisma } = require('../config/prisma');
      
      const template = await prisma.documentTemplate.findUnique({
        where: { id: templateId }
      });
      
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      // Convert template file URL to absolute path
      const templatePath = path.join(__dirname, '..', template.templateFileUrl);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }
      
      // Overlay text on the template
      await this.overlayTextOnPDF(templatePath, outputPath, fieldData, template.name);
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error in generateDocument:', error);
      throw error;
    }
  }
}

module.exports = PDFOverlayService;
