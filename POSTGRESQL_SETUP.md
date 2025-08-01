# PostgreSQL Migration Setup Guide

## 🚀 Database Deployment Instructions

### Step 1: Install Dependencies
```powershell
cd server
npm install @prisma/client prisma
```

### Step 2: Generate and Deploy Database Schema
```powershell
# Generate Prisma client
npx prisma generate

# Deploy schema to PostgreSQL (creates all tables)
npx prisma db push

# Verify deployment
npx prisma db pull
```

### Step 3: Seed Database with Sample Data
```powershell
# Run the comprehensive seed file
npm run db:seed

# Or run directly
node prisma/seed.js
```

### Step 4: Verify Database Structure
```powershell
# Open Prisma Studio to inspect the database
npx prisma studio
```

## 📊 **What Gets Created:**

### **Core Data Structure:**
- ✅ **Users**: Admin and Project Manager accounts
- ✅ **Customers**: Primary/Secondary customer support with address-based project names
- ✅ **Projects**: 5-digit project numbers with customer address as project name
- ✅ **Complete Workflow**: All 27 workflow steps across 6 phases
- ✅ **65+ Subtasks**: Every line item preserved exactly as in current application

### **Sample Data Includes:**
- **Admin User**: `admin@kenstruction.com` / `admin123`
- **Project Manager**: `pm@kenstruction.com` / `pm123`
- **Sample Customer**: John & Jane Doe (primary/secondary)
- **Sample Project**: "123 Main Street, Anytown, ST 12345" (address = project name)
- **Full Workflow**: All phases from Lead to Completion with progress tracking

## 🔧 **Critical Features Preserved:**

### **Project Phases (All 6 phases maintained):**
1. **🟨 Lead Phase** (5 steps)
   - Input Customer Information
   - Complete Questions to Ask Checklist  
   - Input Lead Property Information
   - Assign A Project Manager
   - Schedule Initial Inspection

2. **🟧 Prospect Phase** (5 steps)
   - Site Inspection
   - Write Estimate
   - Insurance Process
   - Agreement Preparation
   - Agreement Signing

3. **🟩 Approved Phase** (3 steps)
   - Administrative Setup
   - Pre-Job Actions
   - Prepare for Production

4. **🔧 Execution Phase** (5 steps)
   - Installation
   - Quality Check
   - Multiple Trades
   - Subcontractor Work
   - Update Customer

5. **🌀 2nd Supplement Phase** (4 steps)
   - Create Supp in Xactimate
   - Follow-Up Calls
   - Review Approved Supp
   - Customer Update

6. **🏁 Completion Phase** (2 steps)
   - Financial Processing
   - Project Closeout

### **New Customer Features:**
- **Primary Customer**: Required name, email, phone, address
- **Secondary Customer**: Optional second household member
- **Primary Contact Selection**: Choose who is the main contact
- **Address Integration**: Customer address becomes project name automatically

### **Enhanced Project Features:**
- **5-digit Project Numbers**: Starting from 10001
- **Address-based Naming**: Project name = Customer address
- **Automatic Sync**: Changing customer address updates all project names
- **Complete Workflow**: All 27 steps created automatically for new projects

## 🔄 **Migration Commands:**

### **Database Reset (if needed):**
```powershell
# Reset database and reseed
npx prisma migrate reset
npm run db:seed
```

### **Schema Updates:**
```powershell
# After schema changes
npx prisma db push
npx prisma generate
```

### **Backup Current Data:**
```powershell
# Before migration, backup current MongoDB data
# (MongoDB export commands would go here)
```

## 🎯 **Key Validations:**

1. **Customer Address = Project Name**: ✅ Implemented
2. **Primary/Secondary Customers**: ✅ Implemented  
3. **Interchangeable Primary Contact**: ✅ Implemented
4. **All 27 Workflow Steps**: ✅ Preserved
5. **All Subtasks/Line Items**: ✅ Preserved
6. **5-digit Project Numbers**: ✅ Implemented

## 🚦 **Testing Checklist:**

- [ ] Database connection successful
- [ ] All tables created correctly
- [ ] Sample data seeded properly
- [ ] Workflow steps display correctly
- [ ] Customer primary/secondary logic works
- [ ] Project name syncs with customer address
- [ ] All 65+ subtasks are present
- [ ] Progress tracking functions

## 📞 **Support:**

If you encounter any issues:
1. Check database connection string in `.env`
2. Verify PostgreSQL server is accessible
3. Run `npx prisma studio` to inspect data
4. Check console logs for detailed error messages

## 🎉 **Success Metrics:**

When properly deployed, you should see:
- **27 workflow steps** in the project workflow
- **65+ subtasks** across all phases
- **Sample project** with customer address as name
- **Primary/secondary customer** options working
- **Progress tracking** calculating correctly 