const { runLiveAudit } = require("../services/ai_live/live.orchestrator");
const logger = require("../utils/logger");

const liveAuditController = async (req, res) => {

  try {
    const { brand } = req.body;

    if (!brand) {
      return res.status(400).json({ error: "Brand is required" });
    }

    const result = await runLiveAudit(brand);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    logger.error("LIVE AUDIT ERROR:", err);
    res.status(500).json({ error: "Live audit failed" });
  }
};

module.exports = { liveAuditController };

