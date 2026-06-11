/* ============================================
   Chaan Wedding — Common JS
   ============================================ */

window.CW = window.CW || {};

CW.dataPath = (() => document.documentElement.dataset.base || './')();

CW.loadData = async function () {
  try {
    const res = await fetch(CW.dataPath + 'data/data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load data.json');
    const remote = await res.json();
    const local = localStorage.getItem('chaan_data_override');
    if (local) {
      try {
        const localData = JSON.parse(local);
        const remoteVer = remote._version || 0;
        const localVer  = localData._version || 0;
        if (localVer >= remoteVer) return localData;
        localStorage.removeItem('chaan_data_override');
      } catch (e) { localStorage.removeItem('chaan_data_override'); }
    }
    return remote;
  } catch (e) {
    const local = localStorage.getItem('chaan_data_override');
    if (local) { try { return JSON.parse(local); } catch (_) {} }
    console.error(e);
    document.body.insertAdjacentHTML('afterbegin',
      `<div class="alert" style="margin:16px;">ไม่สามารถโหลดข้อมูลได้ — กรุณาเปิดผ่านเว็บเซิร์ฟเวอร์ หรือเข้าผ่าน URL จริง</div>`);
    return null;
  }
};

CW.fmtPrice = (n) => {
  if (n == null || isNaN(n)) return '-';
  return Number(n).toLocaleString('en-US');
};
CW.fmtBaht = (n) => CW.fmtPrice(n) + ' บาท';

CW.escape = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Build inline style for an image with imagePosition + imageZoom
CW.imgStyle = (obj) => {
  const pos = obj?.imagePosition || '50% 50%';
  const zoom = obj?.imageZoom || 100;
  return `object-position:${pos};${zoom !== 100 ? `transform:scale(${zoom/100});` : ''}`;
};

CW.isLowSeason = (month, seasonInfo) => {
  if (!seasonInfo || !seasonInfo.lowSeasonMonths) return false;
  return seasonInfo.lowSeasonMonths.includes(month);
};

CW.currentSeason = (seasonInfo) => {
  const m = new Date().getMonth() + 1;
  return CW.isLowSeason(m, seasonInfo) ? 'low' : 'high';
};

CW.qs = (key) => new URLSearchParams(location.search).get(key);

// Compute price for a given package, time slot, season, guest count.
// Strategy:
//   1) If guestPricingOverrides[timeSlot][guestCount][season] exists → use it (admin override)
//   2) Otherwise compute from basePricing[timeSlot][season] * (guestCount / 100)
//      (linear scaling from 100-guest base)
CW.computePrice = function (pkg, timeSlot, season, guestCount) {
  if (!pkg) return 0;
  const gc = String(guestCount);
  // Try override
  const ov = pkg.guestPricingOverrides?.[timeSlot]?.[gc]?.[season];
  if (ov != null) return Number(ov);
  // Linear from base 100
  const base = pkg.basePricing?.[timeSlot]?.[season];
  if (base == null) return 0;
  const ratio = Number(guestCount) / 100;
  return Math.round(base * ratio / 1000) * 1000; // round to nearest 1,000
};

// Get the time slot list for a package's category
CW.getTimeSlots = function (data, categoryKey) {
  return data.timeSlots?.[categoryKey] || [];
};

CW.findPackageCategory = function (data, pkgId) {
  if ((data.packages?.wedding || []).some(p => p.id === pkgId)) return 'wedding';
  if ((data.packages?.seminar || []).some(p => p.id === pkgId)) return 'seminar';
  return 'wedding';
};

// Nav
CW.renderNav = function (activePage = '', data = null) {
  const base = CW.dataPath;
  const c = data?.site?.contact || {};
  const lineLink = c.line ? (c.line.startsWith('http') ? c.line : `https://line.me/R/ti/p/${encodeURIComponent(c.line)}`) : '';
  const ctaHref = lineLink || (c.phone ? `tel:${CW.escape(c.phone.replace(/[^\d+]/g, ''))}` : base + 'packages/');
  const ctaTarget = lineLink ? ' target="_blank"' : '';
  const links = [
    { href: base + 'index.html',       label: 'หน้าแรก',     key: 'home' },
    { href: base + 'packages/',        label: 'แพ็คเกจ',     key: 'packages' },
    { href: base + 'venue-fees.html',  label: 'ค่าเช่า/บริการ', key: 'venue' },
    { href: base + 'menu/',            label: 'เมนูอาหาร',   key: 'menu' },
    { href: base + 'gallery/',         label: 'รูปภาพ',      key: 'gallery' },
    { href: base + 'calendar/',        label: 'ตารางวันว่าง', key: 'calendar' },
    { href: base + 'floorplan/',       label: 'แปลนสถานที่',  key: 'floorplan' }
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
      <a class="nav__cta" href="${CW.escape(ctaHref)}"${ctaTarget}>💬 สอบถาม / จอง</a>
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
  const lineLink = c.line ? (c.line.startsWith('http') ? c.line : `https://line.me/R/ti/p/${encodeURIComponent(c.line)}`) : '';
  return `
  <footer class="footer">
    <div class="footer__grid">
      <div class="footer__brand">
        <span class="script">Chaan</span>
        <h3>CHAAN WEDDING</h3>
        <p>${CW.escape(data?.site?.tagline || '')}</p>
        <div class="contact-icons">
          ${c.facebook ? `<a href="${CW.escape(c.facebook)}" target="_blank" aria-label="Facebook" title="Facebook">f</a>` : ''}
          ${c.instagram ? `<a href="${CW.escape(c.instagram)}" target="_blank" aria-label="Instagram" title="Instagram">IG</a>` : ''}
          ${lineLink ? `<a href="${CW.escape(lineLink)}" target="_blank" aria-label="LINE" title="LINE">L</a>` : ''}
          ${c.email ? `<a href="mailto:${CW.escape(c.email)}" aria-label="Email" title="Email">@</a>` : ''}
        </div>
      </div>
      <div>
        <h4>ติดต่อเรา</h4>
        ${c.phone ? `<a href="tel:${CW.escape(c.phone.replace(/[^\d+]/g, ''))}">☎ ${CW.escape(c.phone)}</a>` : ''}
        ${lineLink ? `<a href="${CW.escape(lineLink)}" target="_blank">LINE: ${CW.escape(c.line)}</a>` : ''}
        ${c.email ? `<a href="mailto:${CW.escape(c.email)}">${CW.escape(c.email)}</a>` : ''}
        ${c.facebook ? `<a href="${CW.escape(c.facebook)}" target="_blank">Facebook</a>` : ''}
        ${c.mapLink ? `<a href="${CW.escape(c.mapLink)}" target="_blank">📍 ${CW.escape(c.address || 'ดูแผนที่')}</a>` : ''}
      </div>
      <div>
        <h4>หมวดข้อมูล</h4>
        <a href="${base}packages/">แพ็คเกจงานแต่ง / สัมมนา</a>
        <a href="${base}venue-fees.html">ค่าเช่าและบริการเสริม</a>
        <a href="${base}menu/">เมนูอาหาร</a>
        <a href="${base}gallery/">แกลเลอรีรูปภาพ</a>
      </div>
    </div>
    <div class="footer__bottom">© ${new Date().getFullYear()} Chaan Wedding Venue · All rights reserved</div>
  </footer>
  ${lineLink
    ? `<a class="fab-contact" href="${CW.escape(lineLink)}" target="_blank">💬 สอบถาม / จอง</a>`
    : (c.phone ? `<a class="fab-contact" href="tel:${CW.escape(c.phone.replace(/[^\d+]/g, ''))}">☎ ${CW.escape(c.phone)}</a>` : '')}
  <nav class="cta-bar" aria-label="ติดต่อด่วน">
    ${c.phone ? `<a class="cta-bar__primary" href="tel:${CW.escape(c.phone.replace(/[^\d+]/g, ''))}"><span class="ico">☎</span>โทร</a>` : ''}
    <a href="${base}packages/"><span class="ico">💐</span>ดูแพ็คเกจ</a>
    ${c.facebook ? `<a href="${CW.escape(c.facebook)}" target="_blank"><span class="ico">f</span>Facebook</a>` : ''}
    ${lineLink ? `<a href="${CW.escape(lineLink)}" target="_blank"><span class="ico">💬</span>LINE</a>` : ''}
  </nav>`;
};

CW.mountChrome = async function (activePage = '') {
  const data = await CW.loadData();
  const navMount = document.getElementById('nav-mount');
  const footMount = document.getElementById('footer-mount');
  if (navMount) navMount.outerHTML = CW.renderNav(activePage, data);
  if (footMount) {
    footMount.outerHTML = CW.renderFooter(data || {});
    if (document.querySelector('.cta-bar')) document.body.classList.add('has-cta-bar');
  }
  return data;
};
