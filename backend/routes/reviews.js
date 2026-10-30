const express = require('express');
const { getPublicReviews } = require('../controllers/reviewController');

const router = express.Router();

// Public customer reviews for homepage
router.get('/', getPublicReviews);
router.get('/public', getPublicReviews);

module.exports = router;
