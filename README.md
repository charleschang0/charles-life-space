# 查爾斯的生活空間

這是一個面向讀者的靜態個人網站，內容分類為：

- `life`
- `study`
- `travel`

網站內容的真實資料會存成 repo 裡的檔案：

- 已發佈文章：`content/posts/*.md`
- 草稿：`content/drafts/*.md`
- 圖片：`public/uploads/*`

## 文章格式

```md
---
title: 文章標題
date: 2026-05-01
category: life
excerpt: 這篇文章的簡短摘要
---

正文寫在這裡。
```

## 平常更新方式

你有兩種更新方式：

1. 直接編輯 `content/posts/*.md`
2. 使用網站後台 `studio.html` 或部署後的 `/studio/`

## 本地建置

```bash
npm run build
```

建置後的網站會輸出到 `dist/`。

本地預覽：

```bash
npm run preview
```

## 文章後台

`admin/` 原始碼會在建置時輸出成 `dist/studio/`，作為不出現在前台導覽裡的後台入口。現在它包含一層密碼登入頁，登入成功後才會進入真正的管理頁。

使用前需要：

1. 先把專案推到 GitHub
2. 準備一個 GitHub Personal Access Token
3. Token 權限至少要能寫入 repo contents

後台現在支援：

- GitHub 帳號
- Repo 名稱
- Branch
- Token
- 文章標題 / 日期 / 分類 / 摘要 / 正文
- Markdown 格式工具列（標題 / 引用 / 粗體 / 清單 / 連結）
- 本機自動草稿
- GitHub 雲端草稿
- 圖片上傳並插入文章

送出後會直接建立新的 Markdown 檔，然後觸發 GitHub Pages 重新部署。

注意：

1. Studio 的登入狀態會保留 12 小時
2. GitHub token 會存在瀏覽器 localStorage，方便下次直接使用
3. 如果是共用裝置，發佈完請記得登出並清除

如果你要更換 Studio 密碼：

```bash
npm run set:studio-password -- 你的新密碼
npm run build
```

## 部署到 GitHub Pages

這個專案已經附上 `.github/workflows/deploy.yml`。

步驟：

1. 建立 GitHub repo
2. 把這個資料夾推到 `main`
3. 到 GitHub Repository 的 `Settings > Pages`
4. 確認 Source 使用 `GitHub Actions`

之後每次 push 到 `main`，網站都會自動重新部署。
