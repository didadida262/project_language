#!/usr/bin/env node
/**
 * 在 src/content/articles/ 下生成一篇 JSON 文章文件。
 * 用法:
 *   npm run new -- "文章标题" "类别名或 categoryId"
 * 类别可为 article-categories.json 中的 id（如 grammar）或 label（如 语法）。
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const categoriesPath = join(root, 'src/content/article-categories.json');
const articlesDir = join(root, 'src/content/articles');

function loadCategories() {
  const raw = readFileSync(categoriesPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * @param {string} raw
 * @param {{ id: string, label: string }[]} categories
 * @returns {{ categoryId: string, matchedBy: 'id' | 'label' } | null}
 */
function resolveCategory(raw, categories) {
  const input = raw.trim();
  if (!input) return null;

  const byId = categories.find((c) => c.id === input);
  if (byId) return { categoryId: byId.id, matchedBy: 'id' };

  const byLabel = categories.find((c) => c.label === input);
  if (byLabel) return { categoryId: byLabel.id, matchedBy: 'label' };

  const lower = input.toLowerCase();
  const byIdLoose = categories.find((c) => c.id.toLowerCase() === lower);
  if (byIdLoose) return { categoryId: byIdLoose.id, matchedBy: 'id' };

  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let title = '新文章标题';
  let categoryInput = 'notes';
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') {
      return { help: true };
    }
    if (a.startsWith('--title=')) {
      title = a.slice('--title='.length);
      continue;
    }
    if (a === '--title' && args[i + 1]) {
      title = args[++i];
      continue;
    }
    if (a.startsWith('--category=')) {
      categoryInput = a.slice('--category='.length);
      continue;
    }
    if (a === '--category' && args[i + 1]) {
      categoryInput = args[++i];
      continue;
    }
    if (!a.startsWith('-')) {
      positional.push(a);
    }
  }

  if (positional[0] !== undefined) title = positional[0];
  if (positional[1] !== undefined) categoryInput = positional[1];

  return { title, categoryInput, help: false };
}

function slugify(title) {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff-]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return s || 'draft';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const parsed = parseArgs();
const categories = loadCategories();

if (parsed.help) {
  console.log(`用法:
  npm run new -- "文章标题" "类别"
  npm run article:new -- "文章标题" "语法"

说明: npm 自定义命令需加 run，中间用 -- 把参数交给脚本。
  第二个参数可以是类别的中文名称（如 语法、方法与实践）或 id（如 grammar）。

仍支持:
  npm run new -- --title "标题" --category grammar

可用类别:`);
  for (const c of categories) {
    console.log(`  ${c.label}\t(${c.id})`);
  }
  process.exit(0);
}

const { title, categoryInput } = parsed;
const resolved = resolveCategory(categoryInput, categories);

if (!resolved) {
  console.error(`无法识别类别: "${categoryInput}"`);
  console.error('请使用下列名称或 id 之一:');
  for (const c of categories) {
    console.error(`  · ${c.label}  /  ${c.id}`);
  }
  process.exit(1);
}

const { categoryId } = resolved;

mkdirSync(articlesDir, { recursive: true });
const id = randomUUID();
const fileBase = `${todayISO()}-${slugify(title)}`;
let finalPath = join(articlesDir, `${fileBase}.json`);
let n = 0;
while (existsSync(finalPath)) {
  n += 1;
  finalPath = join(articlesDir, `${fileBase}-${n}.json`);
}

const article = {
  id,
  categoryId,
  title,
  excerpt: '在此填写摘要……',
  publishedAt: todayISO(),
  body: '正文可以使用 **粗体**，段落之间空一行。\n\n第二段。',
};

writeFileSync(finalPath, `${JSON.stringify(article, null, 2)}\n`, 'utf8');
console.log('已生成:', finalPath);
console.log(`类别: ${categoryId}（${categories.find((c) => c.id === categoryId)?.label ?? ''}）`);
console.log(
  '提示: Vite 会缓存 glob，新增文件后若列表未更新，请重启 dev 服务器。',
);
