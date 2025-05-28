const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, phone, language } = req.body;
        let user = await User.findOne({ phone });
        if (user) return res.status(400).json({ error: 'User already exists' });

        user = new User({ name, phone, language });
        await user.save();

        // JWT
        const payload = { user: { id: user.id, phone: user.phone } };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecret', { expiresIn: '7d' });

        res.json({ user, token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await User.findOne({ phone });
        if (!user) return res.status(400).json({ error: 'No such user, please sign up first' });

        // JWT
        const payload = { user: { id: user.id, phone: user.phone } };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecret', { expiresIn: '7d' });

        res.json({ user, token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;