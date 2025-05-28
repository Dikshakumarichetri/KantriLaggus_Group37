const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
    try {
        const { name, language } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { name, language } },
            { new: true }
        );
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;