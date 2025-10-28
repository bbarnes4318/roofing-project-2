# Form Submissions API Documentation

## Overview
This API receives form submissions (intake forms and W9 forms) and automatically generates professional PDF documents.

## Endpoints

### 1. **Webhook Endpoint** (Receives form submissions)
```
POST /api/form-submissions/webhook
Content-Type: application/json
```

#### For Intake Forms (Section 1: Documents)
```json
{
  "id": "eyOL_qHBDP",
  "type": "intake",
  "receivedAt": "2025-10-26T00:52:29.115Z",
  "contact": {
    "firstName": "James",
    "lastName": "Kelly",
    "email": "jimmy@getlifeassurance.com",
    "phone": "8653969104"
  },
  "business": {
    "agencyName": "Kelly Insurance",
    "website": "https://example.com",
    "address1": "123 Main St",
    "address2": "Suite 100",
    "city": "Knoxville",
    "state": "TN",
    "zip": "37920"
  },
  "npn": "12345678",
  "statesLicensed": ["CT", "TN"],
  "background": {
    "priorTerminations": false,
    "priorTerminationsExplain": "",
    "felonies": false,
    "feloniesExplain": "",
    "bankruptcies": false,
    "bankruptciesExplain": ""
  },
  "acknowledgments": {
    "producerAgreementAccepted": true,
    "privacyNoticeAccepted": true,
    "signature": "James Kelly",
    "signatureDate": "October 25, 2025"
  }
}
```

#### For W9 Forms (Section 2: W9)
```json
{
  "id": "abc123xyz",
  "type": "w9",
  "receivedAt": "2025-10-26T00:52:29.115Z",
  "name": "James Kelly",
  "businessName": "Kelly Insurance LLC",
  "taxClassification": "llc",
  "taxClassificationOther": "",
  "address": "123 Main St",
  "city": "Knoxville",
  "state": "TN",
  "zip": "37920",
  "ssn": "123456789",
  "ein": "12-3456789",
  "signature": "James Kelly",
  "signatureDate": "October 25, 2025"
}
```

#### Response
```json
{
  "success": true,
  "message": "PDF generated successfully for intake submission",
  "data": {
    "submissionId": "eyOL_qHBDP",
    "type": "intake",
    "pdfFileName": "intake_eyOL_qHBDP_1729902749115.pdf",
    "downloadUrl": "/api/form-submissions/download/intake_eyOL_qHBDP_1729902749115.pdf",
    "generatedAt": "2025-10-26T00:52:29.115Z"
  }
}
```

### 2. **Download PDF**
```
GET /api/form-submissions/download/:filename
```
Downloads the generated PDF file.

**Example:**
```
GET /api/form-submissions/download/intake_eyOL_qHBDP_1729902749115.pdf
```

### 3. **List All PDFs**
```
GET /api/form-submissions/list
```

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "intake_eyOL_qHBDP_1729902749115.pdf",
        "size": 45678,
        "createdAt": "2025-10-26T00:52:29.115Z",
        "downloadUrl": "/api/form-submissions/download/intake_eyOL_qHBDP_1729902749115.pdf"
      },
      {
        "filename": "w9_abc123xyz_1729902850220.pdf",
        "size": 32456,
        "createdAt": "2025-10-26T00:54:10.220Z",
        "downloadUrl": "/api/form-submissions/download/w9_abc123xyz_1729902850220.pdf"
      }
    ]
  },
  "message": "Found 2 PDF(s)"
}
```

## Setting Up Your Form Service

### If using Typeform, Jotform, Google Forms, etc.:
1. Add a webhook to your form that posts to:
   ```
   https://your-domain.com/api/form-submissions/webhook
   ```

2. Map your form fields to the JSON structure shown above

3. Make sure to include:
   - `type: "intake"` for intake forms
   - `type: "w9"` for W9 forms
   - All required fields

### Test with cURL:

**Test Intake Form:**
```bash
curl -X POST https://your-domain.com/api/form-submissions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test123",
    "type": "intake",
    "receivedAt": "2025-10-26T00:52:29.115Z",
    "contact": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "1234567890"
    },
    "business": {
      "agencyName": "Test Agency",
      "city": "Test City",
      "state": "TN"
    },
    "npn": "12345678",
    "statesLicensed": ["TN"],
    "background": {
      "priorTerminations": false,
      "felonies": false,
      "bankruptcies": false
    },
    "acknowledgments": {
      "producerAgreementAccepted": true,
      "privacyNoticeAccepted": true,
      "signature": "Test User",
      "signatureDate": "October 26, 2025"
    }
  }'
```

**Test W9 Form:**
```bash
curl -X POST https://your-domain.com/api/form-submissions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test456",
    "type": "w9",
    "receivedAt": "2025-10-26T00:52:29.115Z",
    "name": "Test User",
    "taxClassification": "individual",
    "address": "123 Test St",
    "city": "Test City",
    "state": "TN",
    "zip": "12345",
    "ssn": "123456789",
    "signature": "Test User",
    "signatureDate": "October 26, 2025"
  }'
```

## PDF Output

### Intake PDF Includes:
- Header with submission ID and date
- Contact Information
- Business Information
- License Information (NPN, states)
- Background checks (terminations, felonies, bankruptcies)
- Acknowledgments & Electronic Signature

### W9 PDF Includes:
- Official W-9 header
- Name and business name
- Federal tax classification
- Address
- Taxpayer Identification Number (SSN/EIN, with SSN partially masked)
- Full certification text
- Electronic Signature

## Storage
PDFs are stored in: `server/uploads/form-submissions/`

## Error Handling
If submission fails, you'll receive:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Notes
- The webhook endpoint is public (no authentication required)
- Download links are public once generated
- Consider adding authentication if needed for your use case
- PDFs include electronic signatures formatted prominently
- All submission data is preserved in the PDF

