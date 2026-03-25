# Documents & Resources System

A comprehensive document management system for the Kenstruction roofing contractor application, designed to handle contracts, warranties, permits, forms, and project-specific documents with advanced filtering, search, and access control.

## 🎯 Overview

The Documents & Resources system provides a modern, user-friendly interface for managing all types of documents in a roofing contractor business. It supports both public documents (accessible to all users) and private documents (tied to specific projects or user roles).

## ✨ Key Features

### 🔍 **Advanced Search & Filtering**
- Full-text search across titles, descriptions, and tags
- Filter by category, file type, access level, region, and state
- Smart tag-based filtering
- Real-time search with debouncing

### 📁 **Document Categories**
- **Contracts**: Project agreements and terms
- **Warranties**: Service and product warranties
- **Permits**: Building permits and approvals
- **Inspections**: Inspection reports and checklists
- **Estimates**: Project estimates and quotes
- **Invoices**: Billing and payment documents
- **Photos**: Project photos and documentation
- **Reports**: Various business reports
- **Forms**: Customer and internal forms
- **Checklists**: Quality control and process checklists
- **Manuals**: Training and procedure manuals
- **Training**: Educational materials
- **Compliance**: Regulatory and safety documents
- **Legal**: Legal documents and disclaimers
- **Marketing**: Marketing materials and brochures

### 🔐 **Access Control**
- **Public**: Accessible to all users
- **Authenticated**: Requires user login
- **Private**: Project-specific access
- **Internal**: Staff members only
- **Admin**: Administrators only

### 📱 **User Experience**
- Responsive design (mobile, tablet, desktop)
- Grid and list view modes
- Document preview functionality
- Drag-and-drop file upload
- Bulk operations support
- Favorites system
- Download tracking

### 🔧 **Admin Features**
- Document upload with metadata
- Version control and history
- Access permission management
- Document archiving
- Template management
- Analytics and reporting

## 🏗️ Architecture

### Database Schema

The system extends the existing Prisma schema with enhanced document management:

```prisma
model Document {
  id                 String                  @id @default(cuid())
  createdAt          DateTime                @default(now())
  updatedAt          DateTime                @updatedAt
  
  // Basic file information
  fileName           String                  @db.VarChar(255)
  originalName       String                  @db.VarChar(255)
  fileUrl            String                  @db.VarChar(1000)
  mimeType           String                  @db.VarChar(100)
  fileSize           Int
  fileType           DocumentType
  
  // Enhanced metadata
  title              String?                 @db.VarChar(200)
  description        String?                 @db.VarChar(1000)
  category           DocumentCategory        @default(OTHER)
  accessLevel        AccessLevel            @default(PRIVATE)
  region             String?                 @db.VarChar(100)
  state              String?                 @db.VarChar(50)
  language           String?                 @db.VarChar(10) @default("en")
  thumbnailUrl       String?                 @db.VarChar(1000)
  previewUrl         String?                 @db.VarChar(1000)
  
  // Document properties
  isTemplate         Boolean                 @default(false)
  isArchived         Boolean                 @default(false)
  archivedAt         DateTime?
  expiryDate         DateTime?
  requiresSignature  Boolean                 @default(false)
  signatureRequiredBy DateTime?
  
  // Search and organization
  searchVector       String?                 @db.Text
  keywords           String[]
  relatedDocuments   String[]
  tags               String[]
  version            Int                     @default(1)
  isActive           Boolean                 @default(true)
  downloadCount      Int                     @default(0)
  lastDownloadedAt   DateTime?
  checksum           String?                 @db.VarChar(255)
  isPublic           Boolean                 @default(false)
  
  // Relationships
  projectId          String?                 @map("project_id")
  project            Project?                @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploadedById       String                  @map("uploaded_by_id")
  uploadedBy         User                    @relation("UploadedBy", fields: [uploadedById], references: [id])
  
  // Enhanced relationships
  downloads          DocumentDownload[]
  documentVersions   DocumentVersion[]
  documentAccess     DocumentAccess[]
  documentComments   DocumentComment[]
  documentFavorites  DocumentFavorite[]
}
```

### API Endpoints

#### Document Management
- `GET /api/documents-enhanced` - List documents with filtering
- `GET /api/documents-enhanced/:id` - Get document details
- `POST /api/documents-enhanced` - Upload new document
- `PUT /api/documents-enhanced/:id` - Update document
- `DELETE /api/documents-enhanced/:id` - Delete document (soft delete)

#### Document Actions
- `POST /api/documents-enhanced/:id/download` - Track download
- `POST /api/documents-enhanced/:id/favorite` - Toggle favorite
- `GET /api/documents-enhanced/categories` - Get categories with counts

#### Advanced Features
- `GET /api/documents-enhanced/search` - Advanced search
- `GET /api/documents-enhanced/favorites` - User's favorite documents
- `GET /api/documents-enhanced/recent` - Recent documents
- `GET /api/documents-enhanced/templates` - Document templates
- `POST /api/documents-enhanced/bulk-download` - Bulk download
- `POST /api/documents-enhanced/bulk-update` - Bulk update

### Frontend Components

#### Core Components
- `DocumentsPage` - Main documents listing page
- `DocumentCard` - Individual document display (grid/list)
- `DocumentFilters` - Advanced filtering sidebar
- `DocumentUploadModal` - Document upload interface
- `DocumentPreviewModal` - Document preview and details

#### Services
- `documentService` - API client for document operations
- Comprehensive error handling and loading states
- Optimistic updates for better UX

## 🚀 Getting Started

### 1. Database Setup

Run the Prisma migration to add the new document models:

```bash
cd server
npm run prisma:generate
npm run prisma:push
```

### 2. Seed Sample Data

Create sample documents for testing:

```bash
cd server
node scripts/seed-documents.js
```

### 3. Start the Application

```bash
# Backend
cd server
npm run dev

# Frontend
npm start
```

### 4. Access the Documents Page

Navigate to "Documents & Resources" in the main navigation menu.

## 📋 Usage Guide

### For Homeowners
1. **Browse Public Documents**: Access contracts, warranties, and forms
2. **Search & Filter**: Find specific documents quickly
3. **Preview Documents**: View document details before downloading
4. **Download**: Get copies of important documents

### For Contractors/Staff
1. **Upload Documents**: Add project-specific documents
2. **Manage Access**: Control who can view each document
3. **Use Templates**: Create documents from templates
4. **Track Usage**: Monitor downloads and engagement

### For Administrators
1. **Full Control**: Manage all documents and permissions
2. **Analytics**: View document usage statistics
3. **Bulk Operations**: Update multiple documents at once
4. **Version Control**: Manage document versions and history

## 🔧 Configuration

### Environment Variables

```env
# File upload settings
MAX_FILE_SIZE=52428800  # 50MB in bytes
UPLOAD_PATH=./uploads/documents

# Supported file types
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png,gif,txt,xls,xlsx

# Search settings
SEARCH_DEBOUNCE_MS=300
MAX_SEARCH_RESULTS=100
```

### File Upload Configuration

The system supports various file types with size limits:

- **PDF**: Up to 50MB
- **Word Documents**: .doc, .docx
- **Excel Spreadsheets**: .xls, .xlsx
- **Images**: .jpg, .jpeg, .png, .gif
- **Text Files**: .txt

### Access Control

Configure access levels based on user roles:

```javascript
const accessLevels = {
  PUBLIC: 'Anyone can access',
  AUTHENTICATED: 'Logged in users only',
  PRIVATE: 'Project-specific access',
  INTERNAL: 'Staff members only',
  ADMIN: 'Administrators only'
};
```

## 🎨 Customization

### Styling

The system uses Tailwind CSS for styling. Key customization points:

- **Colors**: Update the color scheme in `tailwind.config.js`
- **Layout**: Modify component layouts in the React components
- **Icons**: Replace Heroicons with your preferred icon library

### Categories and Types

Add new document categories or file types by updating the Prisma enums:

```prisma
enum DocumentCategory {
  CONTRACTS
  WARRANTIES
  // Add new categories here
  CUSTOM_CATEGORY
}

enum DocumentType {
  CONTRACT
  WARRANTY
  // Add new types here
  CUSTOM_TYPE
}
```

### Search Configuration

Customize search behavior in the API endpoints:

```javascript
// Enhanced search with custom fields
const searchFields = [
  'title',
  'description',
  'originalName',
  'tags',
  'keywords'
];
```

## 📊 Analytics and Reporting

### Document Statistics

Track key metrics:
- Total documents by category
- Download counts and trends
- User engagement by document type
- Popular documents and templates

### Usage Reports

Generate reports for:
- Document access patterns
- User activity by role
- Storage usage by category
- Compliance tracking

## 🔒 Security Features

### File Security
- Secure file storage with access control
- File type validation and sanitization
- Virus scanning integration (recommended)
- Checksum verification for file integrity

### Access Control
- Role-based permissions
- Project-specific access controls
- Audit logging for sensitive operations
- Secure download URLs with expiration

### Data Protection
- Input validation and sanitization
- XSS protection
- CSRF protection
- Rate limiting on uploads

## 🚀 Performance Optimization

### Frontend Optimizations
- Lazy loading of document previews
- Virtual scrolling for large lists
- Image optimization and thumbnails
- Caching of search results

### Backend Optimizations
- Database indexing on search fields
- File serving optimization
- CDN integration for static files
- Caching of frequently accessed documents

## 🧪 Testing

### Unit Tests
```bash
cd server
npm test -- --testPathPattern=documents
```

### Integration Tests
```bash
cd server
npm test -- --testPathPattern=integration
```

### E2E Tests
```bash
npm run test:e2e -- --spec="documents.spec.js"
```

## 📈 Future Enhancements

### Planned Features
- **E-signature Integration**: Digital signature support
- **Version Control**: Advanced versioning with diff views
- **Collaboration**: Real-time document collaboration
- **AI-Powered Search**: Semantic search capabilities
- **Mobile App**: Native mobile application
- **Workflow Integration**: Document approval workflows

### Integration Opportunities
- **Cloud Storage**: AWS S3, Google Drive integration
- **Document Processing**: OCR and text extraction
- **Email Integration**: Document sharing via email
- **Calendar Integration**: Document-related reminders

## 🐛 Troubleshooting

### Common Issues

#### Upload Failures
- Check file size limits
- Verify file type permissions
- Ensure sufficient disk space
- Check network connectivity

#### Search Issues
- Verify database indexes
- Check search vector updates
- Clear search cache if needed

#### Access Denied
- Verify user permissions
- Check document access levels
- Ensure proper authentication

### Debug Mode

Enable debug logging:

```javascript
// In server configuration
const DEBUG_DOCUMENTS = process.env.DEBUG_DOCUMENTS === 'true';
```

## 📞 Support

For technical support or feature requests:

1. Check the troubleshooting section above
2. Review the API documentation
3. Create an issue in the project repository
4. Contact the development team

## 📄 License

This document management system is part of the Kenstruction roofing contractor application and follows the same licensing terms.

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team
