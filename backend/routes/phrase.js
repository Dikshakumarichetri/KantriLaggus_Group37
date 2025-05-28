const express = require('express');
const router = express.Router();
const Phrase = require('../models/Phrase');
const auth = require('../middleware/auth');

// List phrases for current user
router.get('/', auth, async (req, res) => {
    try {
        const phrases = await Phrase.find({ user: req.user.id }).sort({ date: -1 });
        res.json(phrases);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new phrase
router.post('/', auth, async (req, res) => {
    try {
        const { filename, transcription, translation } = req.body;
        const phrase = new Phrase({ user: req.user.id, filename, transcription, translation });
        await phrase.save();
        res.json(phrase);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update transcription/translation
router.put('/:id', auth, async (req, res) => {
    try {
        const { transcription, translation } = req.body;
        const phrase = await Phrase.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: { transcription, translation } },
            { new: true }
        );
        res.json(phrase);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;