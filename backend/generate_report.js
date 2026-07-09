const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const fs = require("fs");
dotenv.config({ path: path.join(__dirname, ".env") });

const Snapshot = require("./src/models/Snapshot");

async function generateReport() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const snapshot = await Snapshot.findOne().sort({ date: -1 }).lean();
    
    if (!snapshot) {
      console.log("No snapshot found.");
      return;
    }

    const {
      overallScore,
      engineScores,
      promptRankings,
      competitorRankings,
      visibilityAudit
    } = snapshot;

    let md = `# CreatorsXchange - Comprehensive AI Scan Results\n\n`;

    md += `## 🏆 Overall GEO Health Score\n`;
    md += `**Score:** ${overallScore || 0}/100\n\n`;
    md += `### 🤖 Engine-Specific Scores\n`;
    md += `- **OpenAI (ChatGPT):** ${engineScores?.openai || 0}/100\n`;
    md += `- **Google Gemini:** ${engineScores?.gemini || 0}/100\n\n`;

    md += `## 📊 AI Prompt Visibility Rankings\n\n`;
    md += `| Prompt | Engine | Visibility | Found? | Rank | Score |\n`;
    md += `|---|---|---|---|---|---|\n`;
    
    (promptRankings || []).forEach(r => {
      md += `| ${r.prompt} | ${r.engine} | ${r.visibility} | ${r.found ? "✅" : "❌"} | #${r.rank || 'N/A'} | ${r.score}/100 |\n`;
    });
    md += `\n`;

    md += `### 💡 Snippet Highlights\n`;
    (promptRankings || []).forEach(r => {
      md += `> **[${r.engine.toUpperCase()}] ${r.prompt}:** ${r.snippet}\n`;
      if (r.authoritySignals?.isSurrogate) {
        md += `> *Note: This result was dynamically recovered using the Cross-Engine Surrogate Fallback.*\n`;
      }
      md += `\n`;
    });

    md += `## ⚔️ Competitor Analysis (Battle View)\n\n`;
    md += `| Competitor | Engine | Prompt | Visibility | Found? | Rank | Score |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    
    (competitorRankings || []).forEach(cr => {
      md += `| ${cr.competitorName} | ${cr.engine} | ${cr.prompt} | ${cr.visibility} | ${cr.found ? "✅" : "❌"} | #${cr.rank || 'N/A'} | ${cr.score}/100 |\n`;
    });
    md += `\n`;

    md += `## 🧠 Master Profile Synthesis\n\n`;
    md += `**Summary:**\n${visibilityAudit?.summary || "N/A"}\n\n`;
    
    md += `**Optimization Checklist:**\n`;
    (visibilityAudit?.profile?.checklist || visibilityAudit?.profile?.optimizationChecklist || []).forEach(c => {
        if(typeof c === 'string') md += `- ${c}\n`;
        else md += `- **${c.priority} Priority:** ${c.task} (Impact: ${c.impact})\n`;
    });

    fs.writeFileSync("d:/DgtLmart/GEO/backend/scan_report.md", md);
    console.log("Report generated at scan_report.md");
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

generateReport();
