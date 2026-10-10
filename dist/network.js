'use strict';
// One shared read per page; writes are never automatically replayed here.
window.createTripNetwork = function createTripNetwork(api, fetcher = fetch, timeoutMs = 45000) {
  let reading = null;
  async function request(options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(api + (options.method === 'POST' ? '' : '?t=' + Date.now()), {
        redirect: 'follow', credentials: 'omit', cache: 'no-store', ...options, signal: controller.signal
      });
      if (!response.ok) throw new Error('Google Sheets returned HTTP ' + response.status);
      const result = await response.json();
      if (result.status === 'error' || result.success === false) throw new Error(result.message || 'Google Sheets could not complete the request.');
      return result;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Google Sheets took too long to respond. Please try again.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  return {
    read() {
      if (reading) return reading;
      reading = (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await request();
            const rows = Array.isArray(result) ? result : result.data || result.registrations;
            if (!Array.isArray(rows)) throw new Error('Google Sheets returned an unexpected response.');
            return rows;
          } catch (error) { if (attempt === 1) throw error; }
        }
      })().finally(() => { reading = null; });
      return reading;
    },
    write(payload) { return request({method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(payload)}); }
  };
};
