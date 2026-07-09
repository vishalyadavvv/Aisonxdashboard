const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/reports');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace very dark colors with gray-800 (#1F2937)
  content = content.replace(/#222222/g, '#1F2937');
  content = content.replace(/#1E293B/g, '#1F2937');
  
  // Replace very heavy font weights with lighter ones
  content = content.replace(/fontWeight: '900'/g, "fontWeight: '700'");
  content = content.replace(/fontWeight: '800'/g, "fontWeight: '600'");
  content = content.replace(/fontWeight: "800"/g, "fontWeight: '600'");
  content = content.replace(/fontWeight: "900"/g, "fontWeight: '700'");

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
