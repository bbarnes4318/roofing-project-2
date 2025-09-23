// Load environment variables from root .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
// Force a new Prisma client instance
delete require.cache[require.resolve('@prisma/client')];
const prisma = new PrismaClient();

/**
 * Seeds the company assets with a proper folder structure
 * and sample documents for the enhanced UI
 */
async function seedCompanyDocuments() {
  console.log('🌱 Seeding company documents structure...');
  
  try {
    // Define the folder structure with proper names and metadata
    const folderStructure = [
      {
        title: 'Contracts & Agreements',
        folderName: 'Contracts & Agreements',
        description: 'Customer contracts, vendor agreements, and legal documents',
        type: 'FOLDER',
        sortOrder: 1,
        metadata: {
          icon: 'folder',
          color: 'blue',
          displayOrder: 1
        },
        children: [
          {
            title: 'Customer Contracts',
            folderName: 'Customer Contracts',
            description: 'Signed contracts with customers',
            type: 'FOLDER',
            sortOrder: 1,
            metadata: { icon: 'folder', color: 'blue' }
          },
          {
            title: 'Vendor Agreements',
            folderName: 'Vendor Agreements',
            description: 'Agreements with suppliers and vendors',
            type: 'FOLDER',
            sortOrder: 2,
            metadata: { icon: 'folder', color: 'blue' }
          },
          {
            title: 'Subcontractor Terms',
            folderName: 'Subcontractor Terms',
            description: 'Terms and agreements with subcontractors',
            type: 'FOLDER',
            sortOrder: 3,
            metadata: { icon: 'folder', color: 'blue' }
          }
        ]
      },
      {
        title: 'Warranties & Certifications',
        folderName: 'Warranties & Certifications',
        description: 'Product warranties and certification documents',
        type: 'FOLDER',
        sortOrder: 2,
        metadata: {
          icon: 'folder',
          color: 'yellow',
          displayOrder: 2
        },
        children: [
          {
            title: '5-Year Warranties',
            folderName: '5-Year Warranties',
            description: 'Five year warranty certificates',
            type: 'FOLDER',
            sortOrder: 1,
            metadata: { icon: 'folder', color: 'yellow' }
          },
          {
            title: '2-Year Warranties',
            folderName: '2-Year Warranties',
            description: 'Two year warranty certificates',
            type: 'FOLDER',
            sortOrder: 2,
            metadata: { icon: 'folder', color: 'yellow' }
          },
          {
            title: 'Material Certifications',
            folderName: 'Material Certifications',
            description: 'Certifications for roofing materials',
            type: 'FOLDER',
            sortOrder: 3,
            metadata: { icon: 'folder', color: 'yellow' }
          }
        ]
      },
      {
        title: 'Inspection Reports',
        folderName: 'Inspection Reports',
        description: 'Pre-work, progress, and final inspection reports',
        type: 'FOLDER',
        sortOrder: 3,
        metadata: {
          icon: 'folder',
          color: 'green',
          displayOrder: 3
        },
        children: [
          {
            title: 'Pre-Work Inspections',
            folderName: 'Pre-Work Inspections',
            description: 'Initial property inspection reports',
            type: 'FOLDER',
            sortOrder: 1,
            metadata: { icon: 'folder', color: 'green' }
          },
          {
            title: 'Progress Reports',
            folderName: 'Progress Reports',
            description: 'Work progress inspection reports',
            type: 'FOLDER',
            sortOrder: 2,
            metadata: { icon: 'folder', color: 'green' }
          },
          {
            title: 'Final Inspections',
            folderName: 'Final Inspections',
            description: 'Final quality inspection reports',
            type: 'FOLDER',
            sortOrder: 3,
            metadata: { icon: 'folder', color: 'green' }
          }
        ]
      },
      {
        title: 'Permits & Compliance',
        folderName: 'Permits & Compliance',
        description: 'Building permits and regulatory compliance documents',
        type: 'FOLDER',
        sortOrder: 4,
        metadata: {
          icon: 'folder',
          color: 'purple',
          displayOrder: 4
        },
        children: [
          {
            title: 'Building Permits',
            folderName: 'Building Permits',
            description: 'City and county building permits',
            type: 'FOLDER',
            sortOrder: 1,
            metadata: { icon: 'folder', color: 'purple' }
          },
          {
            title: 'State Regulations',
            folderName: 'State Regulations',
            description: 'State-specific regulatory documents',
            type: 'FOLDER',
            sortOrder: 2,
            metadata: { icon: 'folder', color: 'purple' }
          },
          {
            title: 'Colorado Specific',
            folderName: 'Colorado Specific',
            description: 'Colorado state regulations and requirements',
            type: 'FOLDER',
            sortOrder: 3,
            metadata: { icon: 'folder', color: 'purple' }
          }
        ]
      },
      {
        title: 'Safety Documentation',
        folderName: 'Safety Documentation',
        description: 'Safety protocols, training materials, and incident reports',
        type: 'FOLDER',
        sortOrder: 5,
        metadata: {
          icon: 'folder',
          color: 'red',
          displayOrder: 5
        },
        children: [
          {
            title: 'Safety Protocols',
            folderName: 'Safety Protocols',
            description: 'Company safety procedures and protocols',
            type: 'FOLDER',
            sortOrder: 1,
            metadata: { icon: 'folder', color: 'red' }
          },
          {
            title: 'Training Materials',
            folderName: 'Training Materials',
            description: 'Safety training documents and guides',
            type: 'FOLDER',
            sortOrder: 2,
            metadata: { icon: 'folder', color: 'red' }
          },
          {
            title: 'Incident Reports',
            folderName: 'Incident Reports',
            description: 'Safety incident documentation',
            type: 'FOLDER',
            sortOrder: 3,
            metadata: { icon: 'folder', color: 'red' }
          }
        ]
      }
    ];
    
    // Sample documents to add
    const sampleDocuments = [
      {
        title: '5-Year Roofing Warranty Certificate Template',
        description: 'Standard 5-year warranty template for roofing projects',
        fileName: '5-year-warranty-certificate.pdf',
        fileUrl: '/uploads/company-assets/5-year-warranty-certificate.pdf',
        mimeType: 'application/pdf',
        fileSize: 2200000, // 2.2 MB
        type: 'FILE',
        tags: ['warranty', '5-year', 'roofing', 'template'],
        isPublic: true,
        version: 2,
        metadata: {
          icon: 'file-pdf',
          lastModifiedBy: 'John Smith',
          department: 'Legal'
        }
      },
      {
        title: 'Colorado Springs Roofing Permits Guide',
        description: 'Complete guide for obtaining roofing permits in Colorado Springs',
        fileName: 'colorado-springs-permits.docx',
        fileUrl: '/uploads/company-assets/colorado-springs-permits.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 876000, // 876 KB
        type: 'FILE',
        tags: ['permits', 'colorado', 'roofing', 'guide'],
        isPublic: false,
        version: 1,
        metadata: {
          icon: 'file-word',
          lastModifiedBy: 'Sarah Johnson',
          department: 'Compliance'
        }
      },
      {
        title: 'Roof Inspection Report Template',
        description: 'Standard roof inspection checklist and report template',
        fileName: 'inspection-report-template.pdf',
        fileUrl: '/uploads/company-assets/inspection-report-template.pdf',
        mimeType: 'application/pdf',
        fileSize: 1500000, // 1.5 MB
        type: 'FILE',
        tags: ['inspection', 'template', 'roofing', 'checklist'],
        isPublic: true,
        version: 3,
        metadata: {
          icon: 'file-pdf',
          lastModifiedBy: 'Mike Davis',
          department: 'Quality Assurance'
        }
      },
      {
        title: 'Safety Harness Training Guide',
        description: 'Comprehensive guide for proper safety harness usage',
        fileName: 'safety-harness-guide.pdf',
        fileUrl: '/uploads/company-assets/safety-harness-guide.pdf',
        mimeType: 'application/pdf',
        fileSize: 3200000, // 3.2 MB
        type: 'FILE',
        tags: ['safety', 'training', 'equipment', 'guide'],
        isPublic: false,
        version: 2,
        metadata: {
          icon: 'file-pdf',
          lastModifiedBy: 'Tom Wilson',
          department: 'Safety'
        }
      },
      {
        title: 'Standard Customer Contract Template',
        description: 'Template for residential roofing contracts',
        fileName: 'customer-contract-template.docx',
        fileUrl: '/uploads/company-assets/customer-contract-template.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 125000, // 125 KB
        type: 'FILE',
        tags: ['contract', 'template', 'customer', 'residential'],
        isPublic: false,
        version: 4,
        metadata: {
          icon: 'file-word',
          lastModifiedBy: 'Lisa Chen',
          department: 'Legal'
        }
      }
    ];
    
    // Function to create folder structure recursively
    async function createFolderStructure(folders, parentId = null, parentPath = '') {
      for (const folder of folders) {
        const currentPath = parentPath ? `${parentPath}/${folder.folderName}` : folder.folderName;
        
        // Check if folder already exists
        let existingFolder = await prisma.companyAsset.findFirst({
          where: {
            title: folder.title,
            parentId: parentId,
            type: 'FOLDER'
          }
        });
        
        if (!existingFolder) {
          // Create the folder
          existingFolder = await prisma.companyAsset.create({
            data: {
              title: folder.title,
              description: folder.description,
              type: folder.type,
              path: currentPath,
              sortOrder: folder.sortOrder,
              isActive: true,
              // Enhanced fields (mapped via Prisma @map)
              folderName: folder.folderName,
              metadata: folder.metadata,
              isPublic: false,
              ...(parentId ? { parent: { connect: { id: parentId } } } : {})
            }
          });
          console.log(`✅ Created folder: ${currentPath}`);
        } else {
          // Update existing folder with enhanced fields
          existingFolder = await prisma.companyAsset.update({
            where: { id: existingFolder.id },
            data: {
              folderName: folder.folderName,
              description: folder.description || existingFolder.description,
              path: currentPath,
              sortOrder: folder.sortOrder,
              metadata: folder.metadata || existingFolder.metadata
            }
          });
          console.log(`📝 Updated folder: ${currentPath}`);
        }
        
        // Recursively create children
        if (folder.children && folder.children.length > 0) {
          await createFolderStructure(folder.children, existingFolder.id, currentPath);
        }
      }
    }
    
    // Create the folder structure
    await createFolderStructure(folderStructure);
    
    // Add sample documents to specific folders
    const documentPlacements = [
      { document: sampleDocuments[0], folderPath: 'Warranties & Certifications/5-Year Warranties' },
      { document: sampleDocuments[1], folderPath: 'Permits & Compliance/Colorado Specific' },
      { document: sampleDocuments[2], folderPath: 'Inspection Reports/Pre-Work Inspections' },
      { document: sampleDocuments[3], folderPath: 'Safety Documentation/Training Materials' },
      { document: sampleDocuments[4], folderPath: 'Contracts & Agreements/Customer Contracts' }
    ];
    
    for (const { document, folderPath } of documentPlacements) {
      // Find the target folder
      const targetFolder = await prisma.companyAsset.findFirst({
        where: {
          path: folderPath,
          type: 'FOLDER'
        }
      });
      
      if (targetFolder) {
        // Check if document already exists
        const existingDoc = await prisma.companyAsset.findFirst({
          where: {
            title: document.title,
            parentId: targetFolder.id,
            type: 'FILE'
          }
        });
        
        if (!existingDoc) {
          // Create the document
          const newDoc = await prisma.companyAsset.create({
            data: {
              title: document.title,
              description: document.description,
              type: document.type,
              fileUrl: document.fileUrl,
              mimeType: document.mimeType,
              fileSize: document.fileSize,
              tags: document.tags,
              isPublic: document.isPublic,
              version: document.version,
              metadata: document.metadata,
              section: getDocumentSection(folderPath),
              path: `${folderPath}/${document.fileName}`,
              parent: { connect: { id: targetFolder.id } }
            }
          });
          
          // Create initial version entry
          await prisma.companyAssetVersion.create({
            data: {
              assetId: newDoc.id,
              versionNumber: document.version,
              fileUrl: document.fileUrl,
              fileSize: document.fileSize,
              changeDescription: 'Initial version',
              isCurrent: true
            }
          });
          
          console.log(`✅ Created document: ${document.title} in ${folderPath}`);
        } else {
          console.log(`⏭️  Document already exists: ${document.title}`);
        }
      } else {
        console.log(`⚠️  Target folder not found: ${folderPath}`);
      }
    }
    
    console.log('✨ Company documents seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding company documents:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to map folder paths to document sections
function getDocumentSection(folderPath) {
  if (folderPath.includes('Contracts')) return 'CONTRACTS_SIGNED_DOCUMENTS';
  if (folderPath.includes('Warranties')) return 'CERTS_WARRANTIES_INSPECTIONS';
  if (folderPath.includes('Inspection')) return 'CERTS_WARRANTIES_INSPECTIONS';
  if (folderPath.includes('Permits')) return 'OFFICE_DOCUMENTS';
  if (folderPath.includes('Safety')) return 'SOPS_TRAINING';
  return 'OFFICE_DOCUMENTS';
}

// Run the seeding function
seedCompanyDocuments()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
