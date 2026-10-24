/* Public, read-only Google Sheets connection. No administrator API or credentials. */
(function (root) {
    'use strict';
    const spreadsheet = '1IRU1ZjQIUbpBmz_MAzVtXdQQ93eQbJNJO9nC7fGvAKs';
    const sources = { customers: '435524808', feedback: '2056659298', overrides: '1509972127' };
    const clean = value => String(value ?? '').trim();
    function parseCSV(input) {
        const rows = []; let row = [], field = '', quoted = false;
        for (let i = 0; i < input.length; i++) {
            const c = input[i];
            if (quoted) {
                if (c === '"' && input[i+1] === '"') { field += '"'; i++; }
                else if (c === '"') quoted = false;
                else field += c;
            } else if (c === '"') quoted = true;
            else if (c === ',') { row.push(field); field = ''; }
            else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
            else if (c !== '\r') field += c;
        }
        if (quoted) throw new Error('ข้อมูล CSV ไม่สมบูรณ์');
        if (field || row.length) { row.push(field); rows.push(row); }
        return rows.filter(row => row.some(clean));
    }
    function timestamp(raw) {
        const m = clean(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (!m) return 0;
        const year = Number(m[3]) > 2400 ? Number(m[3])-543 : Number(m[3]);
        return new Date(year, Number(m[2])-1, Number(m[1]), Number(m[4]||0), Number(m[5]||0), Number(m[6]||0)).getTime();
    }
    function table(csv, required, label) {
        const rows = parseCSV(csv), headers = rows.shift()?.map(clean) || [];
        if (required.some(name => !headers.includes(name))) throw new Error(`คอลัมน์ในชีต ${label} เปลี่ยนไป กรุณาตรวจแหล่งข้อมูล`);
        return {rows, get: (row, name, last = false) => clean(row[last ? headers.lastIndexOf(name) : headers.indexOf(name)])};
    }
    function join(customersCSV, feedbackCSV, overridesCSV) {
        const customers = table(customersCSV,['ID','ชื่อลูกค้า','บริษัท','วันที่ติดตั้ง','Admin','ฝ่ายขาย','ช่างติดตั้ง','ประเภทหน้างาน','ข้อมูลเพิ่มเติม'], 'Data');
        const responses = table(feedbackCSV,['ID','Timestamp','Admin Score','Sales Score','Technician Score','Overall Mood'], 'GFS_Care_Quest');
        const overrides = table(overridesCSV,['Customer ID','Admin Display Names','Sales Display Names','Tech Display Names','Worksite Type'], 'Presentation Overrides');
        const people = new Map(), names = new Map(), feedback = new Map();
        // A customer can have multiple installation rows. Prefer their latest installation.
        for (const row of customers.rows) {
            const get = (name, last) => customers.get(row,name,last), id = get('ID');
            if (!id) continue;
            const candidate = {id, name:get('ชื่อลูกค้า'), company:get('บริษัท'), jobType:get('ประเภทหน้างาน'), addressFromData:get('ข้อมูลเพิ่มเติม') || get('สถานที่หน้างาน'), installDate:get('วันที่ติดตั้ง'), adminName:get('Admin') || get('ฝ่ายขาย'), sales:get('ฝ่ายขาย',true) || get('ฝ่ายขาย'), tech:get('ช่างติดตั้ง')};
            if (!people.has(id) || timestamp(candidate.installDate) >= timestamp(people.get(id).installDate)) people.set(id,candidate);
        }
        for (const row of overrides.rows) {
            const get = name => overrides.get(row,name), id = get('Customer ID');
            if (id) names.set(id,{admin:get('Admin Display Names'),sales:get('Sales Display Names'),tech:get('Tech Display Names'),worksiteType:get('Worksite Type')});
        }
        for (const row of responses.rows) {
            const get = name => responses.get(row,name), id = get('ID');
            if (!id || !get('Timestamp')) continue;
            const value = {timestamp:get('Timestamp'),overallMood:get('Overall Mood'),ratings:{admin:get('Admin Score'),sales:get('Sales Score'),tech:get('Technician Score')},details:{admin:get('Admin Tags'),sales:get('Sales Tags'),tech:get('Technician Tags')},comments:{admin:get('Admin Comment'),sales:get('Sales Comment'),tech:get('Technician Comment')},mvp:get('MVP Team'),mvpComment:get('Customer Comment'),benefits:get('ผลลัพธ์ของฟิล์ม'),supportNeeds:get('Follow-up Issue'),supportDetails:get('Follow-up Details')};
            if (!feedback.has(id) || timestamp(value.timestamp) >= timestamp(feedback.get(id).timestamp)) feedback.set(id,value);
        }
        let unmatched = 0;
        const data = [...feedback].map(([id,value]) => {
            if (!people.has(id)) unmatched++;
            return {...(people.get(id) || {id}), presentationOverrides:names.get(id), status:'Completed', feedback:value};
        });
        return {data,unmatched};
    }
    async function load() {
        const values = await Promise.all(Object.values(sources).map(async gid => {
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheet}/gviz/tq?tqx=out:csv&gid=${gid}&headers=1&_=${Date.now()}`;
            const response = await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(30000)});
            if (!response.ok) throw new Error(`Google Sheets ตอบกลับ ${response.status}`);
            const csv = await response.text();
            if (/^\s*<!doctype|^\s*<html/i.test(csv)) throw new Error('Google Sheets ไม่ได้ส่งข้อมูลตารางกลับมา');
            return csv;
        }));
        return join(...values);
    }
    const api = {load,join,parseCSV,timestamp};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.BBBuildingFeedbackData = api;
})(typeof window !== 'undefined' ? window : globalThis);
