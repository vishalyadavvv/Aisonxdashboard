require('dotenv').config();
const { analyzeWebsite } = require('./src/services/aiReadiness.service');

(async () => {
    try {
        console.log("Analyzing treecampus.ngo...");
        const result = await analyzeWebsite('https://treecampus.ngo');
        console.log(JSON.stringify(result.technicalSignals, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
})();
