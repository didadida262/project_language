import fs from 'fs';
import path from 'path';

const inputPath = path.join(process.cwd(), 'docs/Unite1.txt');
const outputPath = path.join(process.cwd(), 'src/data/unite1.json');

function parseTxtToJson() {
  try {
    const content = fs.readFileSync(inputPath, 'utf-8');
    const lines = content.split('\n');
    const words = [];
    let currentRoot = '';

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('Unite')) continue;

      // 匹配词根行，例如 BENE：meaning “well” 或 AM: meaning "to love"
      if (line.match(/^[A-Z]+\s*[:：]/)) {
        currentRoot = line;
        continue;
      }

      // 匹配单词行，例如 - benediction：well + speaking
      if (line.startsWith('-')) {
        const parts = line.substring(1).split(/[:：]/);
        if (parts.length >= 2) {
          const word = parts[0].trim();
          const definition = parts.slice(1).join(':').trim();
          words.push({
            word,
            definition,
            root: currentRoot
          });
        }
      } else if (line.includes(':')) {
        // 处理没有 '-' 但包含 ':' 的单词行，如 recrimination：There was no anger
        const parts = line.split(/[:：]/);
        if (parts.length >= 2 && !line.includes('meaning')) {
           const word = parts[0].trim();
           const definition = parts.slice(1).join(':').trim();
           words.push({
             word,
             definition,
             root: currentRoot
           });
        }
      }
    }

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(words, null, 2), 'utf-8');
    console.log(`成功解析 ${words.length} 个单词到 ${outputPath}`);
  } catch (error) {
    console.error('解析失败:', error);
  }
}

parseTxtToJson();
