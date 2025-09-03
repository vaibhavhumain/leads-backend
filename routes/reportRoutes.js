// routes/reportRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware"); // adjust file name if needed
const { getUserReport } = require("../controllers/reportController");

const router = express.Router();

router.get("/user/:id", protect, getUserReport);

module.exports = router;
