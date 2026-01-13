const express = require('express');
const router = express.Router();
const config = require('../config/environment');

router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', env: config.server.env, timestamp: new Date() });
});

module.exports = router;
