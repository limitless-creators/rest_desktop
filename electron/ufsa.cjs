const UFSA_URL = 'https://www.ufsa.gov.mz/';
function browserUserAgent(chromeVersion) {
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + chromeVersion + ' Safari/537.36';
}
function isUfsaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['ufsa.gov.mz', 'www.ufsa.gov.mz'].includes(url.hostname);
  } catch { return false; }
}
async function checkUfsa(fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(UFSA_URL, { cache: 'no-store', signal: controller.signal });
    await response.body?.cancel();
    return response.ok && (!response.url || isUfsaUrl(response.url)) ? 'ready' : 'unavailable';
  } catch { return 'offline'; }
  finally { clearTimeout(timer); }
}
module.exports = { isUfsaUrl, checkUfsa, browserUserAgent };
