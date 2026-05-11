# BB Weekly Dashboard Refactor

ไฟล์นี้ถูกแยกจาก `bb.html` เพื่อให้แก้ไขเร็วขึ้นและลดความเสี่ยงในการแก้โค้ดผิดจุด

## โครงสร้าง

- `index.html` — Layout หลัก, Sidebar, Header, CDN Tailwind/Lucide/Chart.js
- `css/style.css` — CSS เดิมทั้งหมด
- `js/helpers.js` — Utility functions และ calculation helpers
- `js/charts.js` — Chart defaults, progress plugin, chart กลางของ Overview
- `js/data.js` — ดึงข้อมูล Google Sheets, parse CSV, mock data fallback
- `js/app.js` — State, navigation, event handlers, controller
- `js/pages/*.js` — Render function รายหน้า

## วิธีเปิดใช้งาน

เปิด `index.html` ผ่าน local server เช่น VS Code Live Server หรือ deploy ขึ้น Cloudflare Pages/GitHub Pages ได้เลย

> แนะนำ: อย่าเปิดผ่าน `file://` หาก browser บล็อกการ fetch Google Sheets CSV ให้ใช้ Live Server แทน
