# ✅ เพิ่มการ์ด Tukta Project

## ไฟล์ที่แก้

### 1. **js/data.js** (บรรทัด 105-106)

#### ก่อน:
```javascript
projTung: { ytd: cleanNumber(parsed[302]?.[i]), sales: cleanNumber(parsed[303]?.[i]), installs: cleanNumber(parsed[304]?.[i]), targetMeets: cleanNumber(parsed[307]?.[i]), meets: cleanNumber(parsed[308]?.[i]), newMeets: cleanNumber(parsed[309]?.[i]), oldMeets: cleanNumber(parsed[310]?.[i]) }
```

#### หลัง:
```javascript
projTung: { ytd: cleanNumber(parsed[302]?.[i]), sales: cleanNumber(parsed[303]?.[i]), installs: cleanNumber(parsed[304]?.[i]), targetMeets: cleanNumber(parsed[307]?.[i]), meets: cleanNumber(parsed[308]?.[i]), newMeets: cleanNumber(parsed[309]?.[i]), oldMeets: cleanNumber(parsed[310]?.[i]) },
projTukta: { ytd: cleanNumber(parsed[302]?.[i]), sales: cleanNumber(parsed[316]?.[i]), installs: cleanNumber(parsed[317]?.[i]), targetMeets: cleanNumber(parsed[320]?.[i]), meets: cleanNumber(parsed[321]?.[i]), newMeets: cleanNumber(parsed[322]?.[i]), oldMeets: cleanNumber(parsed[323]?.[i]) }
```

### 2. **js/data.js** - Mock Data (บรรทัด 17-18)

#### ก่อน:
```javascript
projYa: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5}, 
projTung: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5}
```

#### หลัง:
```javascript
projYa: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5},
projTung: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5},
projTukta: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5}
```

### 3. **js/pages/sales.js** (บรรทัด 31-35)

#### ก่อน:
```javascript
const projects = [
    { id: 'YA', title: 'Sales Project', data: { ...b.projYa, ytd: getProjectYtdSales('projYa') }, c: 'amber' },
    { id: 'Tung', title: 'Sales Project', data: { ...b.projTung, ytd: getProjectYtdSales('projTung') }, c: 'amber' }
].sort((a,b) => b.data.sales - a.data.sales);
```

#### หลัง:
```javascript
const projects = [
    { id: 'YA', title: 'Sales Project', data: { ...b.projYa, ytd: getProjectYtdSales('projYa') }, c: 'amber' },
    { id: 'Tung', title: 'Sales Project', data: { ...b.projTung, ytd: getProjectYtdSales('projTung') }, c: 'amber' },
    { id: 'Tukta', title: 'Sales Project', data: { ...b.projTukta, ytd: getProjectYtdSales('projTukta') }, c: 'amber' }
].sort((a,b) => b.data.sales - a.data.sales);
```

---

## Row Mapping Reference

```
🏗️ Tukta Project

Row 303: YTD Sales
Row 317: ยอดขายสัปดาห์นี้ (Weekly Sales)
Row 318: จำนวนติดตั้ง (Installations)
Row 321: เป้าพบลูกค้า (Target Meets)
Row 322: พบลูกค้า (Total Meets)
Row 323: ลูกค้าใหม่ (New Customers)
Row 324: ลูกค้าเก่า (Old Customers)
```

---

## ผลลัพธ์

✅ Tukta card จะแสดงในฝ่ายโครงการ (Sales Project) ด้านล่าง YA และ Tung  
✅ ข้อมูล: ยอดขาย B0, ติดตั้ง 0 งาน, พบลูกค้า 21/12 ราย (175%)  
✅ Mock data อัปเดต (หากดึงข้อมูลจาก Google Sheet ล้มเหลว)

---

## ตรวจสอบ

✅ Data mapping ถูก (Row 303, 317-318, 321-324)  
✅ Added to projects array  
✅ Added to mock data  
✅ Same structure as YA/Tung

---

**Status:** Ready to test ✅
**Updated:** June 3, 2026
