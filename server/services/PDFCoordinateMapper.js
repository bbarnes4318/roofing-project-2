const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

class PDFCoordinateMapper {
  /**
   * Automatically map field positions based on template type
   */
  static getFieldPositions(templateName, fieldData) {
    const templateType = this.detectTemplateType(templateName);
    
    switch (templateType) {
      case '2-year-warranty':
        return this.get2YearWarrantyPositions();
      case '5-year-warranty':
        return this.get5YearWarrantyPositions();
      case '3-year-certification':
        return this.get3YearCertificationPositions();
      case 'warranty-transfer':
        return this.getWarrantyTransferPositions();
      case 'inspection-report':
        return this.getInspectionReportPositions();
      case 'lead-paint':
        return this.getLeadPaintPositions();
      case 'certificate-completion':
        return this.getCertificateCompletionPositions();
      default:
        return this.getGenericPositions();
    }
  }
  
  /**
   * Detect template type from name
   */
  static detectTemplateType(templateName) {
    const name = templateName.toLowerCase();
    
    if (name.includes('2-year') || name.includes('2 year')) return '2-year-warranty';
    if (name.includes('5-year') || name.includes('5 year')) return '5-year-warranty';
    if (name.includes('3-year') || name.includes('3 year')) return '3-year-certification';
    if (name.includes('warranty transfer') || name.includes('certification transfer')) return 'warranty-transfer';
    if (name.includes('inspection report')) return 'inspection-report';
    if (name.includes('lead-based paint') || name.includes('lead based paint')) return 'lead-paint';
    if (name.includes('certificate of completion')) return 'certificate-completion';
    
    return 'generic';
  }
  
  /**
   * 2-Year Warranty field positions
   */
  static get2YearWarrantyPositions() {
    return {
      project_number: { x: 200, y: 700, fontSize: 12 },
      customer_name: { x: 200, y: 650, fontSize: 12 },
      property_address: { x: 200, y: 600, fontSize: 10 },
      warranty_start_date: { x: 200, y: 550, fontSize: 12 },
      warranty_end_date: { x: 350, y: 550, fontSize: 12 },
      roofing_materials: { x: 200, y: 500, fontSize: 12 },
      coverage_details: { x: 200, y: 450, fontSize: 11 },
      signature: { x: 200, y: 200, fontSize: 12 }
    };
  }
  
  /**
   * 5-Year Warranty field positions
   */
  static get5YearWarrantyPositions() {
    return {
      date_of_installation: { x: 92, y: 603, fontSize: 10 },
      owner_name: { x: 92, y: 576, fontSize: 10 },
      todays_date: { x: 377, y: 603, fontSize: 10 },
      address: { x: 92, y: 545, fontSize: 10 },
      project_number: { x: 377, y: 576, fontSize: 10 }
    };
  }
  
  /**
   * 3-Year Roof Certification field positions
   */
  static get3YearCertificationPositions() {
    return {
      project_number: { x: 200, y: 700, fontSize: 12 },
      customer_name: { x: 200, y: 650, fontSize: 12 },
      property_address: { x: 200, y: 600, fontSize: 10 },
      certification_start_date: { x: 200, y: 550, fontSize: 12 },
      certification_end_date: { x: 350, y: 550, fontSize: 12 },
      roofing_materials: { x: 200, y: 500, fontSize: 12 },
      installation_date: { x: 200, y: 450, fontSize: 12 },
      warranty_coverage: { x: 200, y: 400, fontSize: 11 },
      quality_standards: { x: 200, y: 350, fontSize: 10 },
      certifying_authority: { x: 200, y: 300, fontSize: 12 },
      signature: { x: 200, y: 200, fontSize: 12 }
    };
  }
  
  /**
   * Warranty Transfer field positions
   */
  static getWarrantyTransferPositions() {
    return {
      project_number: { x: 200, y: 700, fontSize: 12 },
      original_owner_name: { x: 200, y: 650, fontSize: 12 },
      new_owner_name: { x: 200, y: 600, fontSize: 12 },
      property_address: { x: 200, y: 550, fontSize: 10 },
      warranty_start_date: { x: 200, y: 500, fontSize: 12 },
      warranty_end_date: { x: 350, y: 500, fontSize: 12 },
      transfer_fee: { x: 200, y: 450, fontSize: 12 },
      signature: { x: 200, y: 200, fontSize: 12 },
      transfer_date: { x: 200, y: 150, fontSize: 12 }
    };
  }
  
  /**
   * Inspection Report field positions
   */
  static getInspectionReportPositions() {
    return {
      project_number: { x: 200, y: 700, fontSize: 12 },
      inspection_date: { x: 200, y: 650, fontSize: 12 },
      inspector_name: { x: 200, y: 600, fontSize: 12 },
      inspector_license: { x: 200, y: 550, fontSize: 12 },
      property_address: { x: 200, y: 500, fontSize: 10 },
      inspection_type: { x: 200, y: 450, fontSize: 12 },
      issues_found: { x: 200, y: 400, fontSize: 11 },
      action_required: { x: 200, y: 350, fontSize: 11 },
      inspector_signature: { x: 200, y: 200, fontSize: 12 }
    };
  }
  
  /**
   * Lead-Based Paint field positions
   */
  static getLeadPaintPositions() {
    return {
      applicant_first_name: { x: 200, y: 700, fontSize: 12 },
      applicant_last_name: { x: 200, y: 650, fontSize: 12 },
      applicant_address: { x: 200, y: 600, fontSize: 10 },
      applicant_phone: { x: 200, y: 550, fontSize: 12 },
      applicant_email: { x: 200, y: 500, fontSize: 12 },
      date_of_birth: { x: 200, y: 450, fontSize: 12 },
      social_security_number: { x: 200, y: 400, fontSize: 12 },
      certification_type: { x: 200, y: 350, fontSize: 12 },
      training_completion_date: { x: 200, y: 300, fontSize: 12 },
      training_provider: { x: 200, y: 250, fontSize: 12 },
      certification_number: { x: 200, y: 200, fontSize: 12 },
      signature: { x: 200, y: 150, fontSize: 12 },
      application_date: { x: 200, y: 100, fontSize: 12 }
    };
  }
  
  /**
   * Certificate of Completion field positions
   */
  static getCertificateCompletionPositions() {
    return {
      project_number: { x: 200, y: 700, fontSize: 12 },
      customer_name: { x: 200, y: 650, fontSize: 12 },
      address: { x: 200, y: 600, fontSize: 10 },
      signature: { x: 200, y: 200, fontSize: 12 },
      date: { x: 200, y: 150, fontSize: 12 }
    };
  }
  
  /**
   * Generic field positions for unknown templates
   */
  static getGenericPositions() {
    return {
      project_number: { x: 150, y: 700, fontSize: 12 },
      customer_name: { x: 150, y: 650, fontSize: 12 },
      address: { x: 150, y: 600, fontSize: 10 },
      date: { x: 150, y: 550, fontSize: 12 },
      signature: { x: 150, y: 200, fontSize: 12 }
    };
  }
}

module.exports = PDFCoordinateMapper;
