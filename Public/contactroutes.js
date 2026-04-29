const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { name, email, subject, message } = req.body;

  console.log('Contact Form:', name, email, subject, message);

  res.json({ success: true });
});

module.exports = router;
