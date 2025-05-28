const mongoose = require('mongoose');

const RecordingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    date: { type: Date, default: Date.now },

});

module.exports = mongoose.model('Recording', RecordingSchema);