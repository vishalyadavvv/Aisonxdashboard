const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('./openai_debug_results.json', 'utf8'));
    console.log('Returned prompts from OpenAI:');
    data.forEach(d => console.log(`"${d.prompt}"`));
} catch (err) {
    console.log('Error reading file');
}
