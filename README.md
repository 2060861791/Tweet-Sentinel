# X (Twitter) 推文监控与TG警报机器人

> 基于 Puppeteer + Node.js 的 X (Twitter) 实时推文监控、关键词警报与 Telegram 推送工具

---

## ✨ 项目简介

本项目可自动监控指定 X (Twitter) 用户的最新推文，支持关键词实时警报、终端美化输出、推文本地去重持久化，并可将警报推送到 Telegram 群/个人。

- **高仿真指纹伪装**，极大降低被风控/封号风险
- **终端美观表格输出**，一目了然
- **支持多关键词警报**，推送到 Telegram
- **自动持久化已见推文**，避免重复提醒
- **支持自定义抓取间隔（30~50秒随机）**

---

## 🚀 主要特性

- [x] Puppeteer 无头浏览器，模拟真实用户环境
- [x] 语言、时区、WebGL、Canvas、硬件等指纹伪装
- [x] 支持多关键词（如OKX的📌、More details on、Early Access）
- [x] 终端表格美化输出，警报高亮
- [x] 新推文自动推送 Telegram
- [x] 启动时自动推送“监控已启动”消息
- [x] cookies/session 持久化，免重复登录
- [x] 本地 seen.json 自动去重
- [x] 完善的日志与异常处理

---

## 🛠️ 安装与依赖

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```
2. **安装依赖**
   ```bash
   npm install
   ```

---

## ⚙️ 环境变量配置（.env）

在项目根目录新建 `.env` 文件，内容如下：

```
TELEGRAM_BOT_TOKEN=你的TG机器人Token
TELEGRAM_CHAT_ID=你的TG群组或个人ID
```

- 如何获取 [Telegram Bot Token](https://core.telegram.org/bots#botfather)
- 如何获取 [Chat ID](https://t.me/getmyid_bot)

---

## 🍪 Cookies 获取方法

1. 用 Chrome 登录你的 X (Twitter) 账号。
2. F12 打开开发者工具 → 应用(Application) → Cookies → 右键 `https://x.com` → 全部导出。
3. 将导出的 cookies（数组格式）保存为 `cookies.json`，放在项目根目录。

---

## 🏃‍♂️ 使用说明

1. **配置好 .env 和 cookies.json 后，直接运行：**
   ```bash
   node watcher.js
   ```
2. **终端会自动美化输出表格，警报推文高亮，并推送到 Telegram。**
3. **每次启动会自动推送“监控已启动”消息到 Telegram。**

---

## 🖥️ 终端美化与安全说明

- 所有输出均用 [chalk](https://github.com/chalk/chalk) 高亮，推文以表格形式展示。
- 采用 [strip-ansi](https://github.com/chalk/strip-ansi) 保证表格对齐。
- 指纹伪装包括 User-Agent、语言、时区、WebGL、Canvas、平台、硬件等，极大降低被风控概率。
- cookies.json 建议定期更新，避免失效。

---

## 📢 Telegram 推送说明

- 只要推文内容包含关键词（如📌、More details on、Early Access），会立即推送警报到 Telegram。
- 启动时也会推送一条“监控已启动”消息。
- 支持自定义关键词，修改 watcher.js 中的 `KEYWORDS` 数组即可。

---

## ❓ 常见问题与安全建议

- **Q: 为什么终端报 `chalk.stripColor is not a function`？**
  - A: 已用 strip-ansi 替代，确保依赖已安装。
- **Q: cookies.json 只要 auth_token 可以吗？**
  - A: 不行，必须导出完整 cookies 数组。
- **Q: 会被 X 封号吗？**
  - A: 已做最大限度指纹伪装，低频访问+真实 cookies+本地运行风险极低。
- **Q: 可以在服务器/云主机上跑吗？**
  - A: 建议只在自己常用电脑上运行，避免IP异常。**在腾讯云、阿里云等国内服务器上跑可以用Clash挂一个全局的代理，然后使用pm2管理或者直接打包成镜像docker上传运行就行**
- **Q: 如何自定义监控用户或关键词？**
  - A: 修改 watcher.js 顶部的 `TARGET` 和 `KEYWORDS` 数组。

---

## 🙏 致谢

- [Puppeteer](https://github.com/puppeteer/puppeteer)
- [chalk](https://github.com/chalk/chalk)
- [strip-ansi](https://github.com/chalk/strip-ansi)
- [node-fetch](https://github.com/node-fetch/node-fetch)

---

> 本项目仅供学习与个人信息监控用途，严禁用于任何违反 X (Twitter) 或 Telegram 服务条款的行为。 