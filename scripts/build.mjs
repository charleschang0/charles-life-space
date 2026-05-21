import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content", "posts");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(rootDir, "src");
const adminDir = path.join(rootDir, "admin");
const publicDir = path.join(rootDir, "public");

const site = {
  title: "查爾斯的生活空間",
  description: "關於生活、學習與旅遊的閱讀型個人網站，寫給也喜歡觀察日常的人。",
  eyebrow: "Charles' Living Space",
  heroTitle: "查爾斯的生活空間",
  intro:
    "你好，我是張朝宣 Charles。現在就讀政治大學企管系，關注商業分析、日本市場、AI 應用與跨文化溝通。這裡除了收錄我的文章，也想讓第一次來的人，能很快理解我是誰、正在做什麼，以及我在意哪些事情。",
  profile: {
    title: "快速認識 Charles",
    summary:
      "我喜歡把商業、內容、資料與國際視野放在一起思考。過去幾年，我一邊累積日本相關經驗，一邊做資料分析、專案合作與市場研究，也持續把這些養分整理成自己的觀察與文章。",
    education: [
      "國立政治大學 企業管理學系，2021–2026",
      "GPA 3.69",
      "TOEIC 945 / JLPT N1"
    ],
    highlights: [
      "現任 Gao He Yi Sheng Co., Ltd. 的 BD & Japan AI PM，負責日本供應商合作、市場研究與 AI 專案支援",
      "曾於上海振華重工擔任 HR Intern，參與組織轉型與薪酬規劃研究",
      "曾與 Meta 相關產業合作做廣告發票資料分析，建立商業洞察與 Tableau 視覺化",
      "帶隊參與 ATCC 商業競賽，完成面向年輕族群的商業互動平台規劃"
    ],
    skills: [
      "語言：中文 / 英文 / 日文",
      "分析工具：Python、SQL、Tableau、Google Analytics",
      "產品與開發：Cursor、Supabase、Vibe Coding",
      "關注主題：日本市場、AI 產品、商業策略、內容整理"
    ]
  },
  categories: {
    life: "生活",
    study: "學習",
    travel: "旅遊"
  }
};

const categoryAliases = {
  life: "life",
  "生活": "life",
  study: "study",
  "學習": "study",
  travel: "travel",
  "旅遊": "travel"
};

await rm(distDir);
await mkdir(path.join(distDir, "posts"));

const [css, js] = await Promise.all([
  fs.readFile(path.join(assetsDir, "styles.css"), "utf8"),
  fs.readFile(path.join(assetsDir, "script.js"), "utf8")
]);

await Promise.all([
  fs.writeFile(path.join(distDir, "styles.css"), css),
  fs.writeFile(path.join(distDir, "script.js"), js),
  copyDir(adminDir, path.join(distDir, "studio")),
  copyDirIfExists(publicDir, distDir)
]);

const postFiles = (await fs.readdir(contentDir))
  .filter((file) => file.endsWith(".md"))
  .sort();

const posts = [];

for (const file of postFiles) {
  const source = await fs.readFile(path.join(contentDir, file), "utf8");
  const { data, body } = parseFrontmatter(source);
  const slug = file.replace(/\.md$/, "");
  const html = markdownToHtml(body);
  const excerpt = data.excerpt || createExcerpt(body);
  const normalizedCategory = normalizeCategory(data.category || "生活");
  posts.push({
    slug,
    title: data.title,
    date: data.date,
    category: normalizedCategory.key,
    categoryLabel: normalizedCategory.label,
    tags: parseTags(data.tags || ""),
    excerpt,
    cover: data.cover || "",
    html
  });
}

posts.sort((a, b) => b.date.localeCompare(a.date));

await Promise.all([
  fs.writeFile(path.join(distDir, "index.html"), renderHome(posts)),
  ...posts.map((post) =>
    fs.writeFile(
      path.join(distDir, "posts", `${post.slug}.html`),
      renderPost(post, selectRelatedPosts(post, posts))
    )
  )
]);

console.log(`Built ${posts.length} posts into ${distDir}`);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseInline(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function parseFrontmatter(source) {
  if (!source.startsWith("---")) {
    return { data: {}, body: source.trim() };
  }

  const endIndex = source.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { data: {}, body: source.trim() };
  }

  const rawFrontmatter = source.slice(3, endIndex).trim();
  const body = source.slice(endIndex + 4).trim();
  const data = {};

  for (const line of rawFrontmatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    data[key] = value;
  }

  return { data, body };
}

function createExcerpt(body) {
  return body
    .replace(/^#+\s+/gm, "")
    .replace(/^- /gm, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 90)
    .concat("...");
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCategory(value) {
  const raw = String(value || "").trim() || "生活";
  const alias = categoryAliases[raw];
  if (alias) {
    return {
      key: alias,
      label: site.categories[alias]
    };
  }
  return {
    key: raw,
    label: raw
  };
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${parseInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<ul>${listItems.map((item) => `<li>${parseInline(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }
  };

  const flushQuote = () => {
    if (quote.length) {
      blocks.push(`<blockquote>${quote.map((item) => `<p>${parseInline(item)}</p>`).join("")}</blockquote>`);
      quote = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push(`<h3>${parseInline(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push(`<h2>${parseInline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push(`<h1>${parseInline(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      flushQuote();
      listItems.push(line.slice(2));
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      quote.push(line.slice(2));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return blocks.join("\n");
}

function renderLayout({ title, description, body, backToHome = false }) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="stylesheet" href="${backToHome ? "../styles.css" : "./styles.css"}" />
  </head>
  <body>
    ${body}
    <script src="${backToHome ? "../script.js" : "./script.js"}"></script>
  </body>
</html>`;
}

function renderHome(posts) {
  const body = `
    <div class="page-shell">
      <header class="hero">
        <section class="hero-content" id="top">
          <div class="hero-copy hero-copy-simple">
            <h1>${site.heroTitle}</h1>
            <p class="intro">${site.intro}</p>
          </div>
        </section>
      </header>

      <main>
        <section class="section profile-section" id="about">
          <div class="section-heading">
            <div>
              <p class="eyebrow">About Charles</p>
              <h2>${site.profile.title}</h2>
            </div>
          </div>

          <p class="profile-summary">${site.profile.summary}</p>

          <div class="profile-grid">
            <article class="panel profile-card">
              <p class="panel-label">Education</p>
              <ul class="profile-list">
                ${site.profile.education.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </article>

            <article class="panel profile-card">
              <p class="panel-label">Highlights</p>
              <ul class="profile-list">
                ${site.profile.highlights.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </article>

            <article class="panel profile-card">
              <p class="panel-label">Skills & Focus</p>
              <ul class="profile-list">
                ${site.profile.skills.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </article>
          </div>
        </section>

        <section class="section" id="notes">
          <div class="section-heading">
            <div>
              <p class="eyebrow">All Articles</p>
              <h2>所有文章</h2>
            </div>
          </div>

          <div class="notes-grid notes-grid-simple">
            ${posts
              .map(
                (post) => `
                <article class="note-card" data-category="${post.category}">
                  <p class="note-meta">${post.categoryLabel} / ${formatDate(post.date)}</p>
                  <h3>${post.title}</h3>
                  ${renderTags(post.tags)}
                  <p>${post.excerpt}</p>
                  <a href="./posts/${post.slug}.html">閱讀文章</a>
                </article>`
              )
              .join("")}
          </div>
        </section>
      </main>
    </div>
  `;

  return renderLayout({
    title: site.title,
    description: site.description,
    body
  });
}

function renderPost(post, relatedPosts) {
  const body = `
    <div class="page-shell article-shell">
      <div class="article-layout">
        <aside class="article-sidebar">
          <div class="panel sidebar-panel">
            <p class="panel-label">推薦文章</p>
            ${relatedPosts
              .map(
                (item) => `
                <a class="related-item" href="./${item.slug}.html">
                  <span>${item.categoryLabel}</span>
                  <strong>${item.title}</strong>
                </a>
              `
              )
              .join("")}
          </div>
        </aside>

        <article class="section article-page">
          <a class="back-link" href="../index.html#notes">回到首頁</a>
          <p class="eyebrow">${post.categoryLabel} / ${formatDate(post.date)}</p>
          <h1>${post.title}</h1>
          ${renderTags(post.tags)}
          <p class="article-lead">${post.excerpt}</p>
          <div class="article-body">
            ${post.html}
          </div>
        </article>
      </div>
    </div>
  `;

  return renderLayout({
    title: `${post.title} | ${site.title}`,
    description: post.excerpt,
    body,
    backToHome: true
  });
}

function selectRelatedPosts(post, posts) {
  return posts
    .filter((item) => item.slug !== post.slug)
    .sort((a, b) => {
      const categoryBoostA = a.category === post.category ? 1 : 0;
      const categoryBoostB = b.category === post.category ? 1 : 0;
      if (categoryBoostA !== categoryBoostB) {
        return categoryBoostB - categoryBoostA;
      }
      return b.date.localeCompare(a.date);
    })
    .slice(0, 4);
}

function formatDate(value) {
  return value.replaceAll("-", ".");
}

function renderTags(tags) {
  if (!tags || !tags.length) {
    return "";
  }
  return `<div class="tag-row">${tags.map((tag) => `<span class="tag-pill">#${escapeHtml(tag)}</span>`).join("")}</div>`;
}

async function rm(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function mkdir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function copyDir(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      if (entry.isDirectory()) {
        await copyDir(sourcePath, targetPath);
        return;
      }
      await fs.copyFile(sourcePath, targetPath);
    })
  );
}

async function copyDirIfExists(source, target) {
  try {
    await fs.access(source);
  } catch {
    return;
  }

  await copyDir(source, target);
}
