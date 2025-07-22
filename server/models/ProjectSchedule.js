const mongoose = require('mongoose');

const projectScheduleSchema = new mongoose.Schema({
  projectId: { type: Number, required: true, unique: true },
  laborStart: { type: String },
  laborEnd: { type: String },
  materialsDeliveryStart: { type: String },
  materialsDeliveryEnd: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectSchedule', projectScheduleSchema); 