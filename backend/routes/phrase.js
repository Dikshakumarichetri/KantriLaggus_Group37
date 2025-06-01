const express = require('express');
const router = express.Router();
const Phrase = require('../models/Phrase');
const auth = require('../middleware/auth');

const fs = require('fs');
const path = require('path');

// --- GOOGLE CLOUD SETUP ---
const speech = require('@google-cloud/speech').v1p1beta1;
const { Translate } = require('@google-cloud/translate').v2;
const speechClient = new speech.SpeechClient();
const translate = new Translate();

// POST /api/phrases/transcribe
router.post('/transcribe', auth, async (req, res) => {
    try {
        const { filename, sourceLanguage, targetLanguage } = req.body;
        if (!filename || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // 1. Locate uploaded audio file (should be in recordings/)
        const audioFilePath = path.join(__dirname, '..', 'recordings', filename);
        if (!fs.existsSync(audioFilePath)) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        // 2. Read audio and prepare config for Google Speech-to-Text
        const audioBytes = fs.readFileSync(audioFilePath).toString('base64');

        // Map language codes to Google BCP-47
        const speechLangMap = {
            en: 'en-US',
            hi: 'hi-IN',
            ne: 'ne-NP'
        };
        const speechLang = speechLangMap[sourceLanguage] || 'en-US';
        const translateFrom = sourceLanguage || 'en';
        const translateTo = targetLanguage || 'en';

        const request = {
            audio: { content: audioBytes },
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: speechLang,
                enableAutomaticPunctuation: true
            },
        };

        // 3. Transcribe speech to text
        const [response] = await speechClient.recognize(request);
        const transcript = (response.results?.map(r => r.alternatives[0].transcript).join(' ').trim()) || '';

        if (!transcript) {
            return res.json({ transcript: '' });
        }

        // 4. Translate if needed
        let finalTranscript = transcript;
        if (translateFrom !== translateTo) {
            try {
                const [translation] = await translate.translate(transcript, { from: translateFrom, to: translateTo });
                finalTranscript = translation;
            } catch (err) {
                console.error('Translation failed:', err);
            }
        }

        // 5. Return the translated transcript
        res.json({ transcript: finalTranscript });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;