/* Read-only presentation of the approved public Feedback workbook. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const text = value => String(value ?? '').trim();
    const escape = value => text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const labels = { admin: 'แอดมิน', sales: 'ฝ่ายขาย', tech: 'ทีมช่าง' };
    let records = [], filtered = [], index = 0, loaded = false;

    function date(value) {
        const raw = text(value).replace(/,\s*/, ' ');
        const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (match) {
            const year = Number(match[3]) > 2400 ? Number(match[3]) - 543 : Number(match[3]);
            const result = new Date(year, Number(match[2])-1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0));
            return result.getFullYear() === year && result.getMonth() === Number(match[2])-1 && result.getDate() === Number(match[1]) ? result : null;
        }
        if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(raw)) return null;
        const result = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
        return Number.isNaN(result.getTime()) ? null : result;
    }
    const key = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
    function format(value, withTime = false) {
        const d = date(value);
        return d ? new Intl.DateTimeFormat('th-TH', {day:'numeric',month:'short',year:'numeric', ...(withTime ? {hour:'2-digit',minute:'2-digit',hour12:false} : {})}).format(d) : text(value) || '—';
    }
    function score(value) {
        if (value === null || value === undefined || text(value) === '') return null;
        const n = Number(value);
        return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
    }
    const tags = value => (Array.isArray(value) ? value : text(value).split(',')).map(text).filter(Boolean);
    function name(c, role) {
        return text(c.presentationOverrides?.[role]) || text(role === 'admin' ? c.adminName : c[role]) || 'ไม่ระบุ';
    }
    function showEmpty(title, description) {
        $('presentation').hidden = true;
        $('empty').hidden = false;
        $('empty-title').textContent = title;
        $('empty-description').textContent = description;
    }
    function render() {
        if (!filtered.length) { showEmpty('ไม่พบ Feedback ในช่วงเวลานี้', 'เลือกเดือน บริษัท หรือช่วงวันที่ประเมินใหม่'); return; }
        $('empty').hidden = true;
        $('presentation').hidden = false;
        const c = filtered[index], fb = c.feedback;
        $('customer-name').textContent = text(c.name) || 'ไม่ระบุชื่อลูกค้า';
        $('customer-company').textContent = text(c.company) || 'ไม่ระบุบริษัท';
        $('customer-id').textContent = c.id ? `#${c.id}` : 'ไม่ระบุรหัส';
        $('site-type').textContent = text(c.presentationOverrides?.worksiteType) || text(c.jobType) || '—';
        $('address').textContent = text(c.addressFromData) || 'ไม่ระบุสถานที่';
        $('install-date').textContent = format(c.installDate);
        $('assessment-date').textContent = format(fb.timestamp, true);
        const scores = Object.keys(labels).map(role => score(fb.ratings?.[role])).filter(n => n !== null);
        $('average').textContent = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : '—';
        $('mood').textContent = text(fb.overallMood);
        $('counter').textContent = `${index+1} / ${filtered.length}`;
        $('previous').disabled = index === 0;
        $('next').disabled = index === filtered.length-1;
        const cards = Object.entries(labels).map(([role,label]) => {
            const n = score(fb.ratings?.[role]);
            const details = tags(fb.details?.[role]);
            return `<article class="team card ${role}"><div class="team-heading"><span class="team-icon" aria-hidden="true">${{admin:'♧',sales:'▣',tech:'⚒'}[role]}</span><h3>${label}<strong>: ${escape(name(c,role))}</strong></h3></div><div class="rating"><strong>${n ?? '—'}</strong><small>/ 5</small>${n === null ? '' : `<progress max="5" value="${n}" aria-label="คะแนน${label} ${n} จาก 5"></progress>`}</div><div class="tags">${details.length ? details.map(t => `<span class="tag">${escape(t)}</span>`).join('') : '<span class="muted">ไม่มีรายละเอียดการประเมิน</span>'}</div>${fb.comments?.[role] ? `<p class="comment">${escape(fb.comments[role])}</p>` : ''}</article>`;
        });
        const mvp = text(fb.mvp), role = mvp.toLowerCase() === 'sale' ? 'sales' : mvp.toLowerCase();
        const winner = role === 'all' ? 'ทุกทีม' : labels[role] ? `${labels[role]} (${name(c,role)})` : role === 'none' || !role ? 'ไม่ได้ระบุ' : mvp;
        cards.push(`<aside class="award card"><div class="trophy" aria-hidden="true">🏆</div><h3>ทีมที่ประทับใจ</h3><strong>${escape(winner)}</strong>${fb.mvpComment ? `<p>${escape(fb.mvpComment)}</p>` : ''}</aside>`);
        $('teams').innerHTML = cards.join('');
        const additional = [];
        if (tags(fb.benefits).length) additional.push(`<h3>ฟิล์มช่วยเรื่องไหนได้บ้าง</h3><div class="tags">${tags(fb.benefits).map(t=>`<span class="tag">${escape(t)}</span>`).join('')}</div>`);
        if (tags(fb.supportNeeds).length) additional.push(`<h3>สิ่งที่ต้องการให้ช่วยเพิ่มเติม</h3><p>${escape(tags(fb.supportNeeds).join(' · '))}</p>`);
        if (fb.supportDetails) additional.push(`<p>${escape(fb.supportDetails)}</p>`);
        $('additional').innerHTML = additional.join('');
        $('additional').hidden = !additional.length;
    }
    function filter() {
        index = 0;
        if ($('start').value && $('end').value && $('start').value > $('end').value) {
            showEmpty('ช่วงวันที่ไม่ถูกต้อง', 'วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด'); return;
        }
        filtered = records.filter(c => {
            const d = key(date(c.feedback.timestamp));
            return (!$('company').value || c.company === $('company').value)
                && (!$('month').value || d.startsWith($('month').value))
                && (!$('start').value || d && d >= $('start').value)
                && (!$('end').value || d && d <= $('end').value);
        });
        render();
    }
    function options(id, values, label) {
        const previous = $(id).value;
        $(id).replaceChildren(new Option(label,''), ...values.map(v => new Option(id === 'month' ? new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(date(`${v}-01`)) : v, v)));
        $(id).value = values.includes(previous) ? previous : '';
    }
    async function load() {
        $('refresh').disabled = true;
        $('status').className = '';
        $('status').textContent = 'กำลังอัปเดตข้อมูล…';
        try {
            const payload = await window.BBBuildingFeedbackData.load();
            if (!Array.isArray(payload.data) || payload.status && payload.status !== 'success') throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
            records = payload.data.filter(c => c && typeof c === 'object' && c.feedback && typeof c.feedback === 'object' && (c.feedback.overallMood || c.status === 'Completed'));
            records.sort((a,b) => (date(b.feedback.timestamp)?.getTime() || 0) - (date(a.feedback.timestamp)?.getTime() || 0));
            const months = [...new Set(records.map(c => key(date(c.feedback.timestamp)).slice(0,7)).filter(Boolean))].sort().reverse();
            options('month', months, 'ทุกเดือน');
            options('company', [...new Set(records.map(c => text(c.company)).filter(Boolean))].sort(), 'ทุกบริษัท');
            if (!loaded) $('month').value = months[0] || '';
            loaded = true;
            ['month','company','start','end','reset'].forEach(id => $(id).disabled = false);
            $('status').className = 'connected';
            $('status').textContent = `เชื่อมข้อมูลแล้ว · ${records.length} รายการ · อัปเดต ${new Date().toLocaleTimeString('th-TH')}${payload.unmatched ? ` · ${payload.unmatched} รายการไม่พบข้อมูลลูกค้าที่ตรงกัน` : ''}`;
            filter();
        } catch (error) {
            $('status').textContent = loaded ? 'อัปเดตไม่สำเร็จ · กำลังแสดงข้อมูลจากการโหลดครั้งก่อน' : 'เชื่อมข้อมูลไม่สำเร็จ';
            if (!loaded) showEmpty('ไม่สามารถโหลด Feedback ได้', `${error.message} กรุณาลองอัปเดตข้อมูลอีกครั้ง`);
        } finally { $('refresh').disabled = false; }
    }
    ['month','company','start','end'].forEach(id => $(id).addEventListener('change',filter));
    $('reset').addEventListener('click', () => { ['month','company','start','end'].forEach(id => $(id).value=''); filter(); });
    function step(delta) { index = Math.max(0, Math.min(filtered.length-1,index+delta)); if (filtered.length) render(); }
    $('previous').addEventListener('click', () => step(-1));
    $('next').addEventListener('click', () => step(1));
    document.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    $('refresh').addEventListener('click',load);
    load();
})();
