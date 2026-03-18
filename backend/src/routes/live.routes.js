const express = require("express");
const { liveAuditController } = require("../controllers/live.controller");

const router = express.Router();

router.post("/live-audit", liveAuditController);

module.exports = router;
