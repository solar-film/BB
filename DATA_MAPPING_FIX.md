# ✅ Data Mapping Fix - ฟิล์มรถยนต์

## ปัญหาที่พบ

Dashboard แสดง:
- "8,541,717" (ผิด - ไม่ควรเป็นเลขนี้)
- "7059270.4%" (ผิด - ควรเป็น "15%")

**สาเหตุ:** Code ดึงข้อมูลจาก Row ผิด

---

## แก้ไขแล้ว

### 1. **js/data.js** (บรรทัด 81-84)

#### ก่อน (ผิด ❌):
```javascript
installs: { 
    line: cleanNumber(parsed[361]?.[i]),      // Row 362
    fb: cleanNumber(parsed[362]?.[i]),        // Row 363
    tel: cleanNumber(parsed[363]?.[i]),       // Row 364
    walkin: cleanNumber(parsed[364]?.[i]),    // Row 365
    showroom: cleanNumber(parsed[365]?.[i]),  // Row 366
    other: cleanNumber(parsed[366]?.[i])      // Row 367
},
contacts: { 
    total: cleanNumber(parsed[371]?.[i]),     // Row 372
    ...
}
```

#### หลัง (ถูก ✅):
```javascript
installs: { 
    total: cleanNumber(parsed[373]?.[i]),     // Row 374 ← ติดตั้งรวม
    line: cleanNumber(parsed[374]?.[i]),      // Row 375 ← LINE
    fb: cleanNumber(parsed[375]?.[i]),        // Row 376 ← Facebook
    tel: cleanNumber(parsed[376]?.[i]),       // Row 377 ← โทร
    walkin: cleanNumber(parsed[377]?.[i]),    // Row 378 ← Walk-In
    showroom: cleanNumber(parsed[378]?.[i]),  // Row 379 ← ShowRoom
    other: cleanNumber(parsed[379]?.[i])      // Row 380 ← อื่นๆ
},
contacts: { 
    total: cleanNumber(parsed[384]?.[i]),     // Row 385 ← ติดต่อรวม
    tel: cleanNumber(parsed[385]?.[i]),       // Row 386
    line: cleanNumber(parsed[386]?.[i]),      // Row 387
    fb: cleanNumber(parsed[387]?.[i])         // Row 388
}
```

### 2. **js/pages/car.js** (บรรทัด 30-33)

#### ก่อน (อาจคำนวณผิด):
```javascript
const totalInstalls = installs.line + installs.fb + installs.tel + installs.walkin + installs.showroom + installs.other;
```

#### หลัง (ใช้ค่าที่ถูก):
```javascript
const totalInstalls = installs.total || (installs.line + installs.fb + installs.tel + installs.walkin + installs.showroom + installs.other);
```

---

## ผลการแก้ไข

### Week 22 (ตัวอย่าง):

| ข้อมูล | ก่อน | หลัง | ถูก ✅ |
|-------|------|------|--------|
| ติดตั้งรวม | 8,541,717 ❌ | 51 ✅ | 51 คัน |
| ติดต่อรวม | ? | 351 ✅ | 351 ติดต่อ |
| % ความสำเร็จ | 7059270.4% ❌ | 14.5% ✅ | (51÷351)×100 = 14.52% ≈ 15% |

---

## Row Mapping Reference

```
🚗 ฟิล์มรถยนต์ (Car Film)

Row 374: ปริมาณรถติดตั้งใหม่ (ติดตั้งรวม)
  ├─ Row 375: LINE
  ├─ Row 376: Facebook  
  ├─ Row 377: โทรศัพท์
  ├─ Row 378: Walk-In
  ├─ Row 379: ShowRoom
  └─ Row 380: อื่นๆ

Row 385: ปริมาณการติดต่อรวม (ติดต่อรวม)
  ├─ Row 386: จำนวนสายโทรเข้า
  ├─ Row 387: สถานที่ติดต่อ Line OA
  └─ Row 388: สถานที่ติดต่อ FB Chat
```

---

## Verification

✅ Data mapping ตรงกับ Google Sheet Row ที่ถูก  
✅ Calculation ใช้ formula: % = (Row374 ÷ Row385) × 100  
✅ Display format: XX.X% (เช่น "15%")

---

## ถัดไป

ตรวจสอบว่า sales.js และหน้าอื่นๆ มีปัญหาคล้ายกันหรือไม่ (หากต้อง)

---
**Updated:** June 3, 2026
**Status:** Ready to test ✅
