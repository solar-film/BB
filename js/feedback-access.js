(() => {
    'use strict';
    const endpoint = 'https://script.google.com/macros/s/AKfycbxsArGYvGXKS7Q2oj8i1ynI5p86tsOMdsSV8HG15GsH3almHCh0RcCivbkVU_Fw_v7sLw/exec';
    // Remove the previous public reader's persistent copies of customer data.
    try {
        ['bb-feedback-source-cache-v1', 'bb-feedback-recent-v1',
            'bb-feedback-executive-report-cache-v1', 'bb-feedback-presentation-cache-v1']
            .forEach((key) => localStorage.removeItem(key));
    } catch (_) { /* Storage may be disabled. Authentication never depends on it. */ }
    const hosted = Boolean(window.google?.script?.run);
    function call(method, ...args) {
        if (!hosted) return Promise.reject(new Error('กรุณาเปิดผ่านหน้าลงชื่อเข้าใช้'));
        return new Promise((resolve, reject) => {
            const runner = google.script.run.withFailureHandler(reject).withSuccessHandler((result) => {
                if (!result?.ok) {
                    const error = new Error(result?.error || 'ไม่สามารถดำเนินการได้');
                    error.code = result?.code;
                    reject(error);
                } else resolve(result);
            });
            if (method === 'read') runner.feedbackRead(...args);
            else if (method === 'save') runner.feedbackSave(...args);
            else reject(new Error('Unsupported operation'));
        });
    }
    window.BBFeedback = { hosted, call };
    if (!hosted) {
        const pages = { 'feedback-bb-week.html': 'entry', 'feedback-presentation.html': 'presentation', 'feedback-executive-report.html': 'report' };
        const page = pages[location.pathname.split('/').pop()] || 'entry';
        location.replace(`${endpoint}?page=${page}`);
    }
})();
