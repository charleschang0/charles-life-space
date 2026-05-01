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
  heroTitle: "把生活裡值得停下來的片刻，寫成讓人願意慢慢讀完的文章。",
  intro:
    "這裡不是工作面板，而是一個面向讀者的個人出版空間。關於生活節奏、學習方法、旅途觀察，還有那些在日常裡慢慢長出來的想法，都會被好好整理後放在這裡。",
  feature: {
    label: "Featured Story",
    title: "寫得更像雜誌，而不是備忘錄",
    body:
      "新的首頁把重心放回內容本身。讀者會先看到文章與分類，而不是你的個人進度表，整體更像一個可以被持續閱讀的生活媒體。",
    items: [
      "生活：日常觀察、情緒整理、城市節奏",
      "學習：閱讀方法、語言筆記、知識內化",
      "旅遊：旅行片段、地方感受、路上的細節"
    ]
  },
  quote: "好的個人網站，不只是紀錄自己，也是在替讀者保留一種停下來閱讀的理由。",
  quoteCaption: "當文章被好好整理，它就會從日記變成出版。",
  categories: {
    life: "生活",
    study: "學習",
    travel: "旅遊"
  }
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
  posts.push({
    slug,
    title: data.title,
    date: data.date,
    category: data.category,
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
  const categoryButtons = [
    { key: "all", label: "全部" },
    ...Object.entries(site.categories).map(([key, label]) => ({ key, label }))
  ];
  const featured = posts[0];
  const latestPosts = posts.slice(1, 4);

  const body = `
    <div class="page-shell">
      <header class="hero">
        <nav class="topbar">
          <a class="brand" href="#top">${site.title}</a>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">選單</button>
          <div class="nav-links" id="site-nav">
            <a href="#featured">精選文章</a>
            <a href="#notes">所有文章</a>
          </div>
        </nav>

        <section class="hero-content" id="top">
          <div class="hero-copy">
            <p class="eyebrow">${site.eyebrow}</p>
            <h1>${site.heroTitle}</h1>
            <p class="intro">${site.intro}</p>
            <div class="hero-actions">
              <a class="button button-primary" href="#notes">開始閱讀</a>
              <a class="button button-secondary" href="#featured">本週精選</a>
            </div>
          </div>

          <aside class="focus-card">
            <p class="card-label">${site.feature.label}</p>
            <h2>${site.feature.title}</h2>
            <p>${site.feature.body}</p>
            <ul class="focus-list">
              ${site.feature.items.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </aside>
        </section>
      </header>

      <main>
        <section class="section featured-section" id="featured">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Editor's Pick</p>
              <h2>先讀這一篇，進入查爾斯的生活空間。</h2>
            </div>
          </div>

          <div class="featured-layout">
            <article class="panel featured-story">
              <p class="note-meta">${site.categories[featured.category]} / ${formatDate(featured.date)}</p>
              <h3>${featured.title}</h3>
              <p>${featured.excerpt}</p>
              <a class="story-link" href="./posts/${featured.slug}.html">閱讀全文</a>
            </article>

            <div class="panel latest-list">
              <p class="panel-label">Latest</p>
              ${latestPosts
                .map(
                  (post) => `
                    <a class="latest-item" href="./posts/${post.slug}.html">
                      <span>${site.categories[post.category]}</span>
                      <strong>${post.title}</strong>
                    </a>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>

        <section class="section" id="notes">
          <div class="section-heading with-inline-control">
            <div>
              <p class="eyebrow">All Articles</p>
              <h2>關於生活、學習與旅遊的文章索引。</h2>
            </div>
            <div class="filter-group" aria-label="文章分類">
              ${categoryButtons
                .map(
                  (item, index) => `
                  <button class="filter-chip${index === 0 ? " is-active" : ""}" type="button" data-filter="${item.key}">
                    ${item.label}
                  </button>`
                )
                .join("")}
            </div>
          </div>

          <div class="notes-grid">
            ${posts
              .map(
                (post) => `
                <article class="note-card" data-category="${post.category}">
                  <p class="note-meta">${site.categories[post.category]} / ${formatDate(post.date)}</p>
                  <h3>${post.title}</h3>
                  <p>${post.excerpt}</p>
                  <a href="./posts/${post.slug}.html">閱讀文章</a>
                </article>`
              )
              .join("")}
          </div>
        </section>

        <section class="section weekly-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Reading Note</p>
              <h2>讓這個空間更像出版，而不只是資料堆疊。</h2>
            </div>
          </div>

          <div class="weekly-grid">
            <article class="panel rhythm-panel">
              <p class="panel-label">這裡會持續更新</p>
              <div class="rhythm-list">
                <div>
                  <span>生活</span>
                  <p>那些看似平凡，卻值得被重新描述的日常片段。</p>
                </div>
                <div>
                  <span>學習</span>
                  <p>從閱讀、語言、思考方法中整理出能被分享的收穫。</p>
                </div>
                <div>
                  <span>旅遊</span>
                  <p>旅行裡的人、地方與空氣感，如何改變觀看世界的方式。</p>
                </div>
              </div>
            </article>

            <article class="panel quote-panel">
              <p class="panel-label">給讀者的一句話</p>
              <blockquote>${site.quote}</blockquote>
              <p class="quote-caption">${site.quoteCaption}</p>
            </article>
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
                  <span>${site.categories[item.category]}</span>
                  <strong>${item.title}</strong>
                </a>
              `
              )
              .join("")}
          </div>
        </aside>

        <article class="section article-page">
          <a class="back-link" href="../index.html#notes">回到首頁</a>
          <p class="eyebrow">${site.categories[post.category]} / ${formatDate(post.date)}</p>
          <h1>${post.title}</h1>
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
