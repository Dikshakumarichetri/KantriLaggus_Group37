const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    language: { type: String, default: 'English' },
    password: { type: String }, // Optional, for now
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);