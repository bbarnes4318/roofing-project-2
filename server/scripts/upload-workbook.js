/*
 * Direct workbook uploader (no HTTP, no token)
 * Usage: node server/scripts/upload-workbook.js "C:\\path\\to\\file.xlsx"
 */

const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { prisma } = require('../config/prisma');
const {
  COMPLETE_FIELD_MAPPING,
  DataProcessor,
  getAllTables,
  getTableInfo
} = require('../utils/completeFieldMapping');

// Helpers to ensure base entities exist
let seqCounter = 90000;
async function ensureUser(userId, seed = {}) {
  if (userId) {
    const found = await prisma.user.findUnique({ where: { id: userId } });
    if (found) return found.id;
  }
  const email = seed.email || `user${Date.now()}${Math.floor(Math.random()*1000)}@example.local`;
  const data = {
    firstName: seed.firstName || 'Seed',
    lastName: seed.lastName || 'User',
    email: email.toLowerCase(),
    password: 'Temp#12345'
  };
  if (userId) data.id = userId;
  const created = await prisma.user.create({ data });
  return created.id;
}

async function ensureCustomer(customerId, seed = {}) {
  if (customerId) {
    const found = await prisma.customer.findUnique({ where: { id: customerId } });
    if (found) return found.id;
  }
  const email = seed.primaryEmail || `customer${Date.now()}${Math.floor(Math.random()*1000)}@example.local`;
  const data = {
    primaryName: seed.primaryName || 'Seed Customer',
    primaryEmail: email.toLowerCase(),
    primaryPhone: seed.primaryPhone || '555-0100',
    address: seed.address || '123 Seed St, Colorado Springs, CO'
  };
  if (customerId) data.id = customerId;
  const created = await prisma.customer.create({ data });
  return created.id;
}

async function ensureProject(projectId, projectNumber) {
  if (projectId) {
    const found = await prisma.project.findUnique({ where: { id: projectId } });
    if (found) return found.id;
  }
  // Create seed customer
  const customerId = await ensureCustomer(null, {});
  const num = projectNumber || (seqCounter++);
  const now = new Date();
  const end = new Date(now.getTime() + 7*24*60*60*1000);
  const data = {
    projectNumber: num,
    projectName: `Seed Project ${num}`,
    projectType: 'ROOFING',
    status: 'PENDING',
    progress: 0,
    budget: 0,
    startDate: now,
    endDate: end,
    customerId
  };
  if (projectId) data.id = projectId;
  const created = await prisma.project.create({ data });
  return created.id;
}

async function ensureTracker(trackerId, projectId) {
  if (trackerId) {
    const found = await prisma.projectWorkflowTracker.findUnique({ where: { id: trackerId } });
    if (found) return found.id;
  }
  const projId = projectId || await ensureProject(null, null);
  const data = {
    projectId: projId
  };
  if (trackerId) data.id = trackerId;
  const created = await prisma.projectWorkflowTracker.create({ data });
  return created.id;
}

const TABLE_TO_MODEL_MAPPING = {
  'users': 'User',
  'customers': 'Customer',
  'projects': 'Project',
  'project_team_members': 'ProjectTeamMember',
  'workflow_steps': 'WorkflowStep',
  'workflow_subtasks': 'WorkflowSubTask',
  'workflow_step_attachments': 'WorkflowStepAttachment',
  'workflow_alerts': 'WorkflowAlert',
  'tasks': 'Task',
  'task_dependencies': 'TaskDependency',
  'documents': 'Document',
  'document_downloads': 'DocumentDownload',
  'project_messages': 'ProjectMessage',
  'conversations': 'Conversation',
  'conversation_participants': 'ConversationParticipant',
  'messages': 'Message',
  'message_reads': 'MessageRead',
  'calendar_events': 'CalendarEvent',
  'calendar_event_attendees': 'CalendarEventAttendee',
  'notifications': 'Notification',
  'role_assignments': 'RoleAssignment',
  'workflow_phases': 'WorkflowPhase',
  'workflow_sections': 'WorkflowSection',
  'workflow_line_items': 'WorkflowLineItem',
  'project_workflow_trackers': 'ProjectWorkflowTracker',
  'completed_workflow_items': 'CompletedWorkflowItem',
  'user_devices': 'UserDevice',
  'user_mfa': 'UserMFA',
  'security_events': 'SecurityEvent',
  'user_behavior_patterns': 'UserBehaviorPattern',
  'webauthn_credentials': 'WebAuthnCredential'
};

const dependencyRank = (tbl) => {
  switch (tbl) {
    case 'users': return 0;
    case 'customers': return 1;
    case 'projects': return 2;
    case 'workflow_phases': return 0;
    case 'workflow_sections': return 4;
    case 'workflow_line_items': return 5;
    case 'project_workflow_trackers': return 6;
    case 'workflow_alerts': return 7;
    case 'project_messages': return 8;
    case 'completed_workflow_items': return 9;
    case 'role_assignments': return 10;
    default: return 20;
  }
};

function parseDataFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let workbook;
  if (ext === '.csv') {
    const csvData = fs.readFileSync(filePath, 'utf8');
    workbook = xlsx.read(csvData, { type: 'string' });
  } else {
    workbook = xlsx.readFile(filePath);
  }
  const result = {};
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    if (data.length > 0) result[sheetName] = data;
  });
  return result;
}

function detectTableFromSheet(sheetName, data) {
  const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, '_');
  if (COMPLETE_FIELD_MAPPING[normalizedSheetName]) return normalizedSheetName;
  const tables = getAllTables();
  for (const table of tables) {
    if (table.includes(normalizedSheetName) || normalizedSheetName.includes(table)) return table;
  }
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    for (const table of tables) {
      const tableInfo = getTableInfo(table);
      const tableFields = Object.keys(tableInfo.fields);
      const matches = headers.filter(h => tableFields.includes(h)).length;
      const matchPct = matches / Math.max(headers.length, tableFields.length);
      if (matchPct > 0.3) return table;
    }
  }
  return null;
}

async function processSheet(targetTable, sheetName, sheetData, idRemap) {
  const modelName = TABLE_TO_MODEL_MAPPING[targetTable];
  if (!modelName || !prisma[modelName]) {
    return { successful: 0, failed: sheetData.length, errors: [{ row: null, error: `No Prisma model for ${targetTable}` }] };
  }

  const transformedData = [];
  const transformErrors = [];
  for (let i = 0; i < sheetData.length; i++) {
    const originalRow = sheetData[i];
    const { transformed, errors } = DataProcessor.transformData(targetTable, originalRow);
    // Apply FK remaps
    if (targetTable === 'workflow_sections') {
      const oldPhaseId = transformed.phaseId || originalRow.phaseId;
      if (oldPhaseId && idRemap.workflow_phases.has(oldPhaseId)) transformed.phaseId = idRemap.workflow_phases.get(oldPhaseId);
    } else if (targetTable === 'workflow_line_items') {
      const oldSectionId = transformed.sectionId || originalRow.sectionId;
      if (oldSectionId && idRemap.workflow_sections.has(oldSectionId)) transformed.sectionId = idRemap.workflow_sections.get(oldSectionId);
    }
    if (errors.length) transformErrors.push(`Row ${i + 1}: ${errors.join(', ')}`);
    transformedData.push(transformed);
  }

  // Insert with our defensive logic
  const perSheetResults = { successful: 0, failed: 0, errors: [] };
  const uploadedSectionKeys = new Set();
  for (let r = 0; r < transformedData.length; r++) {
    const row = transformedData[r];
    const source = sheetData[r] || {};
    try {
      let created;
      // USERS
      if (targetTable === 'users') {
        const providedId = row.id ?? source.id;
        let email = (row.email || '').toLowerCase();
        if (!email) email = `user${Date.now()}${Math.floor(Math.random()*1000)}@example.local`;
        const updateData = { ...row, email };
        delete updateData.id;
        if (!updateData.password) updateData.password = 'Temp#12345';
        if (!updateData.firstName) updateData.firstName = 'Seed';
        if (!updateData.lastName) updateData.lastName = 'User';
        if (!updateData.role) updateData.role = 'WORKER';
        if (!updateData.theme) updateData.theme = 'LIGHT';
        if (!updateData.language) updateData.language = 'en';
        if (!updateData.timezone) updateData.timezone = 'UTC';
        const existingByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingByEmail) created = await prisma.user.update({ where: { email }, data: updateData });
        else {
          const createData = { ...updateData }; delete createData.id;
          if (providedId) createData.id = providedId;
          created = await prisma.user.create({ data: createData });
        }
      }
      // CUSTOMERS
      else if (targetTable === 'customers') {
        const providedId = row.id ?? source.id;
        let email = (row.primaryEmail || '').toLowerCase();
        if (!email) email = `customer${Date.now()}${Math.floor(Math.random()*1000)}@example.local`;
        const updateData = { ...row, primaryEmail: email };
        delete updateData.id;
        if (!updateData.primaryName) updateData.primaryName = 'Seed Customer';
        if (!updateData.primaryPhone) updateData.primaryPhone = '555-0100';
        if (!updateData.address) updateData.address = '123 Seed St, Colorado Springs, CO';
        const existingByEmail = await prisma.customer.findUnique({ where: { primaryEmail: email } });
        if (existingByEmail) created = await prisma.customer.update({ where: { primaryEmail: email }, data: updateData });
        else {
          const createData = { ...updateData }; delete createData.id;
          if (providedId) createData.id = providedId;
          created = await prisma.customer.create({ data: createData });
        }
      }
      // PROJECTS
      else if (targetTable === 'projects') {
        const providedId = row.id ?? source.id;
        const projectNumber = row.projectNumber;
        const updateData = { ...row };
        if (projectNumber === undefined || projectNumber === null) updateData.projectNumber = seqCounter++;
        // Ensure customer exists
        if (!updateData.customerId) updateData.customerId = await ensureCustomer(null, {});
        else {
          const cust = await prisma.customer.findUnique({ where: { id: updateData.customerId } });
          if (!cust) updateData.customerId = await ensureCustomer(updateData.customerId, {});
        }
        if (!updateData.projectName) updateData.projectName = `Seed Project ${updateData.projectNumber}`;
        if (!updateData.projectType) updateData.projectType = 'ROOFING';
        if (!updateData.status) updateData.status = 'PENDING';
        if (updateData.budget === undefined || updateData.budget === null) updateData.budget = 0;
        if (!updateData.startDate) updateData.startDate = new Date();
        if (!updateData.endDate) updateData.endDate = new Date(Date.now()+7*24*60*60*1000);
        delete updateData.id;
        const existingByNumber = await prisma.project.findUnique({ where: { projectNumber } });
        if (existingByNumber) created = await prisma.project.update({ where: { projectNumber: existingByNumber.projectNumber }, data: updateData });
        else {
          const createData = { ...updateData }; if (providedId) createData.id = providedId;
          created = await prisma.project.create({ data: createData });
        }
      }
      // PROJECT TRACKERS
      else if (targetTable === 'project_workflow_trackers') {
        const providedId = row.id ?? source.id;
        const updateData = { ...row };
        delete updateData.id;
        // Ensure project exists
        let projectId = updateData.projectId;
        if (!projectId) projectId = await ensureProject(null, null);
        else {
          const proj = await prisma.project.findUnique({ where: { id: projectId } });
          if (!proj) projectId = await ensureProject(projectId, null);
        }
        updateData.projectId = projectId;
        const createData = { ...updateData };
        if (providedId) {
          const exists = await prisma.projectWorkflowTracker.findUnique({ where: { id: providedId } });
          created = exists
            ? await prisma.projectWorkflowTracker.update({ where: { id: providedId }, data: updateData })
            : await prisma.projectWorkflowTracker.create({ data: { ...createData, id: providedId } });
        } else {
          created = await prisma.projectWorkflowTracker.create({ data: createData });
        }
      }
      if (targetTable === 'workflow_phases') {
        const providedId = row.id ?? source.id;
        if (providedId) {
          const existing = await prisma[modelName].findUnique({ where: { id: providedId } });
          const updateData = { ...row }; delete updateData.id;
          if (existing) created = await prisma[modelName].update({ where: { id: providedId }, data: updateData });
          else created = await prisma[modelName].create({ data: { ...row, id: providedId } });
        } else {
          const updateData = { ...row }; delete updateData.id;
          const existingByType = row.phaseType ? await prisma[modelName].findUnique({ where: { phaseType: row.phaseType } }) : null;
          if (existingByType) created = await prisma[modelName].update({ where: { id: existingByType.id }, data: updateData });
          else { const createData = { ...row }; delete createData.id; created = await prisma[modelName].create({ data: createData }); }
        }
        const oldId = source.id || row.id; if (oldId && created.id && oldId !== created.id) idRemap.workflow_phases.set(oldId, created.id);
      } else if (targetTable === 'workflow_sections') {
        const providedId = row.id ?? source.id;
        const updateData = { ...row }; delete updateData.id;
        const hasComposite = row.phaseId !== undefined && row.sectionNumber !== undefined;
        const existingByComposite = hasComposite ? await prisma[modelName].findFirst({ where: { phaseId: row.phaseId, sectionNumber: row.sectionNumber } }) : null;
        if (existingByComposite) {
          created = await prisma[modelName].update({ where: { id: existingByComposite.id }, data: updateData });
        } else {
          const existingById = providedId ? await prisma[modelName].findUnique({ where: { id: providedId } }) : null;
          if (existingById) created = await prisma[modelName].update({ where: { id: existingById.id }, data: updateData });
          else { const createData = { ...row }; delete createData.id; created = await prisma[modelName].create({ data: providedId ? { ...createData, id: providedId } : createData }); }
        }
        if (row.phaseId !== undefined && row.sectionNumber !== undefined) uploadedSectionKeys.add(`${row.phaseId}::${row.sectionNumber}`);
        const oldId = source.id || row.id; if (oldId && created.id && oldId !== created.id) idRemap.workflow_sections.set(oldId, created.id);
      } else if (targetTable === 'workflow_line_items') {
        const providedId = row.id ?? source.id;
        const updateData = { ...row }; delete updateData.id;
        const existingByComposite = (row.sectionId && row.itemLetter) ? await prisma[modelName].findFirst({ where: { sectionId: row.sectionId, itemLetter: row.itemLetter } }) : null;
        if (existingByComposite) {
          created = await prisma[modelName].update({ where: { id: existingByComposite.id }, data: updateData });
        } else {
          const existingById = providedId ? await prisma[modelName].findUnique({ where: { id: providedId } }) : null;
          if (existingById) created = await prisma[modelName].update({ where: { id: existingById.id }, data: updateData });
          else { const createData = { ...row }; delete createData.id; created = await prisma[modelName].create({ data: providedId ? { ...createData, id: providedId } : createData }); }
        }
        const oldId = source.id || row.id; if (oldId && created.id && oldId !== created.id) idRemap.workflow_line_items.set(oldId, created.id);
      }
      // WORKFLOW ALERTS (sanitize fields)
      else if (targetTable === 'workflow_alerts') {
        const providedId = row.id ?? source.id;
        const updateData = { ...row }; delete updateData.id; delete updateData.workflowId;
        let projectId = updateData.projectId;
        if (!projectId) projectId = await ensureProject(null, null);
        else {
          const existingProj = await prisma.project.findUnique({ where: { id: projectId } });
          if (!existingProj) projectId = await ensureProject(projectId, null);
        }
        updateData.projectId = projectId;
        const createData = { ...updateData };
        created = await prisma.workflowAlert.create({ data: providedId ? { ...createData, id: providedId } : createData });
      }
      // PROJECT MESSAGES (require projectId)
      else if (targetTable === 'project_messages') {
        const providedId = row.id ?? source.id;
        const updateData = { ...row }; delete updateData.id;
        let projectId = updateData.projectId;
        if (!projectId) projectId = await ensureProject(null, updateData.projectNumber);
        else {
          const existingProj = await prisma.project.findUnique({ where: { id: projectId } });
          if (!existingProj) projectId = await ensureProject(projectId, updateData.projectNumber);
        }
        updateData.projectId = projectId;
        const createData = { ...updateData };
        created = await prisma.projectMessage.create({ data: providedId ? { ...createData, id: providedId } : createData });
      }
      // ROLE ASSIGNMENTS (nullify invalid assignedById)
      else if (targetTable === 'role_assignments') {
        const providedId = row.id ?? source.id;
        const updateData = { ...row }; delete updateData.id;
        if (updateData.assignedById) {
          const exists = await prisma.user.findUnique({ where: { id: updateData.assignedById } });
          if (!exists) updateData.assignedById = await ensureUser(updateData.assignedById, {});
        }
        if (!updateData.userId) updateData.userId = await ensureUser(null, {});
        else {
          const userExists = await prisma.user.findUnique({ where: { id: updateData.userId } });
          if (!userExists) updateData.userId = await ensureUser(updateData.userId, {});
        }
        const createData = { ...updateData };
        if (providedId) {
          const exists = await prisma.roleAssignment.findUnique({ where: { id: providedId } });
          created = exists
            ? await prisma.roleAssignment.update({ where: { id: providedId }, data: updateData })
            : await prisma.roleAssignment.create({ data: { ...createData, id: providedId } });
        } else {
          created = await prisma.roleAssignment.create({ data: createData });
        }
      }
      // COMPLETED WORKFLOW ITEMS
      else if (targetTable === 'completed_workflow_items') {
        const providedId = row.id ?? source.id;
        const updateData = { ...row }; delete updateData.id;
        // Ensure tracker exists
        let trackerId = updateData.trackerId;
        if (!trackerId) trackerId = await ensureTracker(null, null);
        else trackerId = await ensureTracker(trackerId, null);
        updateData.trackerId = trackerId;
        // phase/section/lineItem should already exist; insert as-is
        const createData = { ...updateData };
        if (providedId) {
          const exists = await prisma.completedWorkflowItem.findUnique({ where: { id: providedId } });
          created = exists
            ? await prisma.completedWorkflowItem.update({ where: { id: providedId }, data: updateData })
            : await prisma.completedWorkflowItem.create({ data: { ...createData, id: providedId } });
        } else {
          created = await prisma.completedWorkflowItem.create({ data: createData });
        }
      }
      else {
        // Fallback simple create/update by simple unique if present; else create
        await prisma[modelName].create({ data: row });
      }
      perSheetResults.successful++;
    } catch (e) {
      perSheetResults.failed++;
      perSheetResults.errors.push({ row: r + 1, error: e.message });
    }
  }

  // Optional cleanup for sections extras
  if (targetTable === 'workflow_sections' && uploadedSectionKeys.size > 0) {
    try {
      const existingSections = await prisma.workflowSection.findMany({ select: { id: true, phaseId: true, sectionNumber: true } });
      const extras = existingSections.filter(s => !uploadedSectionKeys.has(`${s.phaseId}::${s.sectionNumber}`));
      let deleted = 0;
      for (const s of extras) {
        const refs = await prisma.$transaction([
          prisma.workflowLineItem.count({ where: { sectionId: s.id } }),
          prisma.projectWorkflowTracker.count({ where: { currentSectionId: s.id } }),
          prisma.workflowAlert.count({ where: { sectionId: s.id } }),
          prisma.completedWorkflowItem.count({ where: { sectionId: s.id } })
        ]);
        const totalRefs = refs.reduce((a, b) => a + b, 0);
        if (totalRefs === 0) { await prisma.workflowSection.delete({ where: { id: s.id } }); deleted++; }
      }
      if (deleted > 0) perSheetResults.info = `Cleanup removed ${deleted} extra sections`;
    } catch (_) {}
  }

  return perSheetResults;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node server/scripts/upload-workbook.js "C:\\path\\file.xlsx"');
    process.exit(1);
  }
  console.log('Reading workbook:', filePath);
  const sheetsData = parseDataFile(filePath);
  const sheetsToProcess = [];
  for (const [sheetName, sheetData] of Object.entries(sheetsData)) {
    if (sheetData.length === 0) continue;
    let targetTableDetected = detectTableFromSheet(sheetName, sheetData);
    if (!targetTableDetected || !COMPLETE_FIELD_MAPPING[targetTableDetected]) {
      console.log(`Skipping sheet '${sheetName}': cannot determine table`);
      continue;
    }
    sheetsToProcess.push({ sheetName, sheetData, targetTable: targetTableDetected });
  }
  sheetsToProcess.sort((a, b) => dependencyRank(a.targetTable) - dependencyRank(b.targetTable));

  const idRemap = { workflow_phases: new Map(), workflow_sections: new Map(), workflow_line_items: new Map() };
  const results = [];
  for (const entry of sheetsToProcess) {
    console.log(`\nProcessing sheet: ${entry.sheetName} -> ${entry.targetTable} (${entry.sheetData.length} rows)`);
    const r = await processSheet(entry.targetTable, entry.sheetName, entry.sheetData, idRemap);
    console.log(`Result: ${r.successful} ok, ${r.failed} failed`);
    results.push({ sheet: entry.sheetName, table: entry.targetTable, ...r });
  }
  console.log('\nUpload summary:', results);
}

main()
  .catch(err => { console.error('Upload failed:', err); process.exit(1); })
  .finally(async () => { try { await prisma.$disconnect(); } catch (_) {} });


