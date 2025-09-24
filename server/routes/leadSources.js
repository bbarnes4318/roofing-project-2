const express = require('express');
const { prisma } = require('../config/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/lead-sources - list lead sources
router.get('/', authenticateToken, async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || 'false').toLowerCase() === 'true';
    const leadSources = await prisma.leadSource.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: leadSources, message: 'Lead sources retrieved successfully' });
  } catch (error) {
    console.error('Error fetching lead sources:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch lead sources', error: error.message });
  }
});

// POST /api/lead-sources - create a new lead source
router.post('/', authenticateToken, async (req, res) => {
  try {
    const nameRaw = (req.body.name || '').trim();
    if (!nameRaw) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    // Normalize spacing/case for uniqueness
    const name = nameRaw.replace(/\s+/g, ' ');

    // Upsert-like behavior: if an inactive with same name exists, reactivate it
    const existing = await prisma.leadSource.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (existing) {
      const updated = await prisma.leadSource.update({ where: { id: existing.id }, data: { name, isActive: true } });
      return res.status(200).json({ success: true, data: updated, message: 'Lead source reactivated' });
    }

    const created = await prisma.leadSource.create({ data: { name } });
    res.status(201).json({ success: true, data: created, message: 'Lead source created' });
  } catch (error) {
    console.error('Error creating lead source:', error);
    res.status(500).json({ success: false, message: 'Failed to create lead source', error: error.message });
  }
});

// DELETE /api/lead-sources/:id - soft-delete a lead source (set isActive=false)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    // If any projects reference it, we still soft-deactivate, leaving projects intact
    const updated = await prisma.leadSource.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true, data: updated, message: 'Lead source deactivated' });
  } catch (error) {
    console.error('Error deleting lead source:', error);
    // If not found
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Lead source not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to delete lead source', error: error.message });
  }
});

module.exports = router;
