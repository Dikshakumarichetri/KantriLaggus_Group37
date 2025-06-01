const express = require('express');
const router = express.Router();
const Recording = require('../models/Recording');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// List recordings for current user
router.get('/', auth, async (req, res) => {
    try {
        const recordings = await Recording.find({ user: req.user.id }).sort({ date: -1 });
        res.json(recordings);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get a single recording (by MongoDB _id)
router.get('/:id', auth, async (req, res) => {
    try {
        const recording = await Recording.findOne({ _id: req.params.id, user: req.user.id });
        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }
        res.json(recording);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new recording metadata (call after upload)
router.post('/', auth, async (req, res) => {
    try {
        const { filename } = req.body;
        const recording = new Recording({ user: req.user.id, filename });
        await recording.save();
        res.json(recording);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a recording
router.delete('/:id', auth, async (req, res) => {
    try {
        const recording = await Recording.findOne({ _id: req.params.id, user: req.user.id });
        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }
        // Delete file from /recordings folder
        const filePath = path.join(__dirname, '..', 'recordings', recording.filename);
        fs.unlink(filePath, err => {
            if (err && err.code !== 'ENOENT') {
                return res.status(500).json({ error: 'Failed to delete file' });
            }
            recording.deleteOne().then(() => {
                res.json({ success: true });
            }).catch(() => {
                res.status(500).json({ error: 'Failed to delete recording' });
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/:id', auth, async (req, res) => {
    try {
        const { filename } = req.body;
        const recording = await Recording.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: { filename } },
            { new: true }
        );
        if (!recording) return res.status(404).json({ error: 'Recording not found' });
        res.json(recording);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;