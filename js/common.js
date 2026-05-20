/* ============================================
   Chaan Wedding — Common JS
   ============================================ */

// ---------- Data loader ----------
window.CW = window.CW || {};

CW.dataPath = (() => {
  // Resolve relative path to data/data.json from any page location
  // All pages live at the site root, packages/, menu/, gallery/, admin.html.
  // We compute based on current path depth.
  const path = location.pathname.replace(/\\/g, '/');
  const segments = path.split('/').filter(Boolean);
  // If running from filesystem (file://), pathname starts at drive — count segments after document root.
  // Simpler heuristic: look at the last segment; if folder-like, go up.
  // We use a fixed approach: every nested page sets data-base on <html>; default to "./".
  return document.documentElement.dataset.base || './';
})();

CW.loadData = async function () {
  // Prefer localStorage override (for admin preview), else fetch JSON
  const local = localStorage.getItem('chaan_data_override');
  if (local) {
    try { return JSON.parse(local); } catch (e) { /* fall through */ }
  }
  try {
    const res = await fetch(CW.dataPath + 'data/data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load data.json');
    return await res.json();
  } catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML('afterbegin',
      `<div class="alert" style="margin:16px;">ไม่สามารถโหลดข้อมูลได้ — กรุณาเปิดผ่านเว็บเซิร์ฟเวอร์ (เช่น <code>python -m http.server</code>) หรือเข้าผ่าน URL จริง</div>`);
    return null;
  }
};

// ---------- Format helpers ----------
CW.fmtPrice = (n) => {
  if (n == null || isNaN(n)) return '-';
  return Number(n).toLocaleString('en-US');
};
CW.fmtBaht = (n) => CW.fmtPrice(n) + ' บาท';

CW.escape = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Detect low season based on month number (1-12) using data
CW.isLowSeason = (month, seasonInfo) => {
  if (!seasonInfo || !seasonInfo.lowSeasonMonths) return false;
  return seasonInfo.lowSeasonMonths.includes(month);
};

// Default season based on today
CW.currentSeason = (seasonInfo) => {
  const m = new Date().getMonth() + 1;
  return CW.isLowSeason(m, seasonInfo) ? 'low' : 'high';
};

// Read URL query parameter
CW.qs = (key) => new URLSearchParams(location.search).get(key);

// ---------- Header / Footer renderers ----------
CW.renderNav = function (activePage = '') {
  const base = CW.dataPath;
  const links = [
    { href: base + 'index.html', label: 'หน้าแรก', key: 'home' },
    { href: base + 'packages/', label: 'แพ็คเกจ', key: 'packages' },
    { href: base + 'venue-fees.html', label: 'ค่าเช่า/บริการ', key: 'venue' },
    { href: base + 'menu/', label: 'เมนูอาหาร', key: 'menu' },
    { href: base + 'gallery/', label: 'รูปภาพ', key: 'gallery' }
  ];
  const linkHTML = links.map(l =>
    `<a href="${l.href}" class="${activePage === l.key ? 'active' : ''}">${l.label}</a>`
  ).join('');
  return `
  <nav class="nav">
    <div class="nav__inner">
      <a class="nav__logo" href="${base}index.html">
        CHAAN
        <small>wedding venue</small>
      </a>
      <div class="nav__links">${linkHTML}</div>
      <button class="nav__toggle" aria-label="menu" onclick="document.getElementById('navMobile').classList.toggle('open')">
        <span></span><span></span><span></span>
      </button>
    </div>
    <div class="nav__mobile" id="navMobile">${linkHTML}</div>
  </nav>`;
};

CW.renderFooter = function (data) {
  const c = data?.site?.contact || {};
  const base = CW.dataPath;
  return `
  <footer class="footer">
    <div class="footer__grid">
      <div class="footer__brand">
        <span class="script">Chaan</span>
        <h3>CHAAN WEDDING</h3>
        <p>${CW.escape(data?.site?.tagline || '')}</p>
        <div class="contact-icons">
          ${c.facebook ? `<a href="${CW.escape(c.facebook)}" target="_blank" aria-label="Facebook">f</a>` : ''}
          ${c.instagram ? `<a href="${CW.escape(c.instagram)}" target="_blank" aria-label="Instagram">IG</a>` : ''}
          ${c.line ? `<a href="https://line.me/R/ti/p/${CW.escape(c.line)}" target="_blank" aria-label="LINE">L</a>` : ''}
          ${c.email ? `<a href="mailto:${CW.escape(c.email)}" aria-label="Email">@</a>` : ''}
        </div>
      </div>
      <div>
        <h4>ติดต่อเรา</h4>
        ${c.phone ? `<a href="tel:${CW.escape(c.phone)}">☎ ${CW.escape(c.phone)}</a>` : ''}
        ${c.line ? `<a href="https://line.me/R/ti/p/${CW.escape(c.line)}" target="_blank">LINE: ${CW.escape(c.line)}</a>` : ''}
        ${c.email ? `<a href="mailto:${CW.escape(c.email)}">${CW.escape(c.email)}</a>` : ''}
        ${c.mapLink ? `<a href="${CW.escape(c.mapLink)}" target="_blank">📍 ${CW.escape(c.address || 'ดูแผนที่')}</a>` : ''}
      </div>
      <div>
        <h4>เมนู</h4>
        <a href="${base}packages/">แพ็คเกจงานแต่ง / สัมมนา</a>
        <a href="${base}venue-fees.html">ค่าเช่าและบริการเสริม</a>
        <a href="${base}menu/">เมนูอาหาร</a>
        <a href="${base}gallery/">แกลเลอรีรูปภาพ</a>
      </div>
    </div>
    <div class="footer__bottom">© ${new Date().getFullYear()} Chaan Wedding Venue · All rights reserved</div>
  </footer>
  ${c.line ? `<a class="fab-contact" href="https://line.me/R/ti/p/${CW.escape(c.line)}" target="_blank">💬 สอบถาม / จอง</a>` : ''}`;
};

// Inject nav and footer placeholders into page
CW.mountChrome = async function (activePage = '') {
  const data = await CW.loadData();
  const navMount = document.getElementById('nav-mount');
  const footMount = document.getElementById('footer-mount');
  if (navMount) navMount.outerHTML = CW.renderNav(activePage);
  if (footMount) footMount.outerHTML = CW.renderFooter(data || {});
  return data;
};
