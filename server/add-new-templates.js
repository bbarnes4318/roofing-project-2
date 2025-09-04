const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const newTemplates = [
  {
    name: "Warranty Certification Transfer (v3)",
    description: "Document for transferring warranty from original owner to new owner",
    format: "PDF",
    section: "CERTS_WARRANTIES_INSPECTIONS",
    fields: [
      {
        key: "project_number",
        label: "Project Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 0
      },
      {
        key: "original_owner_name",
        label: "Original Owner Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 1
      },
      {
        key: "new_owner_name",
        label: "New Owner Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 2
      },
      {
        key: "property_address",
        label: "Property Address",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 3
      },
      {
        key: "warranty_start_date",
        label: "Warranty Start Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 4
      },
      {
        key: "warranty_end_date",
        label: "Warranty End Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 5
      },
      {
        key: "transfer_fee",
        label: "Transfer Fee",
        type: "NUMBER",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 6
      },
      {
        key: "signature",
        label: "Signature",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 7
      },
      {
        key: "transfer_date",
        label: "Transfer Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 8
      }
    ]
  },
  {
    name: "2-Year Warranty (v2)",
    description: "Standard 2-year warranty document for roofing projects",
    format: "PDF",
    section: "CERTS_WARRANTIES_INSPECTIONS",
    fields: [
      {
        key: "project_number",
        label: "Project Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 0
      },
      {
        key: "customer_name",
        label: "Customer Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 1
      },
      {
        key: "property_address",
        label: "Property Address",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 2
      },
      {
        key: "warranty_start_date",
        label: "Warranty Start Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 3
      },
      {
        key: "warranty_end_date",
        label: "Warranty End Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 4
      },
      {
        key: "roofing_materials",
        label: "Roofing Materials Used",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 5
      },
      {
        key: "coverage_details",
        label: "Coverage Details",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 6
      },
      {
        key: "signature",
        label: "Customer Signature",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 7
      }
    ]
  },
  {
    name: "5-Year Upfront Warranty (v4)",
    description: "Extended 5-year warranty with upfront premium payment",
    format: "PDF",
    section: "CERTS_WARRANTIES_INSPECTIONS",
    fields: [
      {
        key: "project_number",
        label: "Project Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 0
      },
      {
        key: "customer_name",
        label: "Customer Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 1
      },
      {
        key: "property_address",
        label: "Property Address",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 2
      },
      {
        key: "warranty_start_date",
        label: "Warranty Start Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 3
      },
      {
        key: "warranty_end_date",
        label: "Warranty End Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 4
      },
      {
        key: "premium_amount",
        label: "Warranty Premium Amount",
        type: "NUMBER",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 5
      },
      {
        key: "coverage_limits",
        label: "Coverage Limits",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 6
      },
      {
        key: "deductible_amount",
        label: "Deductible Amount",
        type: "NUMBER",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 7
      },
      {
        key: "signature",
        label: "Customer Signature",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 8
      }
    ]
  },
  {
    name: "Inspection Report (v2)",
    description: "Comprehensive inspection report with detailed findings",
    format: "PDF",
    section: "CERTS_WARRANTIES_INSPECTIONS",
    fields: [
      {
        key: "project_number",
        label: "Project Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 0
      },
      {
        key: "inspection_date",
        label: "Inspection Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 1
      },
      {
        key: "inspector_name",
        label: "Inspector Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 2
      },
      {
        key: "inspector_license",
        label: "Inspector License Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 3
      },
      {
        key: "property_address",
        label: "Property Address",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 4
      },
      {
        key: "inspection_type",
        label: "Inspection Type",
        type: "SELECT",
        required: true,
        defaultValue: null,
        options: ["Pre-Installation", "Post-Installation", "Periodic", "Final", "Maintenance"],
        validation: null,
        order: 5
      },
      {
        key: "weather_conditions",
        label: "Weather Conditions",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 6
      },
      {
        key: "findings_summary",
        label: "Findings Summary",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 7
      },
      {
        key: "recommendations",
        label: "Recommendations",
        type: "TEXTAREA",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 8
      },
      {
        key: "inspector_signature",
        label: "Inspector Signature",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 9
      }
    ]
  },
  {
    name: "Inspection Report (v1)",
    description: "Basic inspection report with essential findings",
    format: "PDF",
    section: "CERTS_WARRANTIES_INSPECTIONS",
    fields: [
      {
        key: "project_number",
        label: "Project Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 0
      },
      {
        key: "inspection_date",
        label: "Inspection Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 1
      },
      {
        key: "inspector_name",
        label: "Inspector Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 2
      },
      {
        key: "property_address",
        label: "Property Address",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 3
      },
      {
        key: "roof_condition",
        label: "Roof Condition",
        type: "SELECT",
        required: true,
        defaultValue: null,
        options: ["Excellent", "Good", "Fair", "Poor", "Critical"],
        validation: null,
        order: 4
      },
      {
        key: "issues_found",
        label: "Issues Found",
        type: "TEXTAREA",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 5
      },
      {
        key: "action_required",
        label: "Action Required",
        type: "TEXTAREA",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 6
      },
      {
        key: "inspector_signature",
        label: "Inspector Signature",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 7
      }
    ]
  },
  {
    name: "Lead-Based Paint Certification Application (Individual)",
    description: "Application for individual lead-based paint certification",
    format: "PDF",
    section: "CERTS_WARRANTIES_INSPECTIONS",
    fields: [
      {
        key: "applicant_first_name",
        label: "Applicant First Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 0
      },
      {
        key: "applicant_last_name",
        label: "Applicant Last Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 1
      },
      {
        key: "applicant_address",
        label: "Applicant Address",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 2
      },
      {
        key: "applicant_phone",
        label: "Applicant Phone Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 3
      },
      {
        key: "applicant_email",
        label: "Applicant Email",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 4
      },
      {
        key: "date_of_birth",
        label: "Date of Birth",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 5
      },
      {
        key: "social_security_number",
        label: "Social Security Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 6
      },
      {
        key: "certification_type",
        label: "Certification Type",
        type: "SELECT",
        required: true,
        defaultValue: null,
        options: ["Renovator", "Dust Sampling Technician", "Lead Inspector", "Lead Risk Assessor", "Lead Abatement Worker", "Lead Abatement Supervisor"],
        validation: null,
        order: 7
      },
      {
        key: "training_completion_date",
        label: "Training Completion Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 8
      },
      {
        key: "training_provider",
        label: "Training Provider",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 9
      },
      {
        key: "certification_number",
        label: "Current Certification Number (if applicable)",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 10
      },
      {
        key: "signature",
        label: "Applicant Signature",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 11
      },
      {
        key: "application_date",
        label: "Application Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 12
      }
    ]
  },
  {
    name: "3-Year Roof Certification (v3)",
    description: "Three-year roof certification with quality standards verification",
    format: "PDF",
    section: "CERTS_WARRANTIES_INSPECTIONS",
    fields: [
      {
        key: "project_number",
        label: "Project Number",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 0
      },
      {
        key: "customer_name",
        label: "Customer Name",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 1
      },
      {
        key: "property_address",
        label: "Property Address",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 2
      },
      {
        key: "certification_start_date",
        label: "Certification Start Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 3
      },
      {
        key: "certification_end_date",
        label: "Certification End Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 4
      },
      {
        key: "roofing_materials",
        label: "Roofing Materials Used",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 5
      },
      {
        key: "installation_date",
        label: "Installation Date",
        type: "DATE",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 6
      },
      {
        key: "warranty_coverage",
        label: "Warranty Coverage Details",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 7
      },
      {
        key: "quality_standards",
        label: "Quality Standards Met",
        type: "TEXTAREA",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 8
      },
      {
        key: "certifying_authority",
        label: "Certifying Authority",
        type: "TEXT",
        required: true,
        defaultValue: null,
        options: [],
        validation: null,
        order: 9
      },
      {
        key: "signature",
        label: "Authorized Signature",
        type: "TEXT",
        required: false,
        defaultValue: null,
        options: [],
        validation: null,
        order: 10
      }
    ]
  }
];

async function addTemplates() {
  try {
    console.log('Starting to add new templates...');
    
    for (const template of newTemplates) {
      console.log(`Adding template: ${template.name}`);
      
      // Create the template
      const createdTemplate = await prisma.documentTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          format: template.format,
          section: template.section,
          templateFileUrl: `/uploads/company-assets/${template.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
          isActive: true,
          version: 1,
          fields: {
            create: template.fields.map(field => ({
              key: field.key,
              label: field.label,
              type: field.type,
              required: field.required,
              defaultValue: field.defaultValue,
              options: field.options,
              validation: field.validation,
              order: field.order
            }))
          }
        },
        include: {
          fields: true
        }
      });
      
      console.log(`✅ Template "${template.name}" created with ID: ${createdTemplate.id}`);
      console.log(`   Fields created: ${createdTemplate.fields.length}`);
    }
    
    console.log('\n🎉 All templates added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addTemplates();
