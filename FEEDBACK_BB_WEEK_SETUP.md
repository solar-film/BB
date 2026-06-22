# BB Customer Feedback

ระบบนี้เป็นแอปแยกจาก BB Weekly Dashboard และไม่แก้ไขไฟล์หรือข้อมูลของเว็บเดิม

## ไฟล์ที่ใช้

- `feedback-bb-week.html` — หน้าแอปสำหรับเลือกงานและกรอก Feedback
- `css/feedback-bb-week.css` — รูปแบบหน้าจอ
- `js/feedback-bb-week.js` — อ่านข้อมูลจาก `Our-DATA` และส่งข้อมูลบันทึก
- `templates/feedback-bb-week-apps-script.gs` — Web App สำหรับสร้าง/บันทึกชีต `Feedback-BB-Week`
- `feedback-presentation.html` — หน้าสไลด์นำเสนอ Feedback โดยเปิด Week ล่าสุดเป็นค่าเริ่มต้น

## การบันทึก

ระบบเชื่อม Apps Script Web App ไว้แล้ว ผู้ใช้งานไม่ต้องตั้งค่า URL และสามารถเลือกงาน กรอก Feedback แล้วบันทึกลงแท็บ `Feedback-BB-Week` ได้ทันที

## หลังอัปเดตโค้ด Apps Script

เมื่อนำ `templates/feedback-bb-week-apps-script.gs` เวอร์ชันใหม่ไปวาง ให้เลือก **Deploy > Manage deployments > Edit > New version > Deploy** โดยใช้ Deployment เดิม URL จะไม่เปลี่ยน ระบบจึงจะรองรับการเปิดข้อมูลเก่าและอัปเดตแถวเดิมด้วย `Record ID`

## ข้อมูลที่บันทึก

ข้อมูลจาก `Our-DATA`: ชื่อลูกค้า, บริษัท, เบอร์โทรติดต่อ, ช่องทาง, Line @, ที่อยู่, เดือนติดตั้ง, วันที่ติดตั้ง, พื้นที่กระจก, หน่วย และฝ่ายขาย

ข้อมูลเพิ่ม: BB Week, วันที่สอบถาม, คำติชม/Feedback ฝ่ายขาย, คำติชม/Feedback ทีมช่าง, ข้อแนะนำอื่นๆ, รายชื่อช่าง และหมายเหตุ
