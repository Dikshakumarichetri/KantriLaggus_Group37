const mongoose = require('mongoose');

const PhraseSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    date: { type: Date, default: Date.now },
    transcription: { type: String },
    translation: { type: String } // If you add translation later
});

module.exports = mongoose.model('Phrase', PhraseSchema);