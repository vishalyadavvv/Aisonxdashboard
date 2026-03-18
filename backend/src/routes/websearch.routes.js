const express = require("express");
const { 
  websearchScanController, 
  getWebsearchReports, 
  getWebsearchReportById 
} = require("../controllers/websearch.controller");
const { protect, checkSubscription } = require("../utils/auth.middleware");

const router = express.Router();

router.post("/scan", protect, checkSubscription('starter'), websearchScanController);
router.get("/reports", protect, getWebsearchReports);
router.get("/reports/:id", protect, getWebsearchReportById);

module.exports = router;
