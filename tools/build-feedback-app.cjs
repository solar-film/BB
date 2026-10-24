'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.feedback-build');
fs.mkdirSync(output, { recursive: true });
const pages = { 'feedback-bb-week': 'entry', 'feedback-presentation': 'presentation', 'feedback-executive-report': 'report' };
for (const [file, page] of Object.entries(pages)) {
    let html = fs.readFileSync(path.join(root, `${file}.html`), 'utf8');
    html = html.replace('<head>', '<head>\n    <base target="_top">');
    html = html.replace(/<link rel="stylesheet" href="(css\/[^"<>]+)">/g, (_, file) => `<style>${fs.readFileSync(path.join(root, file), 'utf8')}</style>`);
    html = html.replace(/<script src="(js\/[^"<>]+)"><\/script>/g, (_, file) => `<script>${fs.readFileSync(path.join(root, file), 'utf8')}</script>`);
    for (const [target, targetPage] of Object.entries(pages)) {
        html = html.replaceAll(`href="${target}.html"`, `href="<?= appUrl ?>?page=${targetPage}"`);
    }
    html = html.replaceAll('href="index.html"', 'href="https://solar-film.github.io/BB/"');
    html = html.replaceAll('href="favicon.svg"', 'href="https://solar-film.github.io/BB/favicon.svg"');
    fs.writeFileSync(path.join(output, `${page}.html`), html, 'utf8');
}
fs.copyFileSync(path.join(root, 'templates/feedback-bb-week-apps-script.gs'), path.join(output, 'Code.gs'));
fs.writeFileSync(path.join(output, 'appsscript.json'), JSON.stringify({
    timeZone: 'Asia/Bangkok', runtimeVersion: 'V8', exceptionLogging: 'STACKDRIVER',
    oauthScopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/userinfo.email'],
    webapp: { access: 'ANYONE', executeAs: 'USER_ACCESSING' }
}, null, 2) + '\n');
console.log('Built 3 authenticated pages, Code.gs and appsscript.json in .feedback-build/');
