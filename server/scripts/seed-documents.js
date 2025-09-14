const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Sample document data
const sampleDocuments = [
  // Public Documents
  {
    title: 'Roofing Contract Template',
    description: 'Standard roofing contract template for residential projects',
    originalName: 'roofing-contract-template.pdf',
    fileName: 'roofing-contract-template.pdf',
    fileUrl: '/uploads/documents/roofing-contract-template.pdf',
    mimeType: 'application/pdf',
    fileSize: 245760,
    fileType: 'CONTRACT',
    category: 'CONTRACTS',
    accessLevel: 'PUBLIC',
    isPublic: true,
    isTemplate: true,
    tags: ['contract', 'template', 'residential', 'roofing'],
    keywords: ['roofing', 'contract', 'residential', 'template'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: '5-Year Warranty Certificate',
    description: 'Standard 5-year warranty certificate for roofing work',
    originalName: '5-year-warranty-certificate.pdf',
    fileName: '5-year-warranty-certificate.pdf',
    fileUrl: '/uploads/documents/5-year-warranty-certificate.pdf',
    mimeType: 'application/pdf',
    fileSize: 189440,
    fileType: 'WARRANTY',
    category: 'WARRANTIES',
    accessLevel: 'PUBLIC',
    isPublic: true,
    isTemplate: true,
    tags: ['warranty', 'certificate', '5-year', 'roofing'],
    keywords: ['warranty', 'certificate', 'roofing', '5-year'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Roof Inspection Checklist',
    description: 'Comprehensive checklist for roof inspections',
    originalName: 'roof-inspection-checklist.pdf',
    fileName: 'roof-inspection-checklist.pdf',
    fileUrl: '/uploads/documents/roof-inspection-checklist.pdf',
    mimeType: 'application/pdf',
    fileSize: 156672,
    fileType: 'CHECKLIST',
    category: 'CHECKLISTS',
    accessLevel: 'PUBLIC',
    isPublic: true,
    isTemplate: true,
    tags: ['inspection', 'checklist', 'roof', 'quality'],
    keywords: ['inspection', 'checklist', 'roof', 'quality', 'safety'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Customer Information Form',
    description: 'Form for collecting customer information and project details',
    originalName: 'customer-information-form.pdf',
    fileName: 'customer-information-form.pdf',
    fileUrl: '/uploads/documents/customer-information-form.pdf',
    mimeType: 'application/pdf',
    fileSize: 98304,
    fileType: 'FORM',
    category: 'FORMS',
    accessLevel: 'PUBLIC',
    isPublic: true,
    isTemplate: true,
    tags: ['form', 'customer', 'information', 'lead'],
    keywords: ['customer', 'form', 'information', 'lead', 'contact'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Safety Manual - Roofing Operations',
    description: 'Comprehensive safety manual for roofing operations and procedures',
    originalName: 'safety-manual-roofing.pdf',
    fileName: 'safety-manual-roofing.pdf',
    fileUrl: '/uploads/documents/safety-manual-roofing.pdf',
    mimeType: 'application/pdf',
    fileSize: 1048576,
    fileType: 'MANUAL',
    category: 'MANUALS',
    accessLevel: 'INTERNAL',
    isPublic: false,
    isTemplate: false,
    tags: ['safety', 'manual', 'roofing', 'procedures'],
    keywords: ['safety', 'manual', 'roofing', 'procedures', 'training'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Material Specification Sheet - GAF Shingles',
    description: 'Technical specifications for GAF shingle products',
    originalName: 'gaf-shingles-spec-sheet.pdf',
    fileName: 'gaf-shingles-spec-sheet.pdf',
    fileUrl: '/uploads/documents/gaf-shingles-spec-sheet.pdf',
    mimeType: 'application/pdf',
    fileSize: 512000,
    fileType: 'SPECIFICATION',
    category: 'REPORTS',
    accessLevel: 'AUTHENTICATED',
    isPublic: false,
    isTemplate: false,
    tags: ['specification', 'gaf', 'shingles', 'materials'],
    keywords: ['gaf', 'shingles', 'specification', 'materials', 'technical'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Project Estimate Template',
    description: 'Template for creating detailed project estimates',
    originalName: 'project-estimate-template.xlsx',
    fileName: 'project-estimate-template.xlsx',
    fileUrl: '/uploads/documents/project-estimate-template.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 32768,
    fileType: 'TEMPLATE',
    category: 'ESTIMATES',
    accessLevel: 'INTERNAL',
    isPublic: false,
    isTemplate: true,
    tags: ['estimate', 'template', 'excel', 'pricing'],
    keywords: ['estimate', 'template', 'pricing', 'excel', 'project'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Permit Application - City of Denver',
    description: 'Building permit application form for City of Denver',
    originalName: 'denver-permit-application.pdf',
    fileName: 'denver-permit-application.pdf',
    fileUrl: '/uploads/documents/denver-permit-application.pdf',
    mimeType: 'application/pdf',
    fileSize: 204800,
    fileType: 'PERMIT',
    category: 'PERMITS',
    accessLevel: 'AUTHENTICATED',
    isPublic: false,
    isTemplate: true,
    tags: ['permit', 'denver', 'application', 'building'],
    keywords: ['permit', 'denver', 'application', 'building', 'city'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Quality Control Checklist',
    description: 'Quality control checklist for completed roofing projects',
    originalName: 'quality-control-checklist.pdf',
    fileName: 'quality-control-checklist.pdf',
    fileUrl: '/uploads/documents/quality-control-checklist.pdf',
    mimeType: 'application/pdf',
    fileSize: 128000,
    fileType: 'CHECKLIST',
    category: 'CHECKLISTS',
    accessLevel: 'INTERNAL',
    isPublic: false,
    isTemplate: true,
    tags: ['quality', 'control', 'checklist', 'completion'],
    keywords: ['quality', 'control', 'checklist', 'completion', 'inspection'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Insurance Claim Form',
    description: 'Form for submitting insurance claims for roofing work',
    originalName: 'insurance-claim-form.pdf',
    fileName: 'insurance-claim-form.pdf',
    fileUrl: '/uploads/documents/insurance-claim-form.pdf',
    mimeType: 'application/pdf',
    fileSize: 163840,
    fileType: 'FORM',
    category: 'FORMS',
    accessLevel: 'AUTHENTICATED',
    isPublic: false,
    isTemplate: true,
    tags: ['insurance', 'claim', 'form', 'roofing'],
    keywords: ['insurance', 'claim', 'form', 'roofing', 'damage'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Training Manual - New Employee Orientation',
    description: 'Comprehensive training manual for new employee orientation',
    originalName: 'new-employee-orientation.pdf',
    fileName: 'new-employee-orientation.pdf',
    fileUrl: '/uploads/documents/new-employee-orientation.pdf',
    mimeType: 'application/pdf',
    fileSize: 2097152,
    fileType: 'MANUAL',
    category: 'TRAINING',
    accessLevel: 'INTERNAL',
    isPublic: false,
    isTemplate: false,
    tags: ['training', 'orientation', 'employee', 'manual'],
    keywords: ['training', 'orientation', 'employee', 'manual', 'onboarding'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Compliance Guidelines - OSHA Standards',
    description: 'OSHA compliance guidelines for roofing operations',
    originalName: 'osha-compliance-guidelines.pdf',
    fileName: 'osha-compliance-guidelines.pdf',
    fileUrl: '/uploads/documents/osha-compliance-guidelines.pdf',
    mimeType: 'application/pdf',
    fileSize: 1572864,
    fileType: 'MANUAL',
    category: 'COMPLIANCE',
    accessLevel: 'INTERNAL',
    isPublic: false,
    isTemplate: false,
    tags: ['compliance', 'osha', 'guidelines', 'safety'],
    keywords: ['compliance', 'osha', 'guidelines', 'safety', 'standards'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Marketing Brochure - Residential Services',
    description: 'Marketing brochure showcasing residential roofing services',
    originalName: 'residential-services-brochure.pdf',
    fileName: 'residential-services-brochure.pdf',
    fileUrl: '/uploads/documents/residential-services-brochure.pdf',
    mimeType: 'application/pdf',
    fileSize: 3145728,
    fileType: 'OTHER',
    category: 'MARKETING',
    accessLevel: 'PUBLIC',
    isPublic: true,
    isTemplate: false,
    tags: ['marketing', 'brochure', 'residential', 'services'],
    keywords: ['marketing', 'brochure', 'residential', 'services', 'roofing'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Legal Disclaimer Template',
    description: 'Legal disclaimer template for contracts and agreements',
    originalName: 'legal-disclaimer-template.pdf',
    fileName: 'legal-disclaimer-template.pdf',
    fileUrl: '/uploads/documents/legal-disclaimer-template.pdf',
    mimeType: 'application/pdf',
    fileSize: 81920,
    fileType: 'TEMPLATE',
    category: 'LEGAL',
    accessLevel: 'ADMIN',
    isPublic: false,
    isTemplate: true,
    tags: ['legal', 'disclaimer', 'template', 'contract'],
    keywords: ['legal', 'disclaimer', 'template', 'contract', 'liability'],
    region: 'central',
    state: 'CO',
    language: 'en'
  },
  {
    title: 'Equipment Maintenance Log',
    description: 'Log template for tracking equipment maintenance',
    originalName: 'equipment-maintenance-log.xlsx',
    fileName: 'equipment-maintenance-log.xlsx',
    fileUrl: '/uploads/documents/equipment-maintenance-log.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 24576,
    fileType: 'TEMPLATE',
    category: 'FORMS',
    accessLevel: 'INTERNAL',
    isPublic: false,
    isTemplate: true,
    tags: ['equipment', 'maintenance', 'log', 'tracking'],
    keywords: ['equipment', 'maintenance', 'log', 'tracking', 'schedule'],
    region: 'central',
    state: 'CO',
    language: 'en'
  }
];

async function seedDocuments() {
  try {
    console.log('🌱 Starting document seeding...');

    // Get a user to use as uploader (assuming there's at least one user)
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      console.log('❌ No users found. Please seed users first.');
      return;
    }

    const uploaderId = users[0].id;
    console.log(`📤 Using user ${users[0].email} as uploader`);

    // Get a project to use for some documents (optional)
    const projects = await prisma.project.findMany({ take: 1 });
    const projectId = projects.length > 0 ? projects[0].id : null;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory');
    }

    // Create sample PDF files (placeholder content)
    for (const doc of sampleDocuments) {
      const filePath = path.join(uploadsDir, doc.fileName);
      if (!fs.existsSync(filePath)) {
        // Create a simple PDF placeholder
        const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${doc.title}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

        fs.writeFileSync(filePath, pdfContent);
        console.log(`📄 Created placeholder file: ${doc.fileName}`);
      }
    }

    // Create documents in database
    let createdCount = 0;
    for (const docData of sampleDocuments) {
      try {
        const document = await prisma.document.create({
          data: {
            ...docData,
            uploadedById: uploaderId,
            projectId: docData.accessLevel === 'PRIVATE' ? projectId : null,
            // Generate some random download counts
            downloadCount: Math.floor(Math.random() * 50),
            lastDownloadedAt: Math.random() > 0.5 ? new Date() : null
          }
        });
        createdCount++;
        console.log(`✅ Created document: ${document.title}`);
      } catch (error) {
        console.error(`❌ Error creating document ${docData.title}:`, error.message);
      }
    }

    console.log(`🎉 Document seeding completed! Created ${createdCount} documents.`);

    // Create some sample document downloads
    const documents = await prisma.document.findMany({ take: 5 });
    for (const doc of documents) {
      // Create some random downloads
      const downloadCount = Math.floor(Math.random() * 10);
      for (let i = 0; i < downloadCount; i++) {
        await prisma.documentDownload.create({
          data: {
            documentId: doc.id,
            userId: uploaderId
          }
        });
      }
    }

    console.log('📊 Created sample download records');

  } catch (error) {
    console.error('❌ Error seeding documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDocuments();
}

module.exports = { seedDocuments };
