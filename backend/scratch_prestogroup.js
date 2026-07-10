require('dotenv').config();
const { analyzeWebsite } = require('./src/services/aiReadiness.service');

(async () => {
    try {
        console.log("Analyzing prestogroup.com...");
        const result = await analyzeWebsite('https://www.prestogroup.com');
        console.log(JSON.stringify(result.technicalSignals, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
})();
