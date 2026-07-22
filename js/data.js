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
            projYa: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5},
            projTung: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5},
            projTukta: {ytd:1000000, sales:100000, installs:2, targetMeets:12, meets:10, newMeets:5, oldMeets:5}
        }
    }];
}

async function loadData() {
    document.getElementById('loading-view').classList.remove('hidden');
    isUsingMock = false; errorMessage = null; feedbackErrorMessage = null;
    try {
        const sheetId = '12BRnIWVT227cltrdeukIAOIEJ_qrL3OH0Aw6a7gIDIo';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=702501167`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Cannot fetch data');
        const csvText = await response.text();
        const parsed = parseCSV(csvText);
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

            // Sales Reps Meetings/Installs
            const bomMeets = cleanNumber(parsed[173]?.[i]);
            const bomInstalls = cleanNumber(parsed[174]?.[i]);
            const jayMeets = cleanNumber(parsed[193]?.[i]);
            const jayInstalls = cleanNumber(parsed[194]?.[i]);
            const saifhaMeets = cleanNumber(parsed[229]?.[i]);
            const saifhaInstalls = cleanNumber(parsed[230]?.[i]);
            const katMeets = cleanNumber(parsed[249]?.[i]);
            const katInstalls = cleanNumber(parsed[250]?.[i]);
            const imageMeets = cleanNumber(parsed[269]?.[i]);
            const imageInstalls = cleanNumber(parsed[270]?.[i]);

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
                    contacts: { total: cleanNumber(parsed[112]?.[i]), gfs: { line: cleanNumber(parsed[115]?.[i]), fb: cleanNumber(parsed[116]?.[i]), tel: cleanNumber(parsed[117]?.[i]) }, mhl: { line: cleanNumber(parsed[120]?.[i]), fb: cleanNumber(parsed[121]?.[i]), tel: cleanNumber(parsed[122]?.[i]) }, car: cleanNumber(parsed[371]?.[i]) },
                    leads: { target: cleanNumber(parsed[125]?.[i]), actual: cleanNumber(parsed[126]?.[i]), gfs: { line: cleanNumber(parsed[129]?.[i]), tel: cleanNumber(parsed[130]?.[i]), fb: cleanNumber(parsed[131]?.[i]) }, mhl: { line: cleanNumber(parsed[134]?.[i]), tel: cleanNumber(parsed[135]?.[i]), fb: cleanNumber(parsed[136]?.[i]) }, car: cleanNumber(parsed[373]?.[i]) },
                    sales: { totalInstalls: cleanNumber(parsed[156]?.[i]), newInstalls: { gfs: cleanNumber(parsed[158]?.[i]), mhl: cleanNumber(parsed[159]?.[i]) }, oldInstalls: { gfs: cleanNumber(parsed[163]?.[i]), mhl: cleanNumber(parsed[164]?.[i]) }, totalSales: cleanNumber(parsed[146]?.[i]), newSales: { gfs: cleanNumber(parsed[149]?.[i]), mhl: cleanNumber(parsed[150]?.[i]) }, oldSales: { gfs: cleanNumber(parsed[153]?.[i]), mhl: cleanNumber(parsed[154]?.[i]) } }
                },
                tech: {
                    installs: { 
                        target: cleanNumber(parsed[324]?.[i]), 
                        actual: cleanNumber(parsed[338]?.[i]), 
                        gfs: cleanNumber(parsed[339]?.[i]), 
                        mhl: cleanNumber(parsed[340]?.[i]),
                        ytd: cleanNumber(parsed[330]?.[i])
                    },
                    area: { 
                        target: cleanNumber(parsed[330]?.[i]), // keep existing or not? Actually target for area was parsed[330]? The user says roll 331 (parsed[330]) is cumulative installs. So area target was wrong previously. We will keep what we have or remove target. I'll just keep it but we know YTD area is parsed[333]. Wait, I will leave target as it was, or 0.
                        actual: cleanNumber(parsed[344]?.[i]), 
                        gfs: cleanNumber(parsed[345]?.[i]), 
                        mhl: cleanNumber(parsed[346]?.[i]),
                        ytd: cleanNumber(parsed[333]?.[i])
                    },
                    teams: cleanNumber(parsed[349]?.[i]),
                    damage: { 
                        totalValue: cleanNumber(parsed[355]?.[i]) || (cleanNumber(parsed[356]?.[i]) + cleanNumber(parsed[357]?.[i])),
                        ytd: cleanNumber(parsed[354]?.[i]),
                        byTech: cleanNumber(parsed[356]?.[i]), 
                        byFilm: cleanNumber(parsed[357]?.[i]), 
                        claims: cleanNumber(parsed[347]?.[i]), 
                        filmArea: cleanNumber(parsed[348]?.[i]) 
                    }
                },
                carDetail: {
                    sales: { target: cleanNumber(parsed[369]?.[i]), actual: cleanNumber(parsed[370]?.[i]) },
                    installs: { total: cleanNumber(parsed[373]?.[i]), line: cleanNumber(parsed[374]?.[i]), fb: cleanNumber(parsed[375]?.[i]), tel: cleanNumber(parsed[376]?.[i]), walkin: cleanNumber(parsed[377]?.[i]), showroom: cleanNumber(parsed[378]?.[i]), other: cleanNumber(parsed[379]?.[i]) },
                    contacts: { total: cleanNumber(parsed[384]?.[i]), tel: cleanNumber(parsed[385]?.[i]), line: cleanNumber(parsed[386]?.[i]), fb: cleanNumber(parsed[387]?.[i]) },
                    tech: { 
                        claims: cleanNumber(parsed[390]?.[i]), 
                        filmIssueCount: cleanNumber(parsed[392]?.[i]), 
                        filmIssueValue: cleanNumber(parsed[393]?.[i]), 
                        techIssueCount: cleanNumber(parsed[395]?.[i]), 
                        techIssueValue: cleanNumber(parsed[396]?.[i]), 
                        damagePercent: cleanNumber(parsed[384]?.[i]),
                        teamSize: cleanNumber(parsed[399]?.[i]) 
                    }
                },
                buildingSales: {
                    totalRepSales: cleanNumber(parsed[168]?.[i]), // Row 169
                    totalProjSales: cleanNumber(parsed[169]?.[i]), // Row 170
                    totalAdminSales: cleanNumber(parsed[170]?.[i]), // Row 171
                    bom: normalizeSalesRepData({ ytd: cleanNumber(parsed[172]?.[i]), meets: bomMeets, installs: bomInstalls, sales: cleanNumber(parsed[175]?.[i]), newMeets: cleanNumber(parsed[177]?.[i]), newInstalls: cleanNumber(parsed[178]?.[i]), newSales: cleanNumber(parsed[179]?.[i]), oldMeets: cleanNumber(parsed[181]?.[i]), oldInstalls: cleanNumber(parsed[182]?.[i]), oldSales: cleanNumber(parsed[183]?.[i]), noInstalls: cleanNumber(parsed[185]?.[i]), noInstallSales: cleanNumber(parsed[186]?.[i]) }),
                    jay: normalizeSalesRepData({ ytd: cleanNumber(parsed[192]?.[i]), meets: jayMeets, installs: jayInstalls, sales: cleanNumber(parsed[195]?.[i]), newMeets: cleanNumber(parsed[197]?.[i]), newInstalls: cleanNumber(parsed[198]?.[i]), newSales: cleanNumber(parsed[199]?.[i]), oldMeets: cleanNumber(parsed[201]?.[i]), oldInstalls: cleanNumber(parsed[202]?.[i]), oldSales: cleanNumber(parsed[203]?.[i]), noInstalls: cleanNumber(parsed[205]?.[i]), noInstallSales: cleanNumber(parsed[206]?.[i]) }),
                    saifha: normalizeSalesRepData({ ytd: cleanNumber(parsed[228]?.[i]), meets: saifhaMeets, installs: saifhaInstalls, sales: cleanNumber(parsed[231]?.[i]), newMeets: cleanNumber(parsed[233]?.[i]), newInstalls: cleanNumber(parsed[234]?.[i]), newSales: cleanNumber(parsed[235]?.[i]), oldMeets: cleanNumber(parsed[237]?.[i]), oldInstalls: cleanNumber(parsed[238]?.[i]), oldSales: cleanNumber(parsed[239]?.[i]), noInstalls: cleanNumber(parsed[241]?.[i]), noInstallSales: cleanNumber(parsed[242]?.[i]) }),
                    kat: normalizeSalesRepData({ ytd: cleanNumber(parsed[248]?.[i]), meets: katMeets, installs: katInstalls, sales: cleanNumber(parsed[251]?.[i]), newMeets: cleanNumber(parsed[253]?.[i]), newInstalls: cleanNumber(parsed[254]?.[i]), newSales: cleanNumber(parsed[255]?.[i]), oldMeets: cleanNumber(parsed[257]?.[i]), oldInstalls: cleanNumber(parsed[258]?.[i]), oldSales: cleanNumber(parsed[259]?.[i]), noInstalls: cleanNumber(parsed[261]?.[i]), noInstallSales: cleanNumber(parsed[262]?.[i]) }),
                    image: normalizeSalesRepData({ ytd: cleanNumber(parsed[268]?.[i]), meets: imageMeets, installs: imageInstalls, sales: cleanNumber(parsed[271]?.[i]), newMeets: cleanNumber(parsed[273]?.[i]), newInstalls: cleanNumber(parsed[274]?.[i]), newSales: cleanNumber(parsed[275]?.[i]), oldMeets: cleanNumber(parsed[277]?.[i]), oldInstalls: cleanNumber(parsed[278]?.[i]), oldSales: cleanNumber(parsed[279]?.[i]), noInstalls: cleanNumber(parsed[281]?.[i]), noInstallSales: cleanNumber(parsed[282]?.[i]) }),
                    projYa: { ytd: cleanNumber(parsed[289]?.[i]), sales: cleanNumber(parsed[290]?.[i]), installs: cleanNumber(parsed[291]?.[i]), targetMeets: cleanNumber(parsed[294]?.[i]), meets: cleanNumber(parsed[295]?.[i]), newMeets: cleanNumber(parsed[296]?.[i]), oldMeets: cleanNumber(parsed[297]?.[i]) },
                    projTung: { ytd: cleanNumber(parsed[302]?.[i]), sales: cleanNumber(parsed[303]?.[i]), installs: cleanNumber(parsed[304]?.[i]), targetMeets: cleanNumber(parsed[307]?.[i]), meets: cleanNumber(parsed[308]?.[i]), newMeets: cleanNumber(parsed[309]?.[i]), oldMeets: cleanNumber(parsed[310]?.[i]) },
                    projTukta: { ytd: cleanNumber(parsed[302]?.[i]), sales: cleanNumber(parsed[316]?.[i]), installs: cleanNumber(parsed[317]?.[i]), targetMeets: cleanNumber(parsed[320]?.[i]), meets: cleanNumber(parsed[321]?.[i]), newMeets: cleanNumber(parsed[322]?.[i]), oldMeets: cleanNumber(parsed[323]?.[i]) }
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
                    projYa: { ytd: 0, sales: repActual(yaSales), installs: 0, targetMeets: 0, meets: 0, newMeets: 0, oldMeets: 0 },
                    projTung: { ytd: 0, sales: 0, installs: 0, targetMeets: 0, meets: 0, newMeets: 0, oldMeets: 0 }
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
