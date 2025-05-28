const express = require('express');
const router = express.Router();
const Phrase = require('../models/Phrase');
const auth = require('../middleware/auth');

// Get all phrases for current user
router.get('/', auth, async (req, res) => {
    try {
        const phrases = await Phrase.find({ user: req.user.id }).sort({ date: -1 });
        res.json(phrases);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new phrase (translation)
router.post('/', auth, async (req, res) => {
    try {
        const { filename, translation, language } = req.body;
        if (!filename || !translation) return res.status(400).json({ error: 'Missing fields' });
        const phrase = new Phrase({ user: req.user.id, filename, translation, language });
        await phrase.save();
        res.json(phrase);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a phrase
router.delete('/:id', auth, async (req, res) => {
    try {
        const phrase = await Phrase.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!phrase) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
const { execFile } = require('child_process');
const translate = require('@vitalets/google-translate-api');

// POST /api/phrases/transcribe
router.post('/transcribe', auth, async (req, res) => {
    try {
        const { filename, sourceLanguage, targetLanguage } = req.body;
        if (!filename || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // Step 1: Transcribe using Whisper (via your Python script)
        execFile(
            'python3',
            ['./transcribe_whisper.py', filename, sourceLanguage],
            async (error, stdout, stderr) => {
                if (error) {
                    console.error('Whisper error:', stderr);
                    return res.status(500).json({ error: 'Whisper failed' });
                }
                const transcript = stdout.trim();

                // Step 2: Translate using google-translate-api if needed
                let finalTranscript = transcript;
                // Map language names to ISO codes
                const langCodeMap = {
                    English: 'en',
                    Nepali: 'ne',
                    Hindi: 'hi',
                    // Add more as needed
                };
                const from = langCodeMap[sourceLanguage] || sourceLanguage.slice(0, 2).toLowerCase();
                const to = langCodeMap[targetLanguage] || targetLanguage.slice(0, 2).toLowerCase();

                if (from !== to && transcript.length > 0) {
                    try {
                        const result = await translate(transcript, { from, to });
                        finalTranscript = result.text;
                    } catch (e) {
                        console.error('Translation error:', e);
                        finalTranscript = transcript; // fallback to original
                    }
                }

                // Step 3: Return transcript (translated or original)
                res.json({ transcript: finalTranscript });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
module.exports = router;