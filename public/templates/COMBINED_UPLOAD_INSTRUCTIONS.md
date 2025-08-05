# 📊 Combined Project + Customer Upload Instructions

## 🎯 **Overview**
Upload projects and their associated customers in a single CSV file. Each row creates both a project and its customer.

## 📋 **Required Fields**

### **Project Fields:**
- **projectNumber** - Unique project identifier (e.g., "2024-001", "PROJ-123")
- **projectName** - Descriptive project name 
- **projectType** - Must be one of: ROOF_REPLACEMENT, KITCHEN_REMODEL, BATHROOM_RENOVATION, ADDITION, GENERAL_CONTRACTOR, OTHER
- **status** - Must be one of: PENDING, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED
- **priority** - Must be one of: LOW, MEDIUM, HIGH, URGENT
- **address** - Full project address (same as customer address)

### **Customer Fields:**
- **primaryName** - Customer's primary contact name (required)
- **primaryEmail** - Primary email address (required, must be unique)
- **primaryPhone** - Primary phone number (required)
- **primaryContact** - Must be one of: PRIMARY, SECONDARY, SINGLE

## 📝 **Optional Fields**

### **Project Optional:**
- **budget** - Total project budget (decimal format: 25000.00)
- **estimatedCost** - Estimated actual cost
- **startDate** - Project start date (YYYY-MM-DD format)
- **endDate** - Project end date (YYYY-MM-DD format)
- **description** - Project description
- **notes** - Project notes
- **pmPhone** - Project manager phone
- **pmEmail** - Project manager email

### **Customer Optional:**
- **secondaryName** - Secondary contact name
- **secondaryEmail** - Secondary contact email
- **secondaryPhone** - Secondary contact phone
- **customerNotes** - Customer-specific notes

## ⚠️ **Important Guidelines**

1. **Project Numbers Must Be Unique** - Each projectNumber must be different
2. **Email Addresses Must Be Unique** - Each primaryEmail must be different
3. **Dates Format** - Use YYYY-MM-DD format (e.g., 2024-01-15)
4. **Money Format** - Use decimal format without commas (e.g., 25000.00)
5. **Enums Are Case-Sensitive** - Use exact values shown above
6. **Address Matching** - Project address should match customer address

## 🔄 **Process Flow**
1. System creates the customer first
2. Then creates the project linked to that customer
3. If either fails, both are rolled back
4. Duplicate emails or project numbers will be rejected

## 📁 **File Requirements**
- **Format**: CSV (.csv) or Excel (.xlsx)
- **Size Limit**: 10MB maximum
- **Encoding**: UTF-8 recommended

## 💡 **Tips**
- Use the provided template as a starting point
- Test with a small batch first
- Double-check enum values (case-sensitive)
- Ensure project numbers follow your numbering system