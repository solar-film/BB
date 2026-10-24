const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseCSV,join,timestamp} = require('../js/feedback-building-data.js');
const csv = rows => rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(',')).join('\r\n');
test('CSV preserves multiline comments, commas and escaped quotes', () => {
    assert.deepEqual(parseCSV(csv([['ID','Comment'],['A','hello, "world"\nnext line']])), [['ID','Comment'],['A','hello, "world"\nnext line']]);
    assert.throws(() => parseCSV('"unfinished'), /ไม่สมบูรณ์/);
});
test('joins latest feedback and installation by trimmed ID with presentation overrides', () => {
    const people = csv([
        ['ID','ชื่อลูกค้า','บริษัท','วันที่ติดตั้ง','Admin','ฝ่ายขาย','ฝ่ายขาย','ช่างติดตั้ง','ประเภทหน้างาน','ข้อมูลเพิ่มเติม'],
        ['A','ลูกค้า','MHL','1/8/2026','Admin','Lead','Sale','Tech','บ้าน','ที่อยู่เดิม'],
        ['A','ลูกค้า','MHL','3/9/2026','Admin','Lead','Sale','Tech','บ้าน','ที่อยู่ล่าสุด']
    ]);
    const responses = csv([
        ['ID','Timestamp','Admin Score','Sales Score','Technician Score','Overall Mood'],
        ['A ','5/9/2026, 12:06:02','5','5','4','😊'],
        ['A','1/9/2026, 10:00:00','1','1','1','😐'],
        ['MISSING','2/9/2026, 10:00:00','','4','3','😊']
    ]);
    const names = csv([['Customer ID','Admin Display Names','Sales Display Names','Tech Display Names','Worksite Type'],['A','ดาว','แคท','ทีม','บ้านเดี่ยว']]);
    const result = join(people,responses,names);
    assert.equal(result.data.length,2);
    assert.equal(result.unmatched,1);
    const a = result.data.find(r=>r.id==='A');
    assert.equal(a.addressFromData,'ที่อยู่ล่าสุด');
    assert.equal(a.sales,'Sale');
    assert.equal(a.feedback.ratings.admin,'5');
    assert.equal(a.presentationOverrides.admin,'ดาว');
    assert.equal(a.presentationOverrides.worksiteType,'บ้านเดี่ยว');
    assert.equal(timestamp('5/9/2569, 12:06:02'),timestamp('5/9/2026, 12:06:02'));
    assert.throws(()=>join('ID\nA',responses,names),/Data/);
});
