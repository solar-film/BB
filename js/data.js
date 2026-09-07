// Data loading, CSV parsing source mapping, and mock fallback data.
function generateMockData() {
    return [{ 
        id: 'mock-1', week: 'Week 1', dateRange: '1-7 ม.ค. 2026',
        salesTargetTotal: 2800000, salesActualTotal: 2920000,
        gfs: { target: 1500000, actual: 1650000 }, mhl: { target: 800000, actual: 750000 }, car: { target: 500000, actual: 520000 }, 
        marketing: { gfs: { target: 20000, actual: 18000, google: 10000, fb: 8000 }, mhl: { target: 10000, actual: 11000, google: 5000, fb: 6000 }, car: { target: 5000, actual: 4800, google: 2000, fb: 2800 } }, 
        admin: { contacts: { total: 153, gfs: { line: 44, fb: 24, tel: 22 }, mhl: { line: 36, fb: 5, tel: 22 }, car: 50 }, leads: { target: 60, actual: 45, gfs: { line: 27, tel: 1, fb: 5 }, mhl: { line: 12, tel: 0, fb: 0 }, car: 15 }, sales: { totalSales: 274174, totalInstalls: 14, newSales: { gfs: 894675, mhl: 855899 }, oldSales: { gfs: 877600, mhl: 846000 }, newInstalls: { gfs: 12, mhl: 6 }, oldInstalls: { gfs: 1, mhl: 1 } } },
        tech: { installs: { target: 50, actual: 45, gfs: 30, mhl: 15 }, area: { target: 15000, actual: 14200, gfs: 9000, mhl: 5200 }, teams: 5, damage: { totalValue: 4500, byTech: 3000, byFilm: 1500, claims: 2, filmArea: 120 } },
        carDetail: { sales: { target: 500000, actual: 520000 }, installs: { line: 10, fb: 15, tel: 5, walkin: 2, showroom: 8, other: 1 }, contacts: { total: 80, tel: 20, line: 30, fb: 30 }, tech: { claims: 2, filmIssueCount: 1, filmIssueValue: 1000, techIssueCount: 2, techIssueValue: 2000, damagePercent: 0.4, teamSize: 3 } },
        buildingSales: { 
            totalRepSales: 15200000, totalProjSales: 8400000, totalAdminSales: 5321763,
            bom: {ytd:1000000, meets:5, installs:3, sales:100000, newMeets:3, newInstalls:2, newSales:60000, oldMeets:2, oldInstalls:1, oldSales:40000, noInstalls:2, noInstallSales:10000, sr:60}, 
            jay: {ytd:1000000, meets:5, installs:3, sales:100000, newMeets:3, newInstalls:2, newSales:60000, oldMeets:2, oldInstalls:1, oldSales:40000, noInstalls:2, noInstallSales:10000, sr:60}, 
            saifha: {ytd:1000000, meets:5, installs:3, sales:100000, newMeets:3, newInstalls:2, newSales:60000, oldMeets:2, oldInstalls:1, oldSales:40000, noInstalls:2, noInstallSales:10000, sr:60}, 
            kat: {ytd:1000000, meets:5, installs:3, sales:100000, newMeets:3, newInstalls:2, newSales:60000, oldMeets:2, oldInstalls:1, oldSales:40000, noInstalls:2, noInstallSales:10000, sr:60},
            image: {ytd:1000000, meets:5, installs:3, sales:100000, newMeets:3, newInstalls:2, newSales:60000, oldMeets:2, oldInstalls:1, oldSales:40000, noInstalls:2, noInstallSales:10000, sr:60},
            tung: {ytd:1000000, meets:5, installs:3, sales:100000, newMeets:3, newInstalls:2, newSales:60000, oldMeets:2, oldInstalls:1, oldSales:40000, noInstalls:2, noInstallSales:10000, sr:60},
            projYa: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5},
            projTung: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5},
            projTukta: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5},
            projMoos: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5}
        }
    }];
}

// Locate the sales-team blocks by their labels rather than fixed row numbers.
// The source sheet is maintained manually, so inserting a representative must
// not redirect every later metric to an unrelated row.
function normalizedSourceText(value) {
    return String(value || '').trim().toLocaleLowerCase('en-US');
}

function sourceMetricHas(row, ...parts) {
    const metric = normalizedSourceText(row?.[2]);
    return parts.every(part => metric.includes(normalizedSourceText(part)));
}

function findRowInSourceBlock(parsed, start, length, ...parts) {
    const end = Math.min(parsed.length, start + length);
    for (let index = start; index < end; index++) {
        if (sourceMetricHas(parsed[index], ...parts)) return index;
    }
    return -1;
}

function findPersonSourceBlock(parsed, name, type) {
    const wantedName = normalizedSourceText(name);
    for (let index = 0; index < parsed.length; index++) {
        const row = parsed[index];
        const isNamedYtd = sourceMetricHas(row, 'ยอดขายสะสม') && [row?.[0], row?.[1]]
            .some(value => normalizedSourceText(value) === wantedName);
        if (!isNamedYtd) continue;

        const hasNoInstallMetric = findRowInSourceBlock(parsed, index, 16, 'จำนวนไม่ติดตั้ง') >= 0;
        const hasProjectTarget = findRowInSourceBlock(parsed, index, 12, 'เป้าพบลูกค้า') >= 0;
        if ((type === 'rep' && hasNoInstallMetric) || (type === 'project' && hasProjectTarget && !hasNoInstallMetric)) {
            return index;
        }
    }
    return -1;
}

function mapSalesRepSourceBlock(parsed, name) {
    const start = findPersonSourceBlock(parsed, name, 'rep');
    if (start < 0) return {};
    return {
        ytd: start,
        meets: findRowInSourceBlock(parsed, start, 16, 'จำนวนพบลูกค้า', 'รายสัปดาห์'),
        installs: findRowInSourceBlock(parsed, start, 16, 'จำนวนติดตั้ง', 'รายสัปดาห์'),
        sales: findRowInSourceBlock(parsed, start, 16, 'ยอดขายรวม', 'รายสัปดาห์'),
        newMeets: findRowInSourceBlock(parsed, start, 16, 'จำนวนพบ', 'ลค.ใหม่'),
        newInstalls: findRowInSourceBlock(parsed, start, 16, 'จำนวนติดตั้ง', 'ลค.ใหม่'),
        newSales: findRowInSourceBlock(parsed, start, 16, 'ยอดขาย', 'ลค.ใหม่'),
        oldMeets: findRowInSourceBlock(parsed, start, 16, 'จำนวนพบ', 'ลค.เก่า'),
        oldInstalls: findRowInSourceBlock(parsed, start, 16, 'จำนวนติดตั้ง', 'ลค.เก่า'),
        oldSales: findRowInSourceBlock(parsed, start, 16, 'ยอดขาย', 'ลค.เก่า'),
        noInstalls: findRowInSourceBlock(parsed, start, 16, 'จำนวนไม่ติดตั้ง'),
        noInstallSales: findRowInSourceBlock(parsed, start, 16, 'ยอดที่ไม่ติดตั้ง'),
        sr: findRowInSourceBlock(parsed, start, 16, 'ความสำเร็จเทียบกับพบลูกค้า')
    };
}

function mapProjectSourceBlock(parsed, name) {
    const start = findPersonSourceBlock(parsed, name, 'project');
    if (start < 0) return {};
    return {
        ytd: start,
        sales: findRowInSourceBlock(parsed, start, 12, 'ยอดขายรวม', 'รายสัปดาห์'),
        installs: findRowInSourceBlock(parsed, start, 12, 'จำนวนงานติดตั้ง', 'รายสัปดาห์'),
        targetMeets: findRowInSourceBlock(parsed, start, 12, 'เป้าพบลูกค้า'),
        meets: findRowInSourceBlock(parsed, start, 12, 'จำนวนพบลูกค้า', 'รายสัปดาห์'),
        newMeets: findRowInSourceBlock(parsed, start, 12, 'จำนวนพบ', 'ลค.ใหม่'),
        oldMeets: findRowInSourceBlock(parsed, start, 12, 'จำนวนพบ', 'ลค.เก่า')
    };
}

function findSourceSection(parsed, ...parts) {
    return parsed.findIndex(row => sourceMetricHas(row, ...parts));
}

function mapBuildingSourceRows(parsed) {
    const techStart = findSourceSection(parsed, 'ทีมช่างอาคาร');
    const carStart = parsed.findIndex(row => normalizedSourceText(row?.[0]) === 'ฟิล์มรถยนต์' && sourceMetricHas(row, 'ฝ่ายขาย'));
    const inTech = (...parts) => techStart < 0 ? -1 : findRowInSourceBlock(parsed, techStart, 36, ...parts);
    const inCar = (...parts) => carStart < 0 ? -1 : findRowInSourceBlock(parsed, carStart, 34, ...parts);

    return {
        reps: Object.fromEntries(['BOM', 'Jay', 'Saifha', 'Kat', 'Image', 'Tung']
            .map(name => [name.toLocaleLowerCase('en-US'), mapSalesRepSourceBlock(parsed, name)])),
        projects: Object.fromEntries(['YA', 'Tung', 'Tukta', 'Moos']
            .map(name => [`proj${name === 'YA' ? 'Ya' : name}`, mapProjectSourceBlock(parsed, name)])),
        tech: {
            installsTarget: inTech('เป้างานติดตั้ง', 'รายสัปดาห์'),
            installsActual: techStart < 0 ? -1 : findRowInSourceBlock(parsed, techStart + 8, 6, 'จำนวนงานติดตั้ง'),
            installsGfs: inTech('goodfilm'),
            installsMhl: inTech('maholan'),
            installsYtd: inTech('จำนวนงานติดตั้งสะสม'),
            areaTarget: inTech('เป้าพื้นที่ติดตั้ง', 'รายสัปดาห์'),
            areaActual: techStart < 0 ? -1 : findRowInSourceBlock(parsed, techStart + 15, 5, 'พื้นที่ติดตั้ง', 'หน้ากระจก'),
            areaGfs: techStart < 0 ? -1 : findRowInSourceBlock(parsed, techStart + 15, 8, 'goodfilm'),
            areaMhl: techStart < 0 ? -1 : findRowInSourceBlock(parsed, techStart + 15, 8, 'maholan'),
            areaYtd: inTech('พื้นที่ติดตั้งสะสม'),
            teams: inTech('จำนวนทีมช่าง'),
            damageTotal: inTech('มูลค่าความเสียหาย', 'บาท'),
            damageYtd: inTech('มูลค่าความเสียหายสะสม'),
            damageByTech: inTech('ความเสียหายที่เกิดจากช่าง'),
            damageByFilm: inTech('ความเสียหายจากฟิล์ม'),
            damageClaims: inTech('จำนวนงานเคลม'),
            damageFilmArea: inTech('ปริมาณฟิล์มที่เสียหาย')
        },
        car: {
            salesTarget: inCar('เป้ายอดขาย', 'รายสัปดาห์'),
            salesActual: inCar('ยอดขายรายสัปดาห์'),
            installsTotal: inCar('ปริมาณรถติดตั้งใหม่'),
            installsLine: inCar('line'),
            installsFb: inCar('facebook'),
            installsTel: inCar('โทรศัพท์'),
            installsWalkin: inCar('walk-in'),
            installsShowroom: inCar('showroom'),
            installsOther: inCar('ช่องทางอื่น'),
            contactsTotal: inCar('ปริมาณการติดต่อรวม'),
            contactsTel: inCar('จำนวนสายโทรเข้า'),
            contactsLine: inCar('ติดต่อ line'),
            contactsFb: inCar('ติดต่อ fb'),
            claims: inCar('จำนวนรถเคลม'),
            filmIssueCount: inCar('จำนวน จากปัญหาฟิล์ม'),
            filmIssueValue: inCar('มูลค่าความเสียหาย จากฟิล์ม'),
            techIssueCount: inCar('จำนวนจากงานติดตั้งช่าง'),
            techIssueValue: inCar('มูลค่าความเสียหาย จากช่าง'),
            damagePercent: inCar('เทียบกับยอดขาย', 'ช่าง'),
            teamSize: inCar('จำนวนช่างติดตั้ง')
        }
    };
}

function mappedNumber(parsed, rowMap, key, column, fallbackRow) {
    const mappedRow = rowMap?.[key];
    const sourceRow = Number.isInteger(mappedRow) && mappedRow >= 0 ? mappedRow : fallbackRow;
    return cleanNumber(parsed[sourceRow]?.[column]);
}

async function loadData() {
    document.getElementById('loading-view').classList.remove('hidden');
    isUsingMock = false; errorMessage = null; feedbackErrorMessage = null;
    // Expenses load independently: source failure must never replace sales data.
    if (typeof BBExpenseData !== 'undefined') BBExpenseData.load().then(() => {
        if (currentPage === 'monthly') updateDashboardUI();
    });
    try {
        const sheetId = '12BRnIWVT227cltrdeukIAOIEJ_qrL3OH0Aw6a7gIDIo';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=702501167`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Cannot fetch data');
        const csvText = await response.text();
        const parsed = parseCSV(csvText);
        const buildingSourceRows = mapBuildingSourceRows(parsed);
        const rowBasedWeeksData = parseRowBasedWeeklyData(parsed);
        if (rowBasedWeeksData.length > 0) {
            dashboardData = rowBasedWeeksData;
            selectedId = pickLatestAvailableWeekId(rowBasedWeeksData);
            loadFeedbackData().then(() => {
                if (currentPage === 'feedback') updateDashboardUI();
            });
            return;
        }

        const weeksData = [];
        if (!parsed[1]) throw new Error('Missing week header row');

        for (let i = 4; i < parsed[1].length; i++) {
            const weekName = parsed[1][i]?.trim();
            if (!weekName || (!weekName.toLowerCase().includes('week') && !weekName.toLowerCase().match(/^w\d/))) continue;

            const gfsMkGoogleVal = cleanNumber(parsed[44]?.[i]);
            const gfsMkFbVal = cleanNumber(parsed[50]?.[i]);
            const mhlMkGoogleVal = cleanNumber(parsed[63]?.[i]);
            const mhlMkFbVal = cleanNumber(parsed[69]?.[i]);
            const carMkGoogleVal = cleanNumber(parsed[82]?.[i]);
            const carMkFbVal = cleanNumber(parsed[83]?.[i]);

            const salesRep = (key, fallback) => {
                const rows = buildingSourceRows.reps[key];
                const value = field => mappedNumber(parsed, rows, field, i, fallback[field]);
                return normalizeSalesRepData({
                    ytd: value('ytd'), meets: value('meets'), installs: value('installs'), sales: value('sales'),
                    newMeets: value('newMeets'), newInstalls: value('newInstalls'), newSales: value('newSales'),
                    oldMeets: value('oldMeets'), oldInstalls: value('oldInstalls'), oldSales: value('oldSales'),
                    noInstalls: value('noInstalls'), noInstallSales: value('noInstallSales'), sr: value('sr')
                });
            };
            const project = (key, fallback) => {
                const rows = buildingSourceRows.projects[key];
                const value = field => mappedNumber(parsed, rows, field, i, fallback[field]);
                return {
                    ytd: value('ytd'), sales: value('sales'), installs: value('installs'), targetMeets: value('targetMeets'),
                    meets: value('meets'), newMeets: value('newMeets'), oldMeets: value('oldMeets')
                };
            };

            const bom = salesRep('bom', { ytd: 172, meets: 173, installs: 174, sales: 175, newMeets: 177, newInstalls: 178, newSales: 179, oldMeets: 181, oldInstalls: 182, oldSales: 183, noInstalls: 185, noInstallSales: 186, sr: 188 });
            const jay = salesRep('jay', { ytd: 192, meets: 193, installs: 194, sales: 195, newMeets: 197, newInstalls: 198, newSales: 199, oldMeets: 201, oldInstalls: 202, oldSales: 203, noInstalls: 205, noInstallSales: 206, sr: 208 });
            const saifha = salesRep('saifha', { ytd: 228, meets: 229, installs: 230, sales: 231, newMeets: 233, newInstalls: 234, newSales: 235, oldMeets: 237, oldInstalls: 238, oldSales: 239, noInstalls: 241, noInstallSales: 242, sr: 244 });
            const kat = salesRep('kat', { ytd: 248, meets: 249, installs: 250, sales: 251, newMeets: 253, newInstalls: 254, newSales: 255, oldMeets: 257, oldInstalls: 258, oldSales: 259, noInstalls: 261, noInstallSales: 262, sr: 264 });
            const image = salesRep('image', { ytd: 268, meets: 269, installs: 270, sales: 271, newMeets: 273, newInstalls: 274, newSales: 275, oldMeets: 277, oldInstalls: 278, oldSales: 279, noInstalls: 281, noInstallSales: 282, sr: 284 });
            const tung = salesRep('tung', { ytd: 288, meets: 289, installs: 290, sales: 291, newMeets: 293, newInstalls: 294, newSales: 295, oldMeets: 297, oldInstalls: 298, oldSales: 299, noInstalls: 301, noInstallSales: 302, sr: 304 });
            const projYa = project('projYa', { ytd: 309, sales: 310, installs: 311, targetMeets: 314, meets: 315, newMeets: 316, oldMeets: 317 });
            const projTung = project('projTung', { ytd: 322, sales: 323, installs: 324, targetMeets: 327, meets: 328, newMeets: 329, oldMeets: 330 });
            const projTukta = project('projTukta', { ytd: 335, sales: 336, installs: 337, targetMeets: 340, meets: 341, newMeets: 342, oldMeets: 343 });
            const projMoos = project('projMoos', { ytd: 348, sales: 349, installs: 350, targetMeets: 353, meets: 354, newMeets: 355, oldMeets: 356 });

            weeksData.push({
                id: `col-${i}`, week: weekName, dateRange: parsed[2][i]?.trim() || '-',
                salesTargetTotal: cleanNumber(parsed[7]?.[i]),
                salesActualTotal: cleanNumber(parsed[8]?.[i]),
                gfs: { target: cleanNumber(parsed[12]?.[i]), actual: cleanNumber(parsed[13]?.[i]) },
                mhl: { target: cleanNumber(parsed[18]?.[i]), actual: cleanNumber(parsed[19]?.[i]) },
                car: { target: cleanNumber(parsed[24]?.[i]), actual: cleanNumber(parsed[25]?.[i]) },
                marketing: {
                    gfs: { target: cleanNumber(parsed[37]?.[i]), actual: cleanNumber(parsed[44]?.[i]) + cleanNumber(parsed[50]?.[i]), google: gfsMkGoogleVal, fb: gfsMkFbVal },
                    mhl: { target: cleanNumber(parsed[56]?.[i]), actual: cleanNumber(parsed[63]?.[i]) + cleanNumber(parsed[69]?.[i]), google: mhlMkGoogleVal, fb: mhlMkFbVal },
                    car: { target: cleanNumber(parsed[75]?.[i]), actual: cleanNumber(parsed[82]?.[i]) + cleanNumber(parsed[83]?.[i]), google: carMkGoogleVal, fb: carMkFbVal }
                },
                admin: {
                    contacts: { total: cleanNumber(parsed[112]?.[i]), gfs: { line: cleanNumber(parsed[115]?.[i]), fb: cleanNumber(parsed[116]?.[i]), tel: cleanNumber(parsed[117]?.[i]) }, mhl: { line: cleanNumber(parsed[120]?.[i]), fb: cleanNumber(parsed[121]?.[i]), tel: cleanNumber(parsed[122]?.[i]) }, car: cleanNumber(parsed[384]?.[i]) },
                    leads: { target: cleanNumber(parsed[125]?.[i]), actual: cleanNumber(parsed[126]?.[i]), gfs: { line: cleanNumber(parsed[129]?.[i]), tel: cleanNumber(parsed[130]?.[i]), fb: cleanNumber(parsed[131]?.[i]) }, mhl: { line: cleanNumber(parsed[134]?.[i]), tel: cleanNumber(parsed[135]?.[i]), fb: cleanNumber(parsed[136]?.[i]) }, car: cleanNumber(parsed[386]?.[i]) },
                    sales: { totalInstalls: cleanNumber(parsed[156]?.[i]), newInstalls: { gfs: cleanNumber(parsed[159]?.[i]), mhl: cleanNumber(parsed[160]?.[i]) }, oldInstalls: { gfs: cleanNumber(parsed[163]?.[i]), mhl: cleanNumber(parsed[164]?.[i]) }, totalSales: cleanNumber(parsed[146]?.[i]), newSales: { gfs: cleanNumber(parsed[149]?.[i]), mhl: cleanNumber(parsed[150]?.[i]) }, oldSales: { gfs: cleanNumber(parsed[153]?.[i]), mhl: cleanNumber(parsed[154]?.[i]) } }
                },
                tech: {
                    installs: { 
                        target: mappedNumber(parsed, buildingSourceRows.tech, 'installsTarget', i, 370),
                        actual: mappedNumber(parsed, buildingSourceRows.tech, 'installsActual', i, 371),
                        gfs: mappedNumber(parsed, buildingSourceRows.tech, 'installsGfs', i, 372),
                        mhl: mappedNumber(parsed, buildingSourceRows.tech, 'installsMhl', i, 373),
                        ytd: mappedNumber(parsed, buildingSourceRows.tech, 'installsYtd', i, 363)
                    },
                    area: { 
                        target: mappedNumber(parsed, buildingSourceRows.tech, 'areaTarget', i, 376),
                        actual: mappedNumber(parsed, buildingSourceRows.tech, 'areaActual', i, 377),
                        gfs: mappedNumber(parsed, buildingSourceRows.tech, 'areaGfs', i, 378),
                        mhl: mappedNumber(parsed, buildingSourceRows.tech, 'areaMhl', i, 379),
                        ytd: mappedNumber(parsed, buildingSourceRows.tech, 'areaYtd', i, 367)
                    },
                    teams: mappedNumber(parsed, buildingSourceRows.tech, 'teams', i, 382),
                    damage: { 
                        totalValue: mappedNumber(parsed, buildingSourceRows.tech, 'damageTotal', i, 388) || (mappedNumber(parsed, buildingSourceRows.tech, 'damageByTech', i, 389) + mappedNumber(parsed, buildingSourceRows.tech, 'damageByFilm', i, 390)),
                        ytd: mappedNumber(parsed, buildingSourceRows.tech, 'damageYtd', i, 387),
                        byTech: mappedNumber(parsed, buildingSourceRows.tech, 'damageByTech', i, 389),
                        byFilm: mappedNumber(parsed, buildingSourceRows.tech, 'damageByFilm', i, 390),
                        claims: mappedNumber(parsed, buildingSourceRows.tech, 'damageClaims', i, 393),
                        filmArea: mappedNumber(parsed, buildingSourceRows.tech, 'damageFilmArea', i, 394)
                    }
                },
                carDetail: {
                    sales: { target: mappedNumber(parsed, buildingSourceRows.car, 'salesTarget', i, 402), actual: mappedNumber(parsed, buildingSourceRows.car, 'salesActual', i, 403) },
                    installs: { total: mappedNumber(parsed, buildingSourceRows.car, 'installsTotal', i, 406), line: mappedNumber(parsed, buildingSourceRows.car, 'installsLine', i, 407), fb: mappedNumber(parsed, buildingSourceRows.car, 'installsFb', i, 408), tel: mappedNumber(parsed, buildingSourceRows.car, 'installsTel', i, 409), walkin: mappedNumber(parsed, buildingSourceRows.car, 'installsWalkin', i, 410), showroom: mappedNumber(parsed, buildingSourceRows.car, 'installsShowroom', i, 411), other: mappedNumber(parsed, buildingSourceRows.car, 'installsOther', i, 412) },
                    contacts: { total: mappedNumber(parsed, buildingSourceRows.car, 'contactsTotal', i, 417), tel: mappedNumber(parsed, buildingSourceRows.car, 'contactsTel', i, 418), line: mappedNumber(parsed, buildingSourceRows.car, 'contactsLine', i, 419), fb: mappedNumber(parsed, buildingSourceRows.car, 'contactsFb', i, 420) },
                    tech: { 
                        claims: mappedNumber(parsed, buildingSourceRows.car, 'claims', i, 423),
                        filmIssueCount: mappedNumber(parsed, buildingSourceRows.car, 'filmIssueCount', i, 425),
                        filmIssueValue: mappedNumber(parsed, buildingSourceRows.car, 'filmIssueValue', i, 426),
                        techIssueCount: mappedNumber(parsed, buildingSourceRows.car, 'techIssueCount', i, 428),
                        techIssueValue: mappedNumber(parsed, buildingSourceRows.car, 'techIssueValue', i, 429),
                        damagePercent: mappedNumber(parsed, buildingSourceRows.car, 'damagePercent', i, 430),
                        teamSize: mappedNumber(parsed, buildingSourceRows.car, 'teamSize', i, 432)
                    }
                },
                buildingSales: {
                    // Totals intentionally reconcile only people that remain visible.
                    totalRepSales: [bom, jay, saifha, kat, image, tung].reduce((sum, rep) => sum + rep.sales, 0),
                    totalProjSales: [projYa, projTukta].reduce((sum, member) => sum + member.sales, 0),
                    totalAdminSales: cleanNumber(parsed[170]?.[i]), // Row 171
                    bom, jay, saifha, kat, image, tung,
                    // Kept in the data model to preserve the source, but excluded from all display rosters.
                    projYa, projTung, projTukta, projMoos
                }
            });
        }
        if (weeksData.length === 0) throw new Error('No weekly data found');

        dashboardData = weeksData;
        let lastValid = weeksData[0].id;
        for (let i = weeksData.length - 1; i >= 0; i--) { 
            if (getTotalSalesActual(weeksData[i]) > 0) { 
                lastValid = weeksData[i].id; break; 
            } 
        }
        selectedId = lastValid;

        loadFeedbackData().then(() => {
            if (currentPage === 'feedback') updateDashboardUI();
        });

    } catch (err) {
        errorMessage = err.message; isUsingMock = true; 
        dashboardData = generateMockData();
        selectedId = dashboardData[0].id;
    } finally {
        document.getElementById('loading-view').classList.add('hidden');
        updateDashboardUI();
    }
}

async function loadFeedbackData() {
    try {
        // Fetch Feedback Data
        const fbUrl = `https://docs.google.com/spreadsheets/d/1HaOmTLOl1YaaEIf_9WatknaAwIJGI8AZI1H-QO7CvHM/gviz/tq?tqx=out:csv&sheet=Feedback`;
        const fbRes = await fetch(fbUrl);
        if (!fbRes.ok) throw new Error('Cannot fetch feedback data');
        const fbCsv = await fbRes.text();
        const parsedFb = parseCSV(fbCsv);
        feedbackData = parsedFb.slice(1).map(row => ({
            customerName: row[2] || '',    // Col C
            company: row[3] || '',         // Col D
            phone: row[4] || '',           // Col E
            address: row[7] || '',         // Col H
            installDate: row[9] || '',     // Col J
            salesName: row[12] || '',      // Col M (ฝ่ายขาย)
            week: row[34] || '',           // Col AI
            surveyDate: row[35] || '',     // Col AJ
            salesComments: row[36] || '',  // Col AK (คำติชม ฝ่ายขาย)
            salesFeedback: row[37] || '',  // Col AL (Feedback ฝ่ายขาย)
            techComments: row[38] || '',   // Col AM (คำติชม ทีมช่าง)
            techFeedback: row[39] || '',   // Col AN (Feedback ทีมช่าง)
            suggestions: row[40] || '',    // Col AO (ข้อแนะนำอื่นๆ)
            technicians: row[41] || ''     // Col AP (รายชื่อช่าง)
        })).filter(item =>
            // กรองแสดงเฉพาะรายการที่มีข้อมูลในคอลัมน์ AK ถึง AO เท่านั้น
            (item.salesComments && item.salesComments.trim() !== '') ||
            (item.salesFeedback && item.salesFeedback.trim() !== '') ||
            (item.techComments && item.techComments.trim() !== '') ||
            (item.techFeedback && item.techFeedback.trim() !== '') ||
            (item.suggestions && item.suggestions.trim() !== '')
        );
        feedbackErrorMessage = null;
    } catch (fbErr) {
        feedbackData = [];
        feedbackErrorMessage = fbErr.message;
    }
}

function parseRowBasedWeeklyData(parsed) {
    return parsed
        .filter(row => /^week\s*\d/i.test((row[0] || '').trim()))
        .map((row, index) => {
            const weekName = (row[0] || '').trim();
            const dateRange = (row[1] || '').trim() || '-';
            const endDate = parseThaiDateEnd(dateRange);
            const startDate = parseThaiDateStart(dateRange);
            const isAvailable = endDate ? endDate <= startOfToday() : (!startDate || startDate <= startOfToday());

            const totalMarketing = cleanNumber(row[3]);
            const gfsMarketing = cleanNumber(row[4]);
            const mhlMarketing = cleanNumber(row[5]);
            const carMarketing = cleanNumber(row[6]);
            const installTarget = cleanNumber(row[7]);
            const areaTarget = cleanNumber(row[8]);
            const totalTarget = cleanNumber(row[9]);
            const buildingTarget = cleanNumber(row[10]);
            const gfsTarget = cleanNumber(row[11]);
            const mhlTarget = cleanNumber(row[12]);
            const carTarget = cleanNumber(row[13]);
            const jaySales = cleanNumber(row[14]);
            const bomSales = cleanNumber(row[15]);
            const yaSales = cleanNumber(row[16]);
            const saifhaSales = cleanNumber(row[17]);
            const katSales = cleanNumber(row[18]);
            const imageSales = cleanNumber(row[19]);
            const gfsActual = isAvailable ? gfsTarget : 0;
            const mhlActual = isAvailable ? mhlTarget : 0;
            const carActual = isAvailable ? carTarget : 0;
            const repActual = (value) => isAvailable ? value : 0;

            return {
                id: `row-${index}`,
                week: weekName,
                dateRange,
                salesTargetTotal: totalTarget,
                salesActualTotal: gfsActual + mhlActual + carActual,
                gfs: { target: gfsTarget, actual: gfsActual },
                mhl: { target: mhlTarget, actual: mhlActual },
                car: { target: carTarget, actual: carActual },
                marketing: {
                    gfs: { target: gfsMarketing, actual: isAvailable ? gfsMarketing : 0, google: isAvailable ? gfsMarketing : 0, fb: 0 },
                    mhl: { target: mhlMarketing, actual: isAvailable ? mhlMarketing : 0, google: isAvailable ? mhlMarketing : 0, fb: 0 },
                    car: { target: carMarketing, actual: isAvailable ? carMarketing : 0, google: isAvailable ? carMarketing : 0, fb: 0 }
                },
                admin: {
                    contacts: { total: 0, gfs: { line: 0, fb: 0, tel: 0 }, mhl: { line: 0, fb: 0, tel: 0 }, car: 0 },
                    leads: { target: 0, actual: 0, gfs: { line: 0, tel: 0, fb: 0 }, mhl: { line: 0, tel: 0, fb: 0 }, car: 0 },
                    sales: { totalInstalls: 0, newInstalls: { gfs: 0, mhl: 0 }, oldInstalls: { gfs: 0, mhl: 0 }, totalSales: 0, newSales: { gfs: 0, mhl: 0 }, oldSales: { gfs: 0, mhl: 0 } }
                },
                tech: {
                    installs: { target: installTarget, actual: isAvailable ? installTarget : 0, gfs: isAvailable ? Math.round(installTarget * 0.6) : 0, mhl: isAvailable ? Math.round(installTarget * 0.4) : 0 },
                    area: { target: areaTarget, actual: isAvailable ? areaTarget : 0, gfs: isAvailable ? Math.round(areaTarget * 0.6) : 0, mhl: isAvailable ? Math.round(areaTarget * 0.4) : 0 },
                    teams: 0,
                    damage: { totalValue: 0, byTech: 0, byFilm: 0, claims: 0, filmArea: 0 }
                },
                carDetail: {
                    sales: { target: carTarget, actual: carActual },
                    installs: { line: 0, fb: 0, tel: 0, walkin: 0, showroom: 0, other: 0 },
                    contacts: { total: 0, tel: 0, line: 0, fb: 0 },
                    tech: { claims: 0, filmIssueCount: 0, filmIssueValue: 0, techIssueCount: 0, techIssueValue: 0, damagePercent: 0, teamSize: 0 }
                },
                buildingSales: {
                    totalRepSales: repActual(jaySales + bomSales + saifhaSales + katSales + imageSales),
                    totalProjSales: repActual(yaSales),
                    totalAdminSales: 0,
                    bom: normalizeSalesRepData({ ytd: 0, meets: 0, installs: 0, sales: repActual(bomSales), newMeets: 0, newInstalls: 0, newSales: repActual(bomSales), oldMeets: 0, oldInstalls: 0, oldSales: 0, noInstalls: 0, noInstallSales: 0 }),
                    jay: normalizeSalesRepData({ ytd: 0, meets: 0, installs: 0, sales: repActual(jaySales), newMeets: 0, newInstalls: 0, newSales: repActual(jaySales), oldMeets: 0, oldInstalls: 0, oldSales: 0, noInstalls: 0, noInstallSales: 0 }),
                    saifha: normalizeSalesRepData({ ytd: 0, meets: 0, installs: 0, sales: repActual(saifhaSales), newMeets: 0, newInstalls: 0, newSales: repActual(saifhaSales), oldMeets: 0, oldInstalls: 0, oldSales: 0, noInstalls: 0, noInstallSales: 0 }),
                    kat: normalizeSalesRepData({ ytd: 0, meets: 0, installs: 0, sales: repActual(katSales), newMeets: 0, newInstalls: 0, newSales: repActual(katSales), oldMeets: 0, oldInstalls: 0, oldSales: 0, noInstalls: 0, noInstallSales: 0 }),
                    image: normalizeSalesRepData({ ytd: 0, meets: 0, installs: 0, sales: repActual(imageSales), newMeets: 0, newInstalls: 0, newSales: repActual(imageSales), oldMeets: 0, oldInstalls: 0, oldSales: 0, noInstalls: 0, noInstallSales: 0 }),
                    tung: normalizeSalesRepData({ ytd: 0, meets: 0, installs: 0, sales: 0, newMeets: 0, newInstalls: 0, newSales: 0, oldMeets: 0, oldInstalls: 0, oldSales: 0, noInstalls: 0, noInstallSales: 0 }),
                    projYa: { ytd: 0, sales: repActual(yaSales), installs: 0, targetMeets: 0, meets: 0, newMeets: 0, oldMeets: 0 },
                    projTung: { ytd: 0, sales: 0, installs: 0, targetMeets: 0, meets: 0, newMeets: 0, oldMeets: 0 },
                    projTukta: { ytd: 0, sales: 0, installs: 0, targetMeets: 0, meets: 0, newMeets: 0, oldMeets: 0 },
                    projMoos: { ytd: 0, sales: 0, installs: 0, targetMeets: 0, meets: 0, newMeets: 0, oldMeets: 0 }
                },
                sourceMode: 'row-weekly-plan',
                totalTarget
            };
        });
}

function pickLatestAvailableWeekId(weeksData) {
    for (let i = weeksData.length - 1; i >= 0; i--) {
        if (getTotalSalesActual(weeksData[i]) > 0) {
            return weeksData[i].id;
        }
    }
    return weeksData[0]?.id || '';
}

function startOfToday() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseThaiDateStart(dateRange) {
    return parseThaiDatePart(dateRange, 'start');
}

function parseThaiDateEnd(dateRange) {
    return parseThaiDatePart(dateRange, 'end');
}

function parseThaiDatePart(dateRange, part = 'start') {
    const months = {
        'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
        'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
        'ม.ค': 0, 'ก.พ': 1, 'มี.ค': 2, 'เม.ย': 3, 'พ.ค': 4, 'มิ.ย': 5,
        'ก.ค': 6, 'ส.ค': 7, 'ก.ย': 8, 'ต.ค': 9, 'พ.ย': 10, 'ธ.ค': 11
    };
    const matches = [...String(dateRange).matchAll(/(\d{1,2})\s*([^\s–-]*)/g)]
        .filter(match => match[1])
        .map(match => ({
            day: Number(match[1]),
            month: match[2].replace(/[^\u0E00-\u0E7F.]/g, '')
        }));

    if (matches.length === 0) return null;
    const selected = part === 'end' ? matches[matches.length - 1] : matches[0];
    let monthName = selected.month;

    if (!monthName && part === 'end') {
        const previousWithMonth = [...matches].reverse().find(item => item.month);
        monthName = previousWithMonth?.month || '';
    }
    if (months[monthName] === undefined) return null;
    return new Date(2026, months[monthName], selected.day);
}
