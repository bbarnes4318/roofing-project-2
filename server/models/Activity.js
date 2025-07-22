const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  author: { type: String, required: true },
  avatar: { type: String, default: '' },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  projectId: { type: Number },
  project: { type: String }
});

module.exports = mongoose.model('Activity', activitySchema); 