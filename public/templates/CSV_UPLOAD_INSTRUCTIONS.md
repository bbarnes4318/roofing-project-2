# 📊 CSV Upload Instructions

## 📋 **Customer Upload Template**

### **Required Fields:**
- **primaryName** - Customer's primary contact name (required)
- **primaryEmail** - Primary email address (required, must be unique)
- **primaryPhone** - Primary phone number (required)
- **address** - Full project address (required)

### **Optional Fields:**
- **secondaryName** - Secondary contact name
- **secondaryEmail** - Secondary email address  
- **secondaryPhone** - Secondary phone number
- **primaryContact** - Which contact is primary (PRIMARY or SECONDARY, defaults to PRIMARY)
- **notes** - Additional customer notes

### **Sample Customer CSV:**
```csv
primaryName,primaryEmail,primaryPhone,secondaryName,secondaryEmail,secondaryPhone,primaryContact,address,notes
John Smith,john.smith@email.com,303-555-0001,Jane Smith,jane.smith@email.com,303-555-0002,PRIMARY,"1234 Oak Street, Denver, CO 80202",Preferred contact is primary customer
```

---

## 🏗️ **Project Upload Template**

### **Required Fields:**
- **projectName** - Project address/name (required)
- **projectType** - Type of project (required, see options below)
- **budget** - Project budget in dollars (required)
- **startDate** - Project start date (YYYY-MM-DD format, required)
- **endDate** - Project end date (YYYY-MM-DD format, required)
- **customerEmail** - Email of existing customer (required, must exist in system)

### **Optional Fields:**
- **status** - Project status (PENDING, IN_PROGRESS, COMPLETED, ON_HOLD, defaults to PENDING)
- **priority** - Project priority (LOW, MEDIUM, HIGH, defaults to MEDIUM)
- **estimatedCost** - Estimated project cost
- **description** - Project description
- **notes** - Additional project notes
- **pmPhone** - Project manager phone number
- **pmEmail** - Project manager email
- **projectManagerEmail** - Email of assigned project manager (must exist in system)

### **Project Type Options:**
- ROOF_REPLACEMENT
- KITCHEN_REMODEL
- BATHROOM_RENOVATION
- SIDING_INSTALLATION
- WINDOW_REPLACEMENT
- FLOORING
- PAINTING
- ELECTRICAL_WORK
- PLUMBING
- HVAC
- DECK_CONSTRUCTION
- LANDSCAPING
- OTHER

### **Sample Project CSV:**
```csv
projectName,projectType,status,priority,budget,estimatedCost,startDate,endDate,description,notes,pmPhone,pmEmail,customerEmail,projectManagerEmail
"1234 Oak Street, Denver, CO 80202",ROOF_REPLACEMENT,PENDING,MEDIUM,25000.00,23500.00,2024-01-15,2024-02-15,Complete roof replacement with architectural shingles,Customer prefers morning start times,303-555-1001,pm@company.com,john.smith@email.com,mike.johnson@company.com
```

---

## ⚠️ **Important Notes:**

### **For Customer Uploads:**
1. **primaryEmail** must be unique across all customers
2. **primaryContact** defaults to PRIMARY if not specified
3. If only one contact is provided, leave secondary fields empty
4. **address** will be used as the project name/location

### **For Project Uploads:**
1. **customerEmail** must match an existing customer in the system
2. **projectManagerEmail** must match an existing user if specified
3. **budget** should be in decimal format (e.g., 25000.00)
4. **Dates** must be in YYYY-MM-DD format
5. **projectName** typically matches the customer's address

### **Data Validation:**
- Email addresses must be valid format
- Phone numbers should include area code
- Dates must be valid and in correct format
- Budget/cost fields must be numeric
- Project types must match exact enum values

### **Upload Process:**
1. Download the appropriate template
2. Fill in your data following the format
3. Save as CSV file
4. Use the upload feature in Settings
5. Review any errors and fix data as needed
6. Confirm successful upload

---

## 🔧 **Troubleshooting:**

**Common Issues:**
- **"Customer not found"** - Ensure customerEmail exists in system
- **"Invalid project type"** - Use exact enum values from list above
- **"Invalid date format"** - Use YYYY-MM-DD format
- **"Duplicate email"** - Customer emails must be unique
- **"Invalid budget"** - Use numeric format with decimals

**Tips:**
- Use quotes around addresses with commas
- Don't include headers multiple times if combining files
- Check for trailing spaces in email addresses
- Ensure all required fields have values