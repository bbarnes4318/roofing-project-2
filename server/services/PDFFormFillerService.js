const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList } = require('pdf-lib');

class PDFFormFillerService {
  /**
   * Fill in a PDF template with form data
   */
  static async fillPDFTemplate(templatePath, outputPath, fieldData) {
    try {
      // Read the existing PDF template
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      
      // Fill in the form fields based on the data
      await this.fillFormFields(form, fieldData);
      
      // Save the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, filledPdfBytes);
      
      return true;
    } catch (error) {
      console.error('Error filling PDF template:', error);
      throw error;
    }
  }

  /**
   * Fill in form fields based on field data
   */
  static async fillFormFields(form, fieldData) {
    try {
      // Get all form fields
      const fields = form.getFields();
      
      // Map our field keys to potential PDF form field names
      const fieldMapping = this.createFieldMapping(fieldData);
      
      // Fill in each field
      for (const [fieldKey, fieldValue] of Object.entries(fieldData)) {
        if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
          continue;
        }
        
        // Try to find a matching PDF form field
        const pdfFieldName = this.findMatchingPDFField(fieldKey, fieldMapping, fields);
        if (pdfFieldName) {
          await this.fillPDFField(form, pdfFieldName, fieldValue);
        }
      }
      
      // Also try to fill common field names
      await this.fillCommonFields(form, fieldData);
      
    } catch (error) {
      console.error('Error filling form fields:', error);
    }
  }

  /**
   * Create a mapping between our field keys and potential PDF field names
   */
  static createFieldMapping(fieldData) {
    const mapping = {};
    
    // Direct mappings
    mapping.project_number = ['project_number', 'project_number', 'job_number', 'project_number'];
    mapping.customer_name = ['customer_name', 'owner_name', 'customer_name', 'owner_name'];
    mapping.property_address = ['property_address', 'address', 'job_address', 'property_address'];
    mapping.warranty_start_date = ['warranty_start_date', 'start_date', 'warranty_start_date'];
    mapping.warranty_end_date = ['warranty_end_date', 'end_date', 'warranty_end_date'];
    mapping.signature = ['signature', 'customer_signature', 'signature'];
    
    // Add more mappings as needed
    return mapping;
  }

  /**
   * Find a matching PDF form field
   */
  static findMatchingPDFField(fieldKey, fieldMapping, fields) {
    const possibleNames = fieldMapping[fieldKey] || [fieldKey];
    
    for (const name of possibleNames) {
      if (fields[name]) {
        return name;
      }
    }
    
    // Try case-insensitive matching
    for (const fieldName of Object.keys(fields)) {
      if (fieldName.toLowerCase() === fieldKey.toLowerCase()) {
        return fieldName;
      }
    }
    
    return null;
  }

  /**
   * Fill a PDF form field with a value
   */
  static async fillPDFField(form, fieldName, value) {
    try {
      const field = form.getField(fieldName);
      
      if (field instanceof PDFTextField) {
        field.setText(String(value));
      } else if (field instanceof PDFCheckBox) {
        if (value === true || value === 'true' || value === 'yes') {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        // For dropdowns, try to select the option
        try {
          field.select(String(value));
        } catch (e) {
          // If exact match fails, try to find a similar option
          const options = field.getOptions();
          for (const option of options) {
            if (option.toLowerCase().includes(String(value).toLowerCase())) {
              field.select(option);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error filling field ${fieldName}:`, error);
    }
  }

  /**
   * Fill common fields that might exist in the PDF
   */
  static async fillCommonFields(form, fieldData) {
    try {
      const fields = form.getFields();
      
      // Common field patterns
      const commonMappings = [
        { pdfField: 'date', value: new Date().toLocaleDateString() },
        { pdfField: 'today_date', value: new Date().toLocaleDateString() },
        { pdfField: 'current_date', value: new Date().toLocaleDateString() },
        { pdfField: 'generated_date', value: new Date().toLocaleDateString() }
      ];
      
      for (const mapping of commonMappings) {
        if (fields[mapping.pdfField]) {
          await this.fillPDFField(form, mapping.pdfField, mapping.value);
        }
      }
      
    } catch (error) {
      console.error('Error filling common fields:', error);
    }
  }

  /**
   * Generate a PDF using the appropriate template
   */
  static async generateDocument(templateId, outputPath, fieldData) {
    try {
      // Get template information
      const { PrismaClient } = require('@prisma/client');
      const { prisma } = require('../config/prisma');
      
      const template = await prisma.documentTemplate.findUnique({
        where: { id: templateId },
        include: { fields: true }
      });
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Get the template file path
      const templatePath = path.join(__dirname, '..', template.templateFileUrl);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }
      
      // Fill the PDF template
      await this.fillPDFTemplate(templatePath, outputPath, fieldData);
      
      await prisma.$disconnect();
      return true;
      
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }
}

module.exports = PDFFormFillerService;
