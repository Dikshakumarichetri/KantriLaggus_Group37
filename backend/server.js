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

    // Overwrite (or create new) file
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

// ========== TRANSCRIPTION/TRANSLATION ENDPOINT (can be updated for translation later) ==========
const { exec } = require('child_process');
app.post('/transcribe', express.json(), (req, res) => {
    const { filename, language } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename required' });

    const filePath = path.join(recordingsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const langArg = language ? ` "${language}"` : '';
    exec(`python3 transcribe_whisper.py "${filePath}"${langArg}`, { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) {
            console.error('Transcription error:', stderr);
            return res.status(500).json({ error: 'Transcription failed' });
        }
        res.json({ transcript: stdout.trim() });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});