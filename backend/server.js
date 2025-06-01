// backend/server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// ========== FILE UPLOADS (Recording Storage) ==========
const recordingsDir = path.join(__dirname, '../recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, recordingsDir),
    filename: (req, file, cb) => cb(null, file.originalname || Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Upload new recording
app.post('/upload', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.status(200).json({ message: 'File uploaded successfully!', filename: req.file.filename });
});

// Edit/overwrite existing recording (requires auth)
app.put('/recordings/:filename', require('./middleware/auth'), upload.single('audio'), (req, res) => {
    const targetFilename = req.params.filename;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const targetPath = path.join(recordingsDir, targetFilename);

    fs.rename(req.file.path, targetPath, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to overwrite file' });
        res.json({ message: 'Recording updated!', filename: targetFilename });
    });
});

// Serve recordings statically
app.use('/recordings', express.static(recordingsDir));

// ========== MODULAR API ROUTES ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/phrases', require('./routes/phrase'));
app.use('/api/recordings', require('./routes/recording'));

// ========== GOOGLE CLOUD SPEECH & TRANSLATE ==========
const speech = require('@google-cloud/speech').v1p1beta1;
const { Translate } = require('@google-cloud/translate').v2;

// GOOGLE_APPLICATION_CREDENTIALS is set in .env
const speechClient = new speech.SpeechClient();
const translate = new Translate();

// POST /transcribe: Speech-to-text + (optional) translation
app.post('/transcribe', async (req, res) => {
    try {
        const { filename, sourceLanguage, targetLanguage } = req.body;
        if (!filename || !sourceLanguage || !targetLanguage)
            return res.status(400).json({ error: 'Missing fields' });

        const filePath = path.join(recordingsDir, filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

        // Read and encode audio file as base64
        const file = fs.readFileSync(filePath);
        const audioBytes = file.toString('base64');

        // Map your language code to Google's codes
        const languageCodeMap = {
            en: "en-US",
            ne: "ne-NP",
            hi: "hi-IN"
        };
        const speechLang = languageCodeMap[sourceLanguage] || "en-US";

        // Detect encoding based on extension (improve as needed)
        let encoding = 'WEBM_OPUS';
        if (filename.endsWith('.wav')) encoding = 'LINEAR16';
        if (filename.endsWith('.mp3')) encoding = 'MP3';

        const audio = { content: audioBytes };
        const config = {
            encoding,
            sampleRateHertz: 48000, // Match your recording sample rate
            languageCode: speechLang,
            enableAutomaticPunctuation: true
        };

        // Speech-to-text
        const [response] = await speechClient.recognize({ audio, config });

        const transcript = response.results
            .map(result => result.alternatives[0]?.transcript)
            .join(' ')
            .trim();

        if (!transcript) return res.status(200).json({ transcript: "" });

        // Translate if needed
        let finalTranscript = transcript;
        if (sourceLanguage !== targetLanguage && transcript.length > 0) {
            const [translated] = await translate.translate(transcript, targetLanguage);
            finalTranscript = translated;
        }

        return res.json({ transcript: finalTranscript });
    } catch (err) {
        console.error('Transcribe error:', err);
        res.status(500).json({ error: 'Transcription/Translation failed' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});