const mongoose = require('mongoose');

const crewScheduleSchema = new mongoose.Schema({
  crewId: { type: Number, required: true },
  days: [{
    date: { type: String, required: true },
    project: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true },
      client: {
        name: { type: String, required: true }
      },
      estimateValue: { type: Number, required: true }
    },
    type: { type: String, required: true }
  }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CrewSchedule', crewScheduleSchema); 