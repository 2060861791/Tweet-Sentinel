import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import chalk from 'chalk';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import stripAnsi from 'strip-ansi';
dotenv.config();

const TARGET = 'NodeMinerDPN';
const URL = `https://x.com/${TARGET}`;
const CACHE_FILE = './seen.json';
const COOKIES_FILE = './cookies.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.7117.1 Safari/537.36';
const LANGUAGES = ['zh-CN', 'zh', 'en-US', 'en'];
const TIMEZONE = 'Asia/Shanghai';
const PLATFORM = 'Win32';
const HARDWARE_CONCURRENCY = 6;
const DEVICE_MEMORY = 8;
const KEYWORDS = ['📌', 'More details on', 'Early Access'];
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 读取或初始化已见推文 ID 列表
async function loadSeen() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// 保存已见推文 ID 列表
async function saveSeen(seen) {
    try {
        await fs.writeFile(CACHE_FILE, JSON.stringify(seen, null, 2));
    } catch (e) {
        console.error(chalk.bgRed.white('[缓存] 保存缓存文件失败:'), chalk.red(e.message));
    }
}

// 读取 cookies
async function loadCookies(page) {
    try {
        const cookies = JSON.parse(await fs.readFile(COOKIES_FILE, 'utf8'));
        await page.setCookie(...cookies);
    } catch (e) {
        // 忽略
    }
}

// 保存 cookies
async function saveCookies(page) {
    const cookies = await page.cookies();
    await fs.writeFile(COOKIES_FILE, JSON.stringify(cookies, null, 2));
}

// Puppeteer 指纹伪装
async function spoofFingerprint(page) {
    await page.evaluateOnNewDocument((LANGUAGES, TIMEZONE, PLATFORM, HARDWARE_CONCURRENCY, DEVICE_MEMORY) => {
        Object.defineProperty(navigator, 'languages', { get: () => LANGUAGES });
        Object.defineProperty(Intl.DateTimeFormat().resolvedOptions(), 'timeZone', { get: () => TIMEZONE });
        Object.defineProperty(navigator, 'platform', { get: () => PLATFORM });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => HARDWARE_CONCURRENCY });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => DEVICE_MEMORY });
        // Canvas 伪装
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function () {
            const context = this.getContext('2d');
            context.fillStyle = 'rgba(100,100,100,0.1)';
            context.fillRect(0, 0, this.width, this.height);
            return toDataURL.apply(this, arguments);
        };
        // WebGL 伪装
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) return 'NVIDIA GeForce GTX 1050 Ti';
            if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti Direct3D11 vs_5_0 ps_5_0, D3D11-23.21.13.8800)';
            return getParameter.apply(this, arguments);
        };
    }, LANGUAGES, TIMEZONE, PLATFORM, HARDWARE_CONCURRENCY, DEVICE_MEMORY);
    await page.setExtraHTTPHeaders({ 'Accept-Language': LANGUAGES.join(',') });
}

// 生成30-50秒的随机间隔
function getRandomInterval() {
    const sec = Math.floor(Math.random() * 21) + 30; // 30~50
    return sec * 1000;
}

// 检查推文是否包含关键词
function containsKeyword(text) {
    return KEYWORDS.some(keyword => text && text.toLowerCase().includes(keyword.toLowerCase()));
}

// 推送到Telegram
async function sendTelegramAlert(text, url) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log(chalk.red('[警告] 未设置 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID，无法推送Telegram警报'));
        return;
    }
    const message = url
        ? `🚨 新推文警报\n${text}\n🔗 ${url}`
        : text;
    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            })
        });
        const data = await res.json();
        if (data.ok) {
            console.log(chalk.bgGreen.black('[TELEGRAM] 警报已推送'));
        } else {
            console.log(chalk.bgRed.white('[TELEGRAM] 推送失败:'), data.description);
        }
    } catch (e) {
        console.log(chalk.bgRed.white('[TELEGRAM] 推送异常:'), e.message);
    }
}

// 表格美化输出
function printTweetsTable(tweets, seenSet, newIds, alertIds) {
    const rows = tweets.map((tw, idx) => [
        chalk.gray(`#${idx + 1}`),
        chalk.yellowBright(tw.id || ''),
        seenSet.has(tw.id)
            ? chalk.gray('已见')
            : chalk.bgRed.white('新'),
        containsKeyword(tw.text)
            ? chalk.bgRed.whiteBright('警报')
            : chalk.gray('-'),
        tw.text.length > 60
            ? chalk.white(tw.text.slice(0, 60) + '...')
            : chalk.white(tw.text)
    ]);
    const header = [
        chalk.cyan('序号'),
        chalk.cyan('推文ID'),
        chalk.cyan('状态'),
        chalk.cyan('警报'),
        chalk.cyan('内容')
    ];
    const colWidths = [6, 22, 8, 8, 70];
    const pad = (str, len) => str + ' '.repeat(Math.max(0, len - stripAnsi(str).length));
    console.log(
        pad(header[0], colWidths[0]),
        pad(header[1], colWidths[1]),
        pad(header[2], colWidths[2]),
        pad(header[3], colWidths[3]),
        pad(header[4], colWidths[4])
    );
    console.log(chalk.gray('-'.repeat(colWidths.reduce((a, b) => a + b, 0))));
    rows.forEach(row => {
        console.log(
            pad(row[0], colWidths[0]),
            pad(row[1], colWidths[1]),
            pad(row[2], colWidths[2]),
            pad(row[3], colWidths[3]),
            pad(row[4], colWidths[4])
        );
    });
    if (alertIds.length > 0) {
        console.log(chalk.bgRed.white.bold(`\n🚨 关键词警报：`));
        alertIds.forEach(id => {
            const tw = tweets.find(t => t.id === id);
            if (tw) {
                console.log(
                    chalk.bgRed.white.bold('警报!'),
                    chalk.greenBright('🔗'),
                    chalk.underline(`https://x.com/${TARGET}/status/${tw.id}`),
                    chalk.whiteBright(tw.text.length > 100 ? tw.text.slice(0, 100) + '...' : tw.text)
                );
            }
        });
    }
}

// 抓取前 5 条推文
async function fetchTweets(page) {
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(UA);
    await spoofFingerprint(page);
    await page.waitForSelector('[data-testid="tweet"]', { timeout: 60000 });
    const tweets = await page.$$eval(
        '[data-testid="tweet"]',
        (nodes) => nodes.slice(0, 5).map(node => {
            const idMatch = node.querySelector('a[href*="/status/"]')?.href.match(/status\/(\d+)/);
            const text = [...node.querySelectorAll('div[lang]')].map(d => d.innerText).join('\n');
            return { id: idMatch?.[1], text };
        })
    );
    const t1 = Date.now();
    return { tweets, cost: ((t1 - t0) / 1000).toFixed(2) };
}

// 主监控流程
(async () => {
    console.log(chalk.bgCyan.black('🚀 启动 Puppeteer (无头+指纹伪装)...'));
    // 启动前推送一次TG消息
    await sendTelegramAlert(
        `🤖 监控已启动\n对象: @${TARGET}\n时间: ${new Date().toLocaleString()}\n关键词: ${KEYWORDS.join('、')}`
    );
    const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized'] });
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1920, height: 1080 });
    await spoofFingerprint(page);
    await loadCookies(page);
    let seen = await loadSeen();
    let seenSet = new Set(seen);

    // 立即检查一次
    async function checkTweets() {
        const start = Date.now();
        try {
            const { tweets, cost } = await fetchTweets(page);
            const newIds = tweets.filter(tw => tw.id && !seenSet.has(tw.id)).map(tw => tw.id);
            const alertIds = tweets.filter(tw => containsKeyword(tw.text)).map(tw => tw.id);
            printTweetsTable(tweets, seenSet, newIds, alertIds);
            // 立即推送警报
            for (const tw of tweets) {
                if (tw.id && containsKeyword(tw.text) && !tw._alerted) {
                    tw._alerted = true;
                    const url = `https://x.com/${TARGET}/status/${tw.id}`;
                    await sendTelegramAlert(tw.text, url);
                    console.log(chalk.bgRed.white.bold('警报已触发并推送Telegram!'));
                }
            }
            // 更新已见
            newIds.forEach(id => seenSet.add(id));
            seen = Array.from(seenSet);
            if (seen.length > 100) seen = seen.slice(-100);
            await saveSeen(seen);
            await saveCookies(page);
        } catch (e) {
            console.error(chalk.bgRed.white('⚠️ 抓取失败：'), chalk.red(e));
        }
        const end = Date.now();
        const nextInterval = getRandomInterval();
        console.log(
            chalk.bgGreen.black(`[定时] 本轮抓取耗时: ${((end - start) / 1000).toFixed(2)}s`),
            chalk.bgMagenta.white(`[定时] 下次抓取将在 ${(nextInterval / 1000).toFixed(1)} 秒后进行`)
        );
        setTimeout(checkTweets, nextInterval);
    }

    await checkTweets();
})();