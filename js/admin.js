/* ============================================
   Chaan Wedding — Admin panel
   Edits the data store in-browser; export to data.json
   ============================================ */

// Use var so DATA is exposed on window (needed by inline event handlers)
var DATA = null;
var activeSection = 'site';

(async function init() {
  await CW.mountChrome('');

  const override = localStorage.getItem('chaan_data_override');
  if (override) {
    try { DATA = JSON.parse(override); } catch (e) { DATA = null; }
  }
  if (!DATA) {
    const res = await fetch('./data/data.json', { cache: 'no-store' });
    DATA = await res.json();
  }

  document.querySelectorAll('.admin-sidebar button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.admin-sidebar button').forEach(x => x.classList.toggle('active', x === b));
      activeSection = b.dataset.section;
      render();
    });
  });

  document.getElementById('btnExport').addEventListener('click', exportJSON);
  document.getElementById('btnReset').addEventListener('click', resetToOriginal);
  document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', importJSON);

  render();
})();

function persist() {
  localStorage.setItem('chaan_data_override', JSON.stringify(DATA));
}

// ============================================
// Image position editor v2 — drag + grid + zoom
// Aspect: '4/3' (cards) | '16/9' (hero/featured) | '1/1' (gallery)
// path: a JS expression string that resolves to the object owning imagePosition
// ============================================
function imgPosEditor(imgUrl, pathExpr, aspect) {
  if (!imgUrl) return '';
  const obj = (function(){ try { return eval(pathExpr); } catch(e) { return {}; } })();
  const pos = obj.imagePosition || '50% 50%';
  const [xStr, yStr] = pos.split(' ');
  const x = parseInt(xStr) || 50;
  const y = parseInt(yStr) || 50;
  const zoom = obj.imageZoom || 100; // percent (100 = no zoom)
  const uid = 'iposed_' + Math.random().toString(36).slice(2,9);
  const ratioMap = { '4/3':'aspect-ratio:4/3', '16/9':'aspect-ratio:16/9', '1/1':'aspect-ratio:1/1', '21/9':'aspect-ratio:21/9' };
  const ar = ratioMap[aspect] || ratioMap['4/3'];
  return `
    <div class="img-pos-editor" id="${uid}" data-path="${pathExpr.replace(/"/g,'&quot;')}">
      <div class="img-pos-editor__head">
        <div>
          <span>ปรับตำแหน่งรูป</span>
          <span class="img-pos-editor__hint">· อัตราส่วน ${aspect} · ลากเมาส์เพื่อเลื่อน + ใช้ slider ปรับ Zoom</span>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" onclick="resetImgPos('${uid}')">↺ Center</button>
      </div>
      <div class="img-pos-preview" id="${uid}_box" style="${ar}" onmousedown="startImgDrag(event,'${uid}')" ontouchstart="startImgDrag(event,'${uid}')">
        <img id="${uid}_img" src="${imgUrl.replace(/"/g,'&quot;')}" alt="" draggable="false" style="object-position:${x}% ${y}%; transform:scale(${zoom/100});">
      </div>
      <div class="img-pos-controls">
        <label>🔍 Zoom</label>
        <input type="range" min="100" max="300" step="5" value="${zoom}" oninput="updateImgZoom('${uid}',this.value)">
        <span class="val" id="${uid}_zv">${zoom}%</span>
      </div>
      <div class="img-pos-coord">ตำแหน่ง: X <span id="${uid}_xv">${x}</span>% · Y <span id="${uid}_yv">${y}</span>%</div>
    </div>
  `;
}

let _imgDrag = null;
function startImgDrag(e, uid) {
  e.preventDefault();
  const box = document.getElementById(uid + '_box');
  if (!box) return;
  const img = document.getElementById(uid + '_img');
  const rect = box.getBoundingClientRect();
  const cur = (img.style.objectPosition || '50% 50%').split(' ').map(s => parseFloat(s));
  const pt = e.touches ? e.touches[0] : e;
  _imgDrag = {
    uid,
    box, img, rect,
    startX: pt.clientX, startY: pt.clientY,
    startPosX: cur[0] || 50, startPosY: cur[1] || 50
  };
  box.classList.add('dragging');
  document.addEventListener('mousemove', doImgDrag);
  document.addEventListener('mouseup', endImgDrag);
  document.addEventListener('touchmove', doImgDrag, { passive: false });
  document.addEventListener('touchend', endImgDrag);
}
function doImgDrag(e) {
  if (!_imgDrag) return;
  e.preventDefault?.();
  const pt = e.touches ? e.touches[0] : e;
  const dx = pt.clientX - _imgDrag.startX;
  const dy = pt.clientY - _imgDrag.startY;
  // Convert pixel delta to percentage; invert because dragging right should reveal right portion (object-position decreases)
  const deltaXPct = (dx / _imgDrag.rect.width) * 100;
  const deltaYPct = (dy / _imgDrag.rect.height) * 100;
  let nx = _imgDrag.startPosX - deltaXPct;
  let ny = _imgDrag.startPosY - deltaYPct;
  nx = Math.max(0, Math.min(100, nx));
  ny = Math.max(0, Math.min(100, ny));
  _imgDrag.img.style.objectPosition = nx.toFixed(1) + '% ' + ny.toFixed(1) + '%';
  document.getElementById(_imgDrag.uid + '_xv').textContent = nx.toFixed(0);
  document.getElementById(_imgDrag.uid + '_yv').textContent = ny.toFixed(0);
}
function endImgDrag() {
  if (!_imgDrag) return;
  const uid = _imgDrag.uid;
  const editor = document.getElementById(uid);
  const path = editor?.dataset.path;
  const img = _imgDrag.img;
  _imgDrag.box.classList.remove('dragging');
  if (path && img) {
    try {
      const obj = eval(path);
      obj.imagePosition = img.style.objectPosition;
      persist();
    } catch(e) { console.error(e); }
  }
  document.removeEventListener('mousemove', doImgDrag);
  document.removeEventListener('mouseup', endImgDrag);
  document.removeEventListener('touchmove', doImgDrag);
  document.removeEventListener('touchend', endImgDrag);
  _imgDrag = null;
}
function updateImgZoom(uid, val) {
  const img = document.getElementById(uid + '_img');
  const zv = document.getElementById(uid + '_zv');
  if (img) img.style.transform = 'scale(' + (val/100) + ')';
  if (zv) zv.textContent = val + '%';
  const editor = document.getElementById(uid);
  const path = editor?.dataset.path;
  if (path) {
    try {
      const obj = eval(path);
      obj.imageZoom = parseInt(val);
      persist();
    } catch(e) {}
  }
}

function refreshImgEditor(slotId, imgUrl, pathExpr, aspect) {
  const slot = document.getElementById(slotId);
  if (slot) slot.innerHTML = imgPosEditor(imgUrl, pathExpr, aspect);
}

function resetImgPos(uid) {
  const editor = document.getElementById(uid);
  const path = editor?.dataset.path;
  if (path) {
    try {
      const obj = eval(path);
      obj.imagePosition = '50% 50%';
      obj.imageZoom = 100;
      persist();
    } catch(e) {}
  }
  const img = document.getElementById(uid + '_img');
  if (img) {
    img.style.objectPosition = '50% 50%';
    img.style.transform = 'scale(1)';
  }
  const xv = document.getElementById(uid + '_xv');
  const yv = document.getElementById(uid + '_yv');
  const zv = document.getElementById(uid + '_zv');
  if (xv) xv.textContent = '50';
  if (yv) yv.textContent = '50';
  if (zv) zv.textContent = '100%';
  const range = document.querySelector('#' + uid + ' input[type=range]');
  if (range) range.value = 100;
}

// Logout
function adminLogout() {
  sessionStorage.removeItem('chaan_admin_authed');
  location.reload();
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'data.json'; a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      DATA = JSON.parse(ev.target.result);
      persist();
      render();
      alert('Import สำเร็จ!');
    } catch (err) { alert('JSON ไม่ถูกต้อง: ' + err.message); }
  };
  reader.readAsText(file);
}

function resetToOriginal() {
  if (!confirm('ยืนยันคืนค่าเป็นไฟล์ data.json ต้นฉบับ?')) return;
  localStorage.removeItem('chaan_data_override');
  location.reload();
}

function render() {
  const main = document.getElementById('adminMain');
  main.innerHTML = '';
  switch (activeSection) {
    case 'site':         renderSite(main); break;
    case 'featured':     renderFeatured(main); break;
    case 'wedding':      renderPackages(main, 'wedding', 'แพ็คเกจงานแต่งงาน'); break;
    case 'seminar':      renderPackages(main, 'seminar', 'แพ็คเกจงานสัมมนา'); break;
    case 'rental':       renderRental(main); break;
    case 'addons':       renderAddons(main); break;
    case 'menu-buffet':  renderMenu(main, 'buffet'); break;
    case 'menu-chinese': renderMenu(main, 'chinese'); break;
    case 'menu-thai':    renderMenu(main, 'thai'); break;
    case 'ceremonies':   renderCeremonies(main); break;
    case 'zones':        renderZones(main); break;
    case 'photos':       renderPhotos(main); break;
    case 'auspicious':   renderAuspicious(main); break;
    case 'bookings':     renderBookings(main); break;
    case 'publish':      renderPublish(main); break;
    case 'raw':          renderRaw(main); break;
  }
}

// ---------- Site ----------
function renderSite(root) {
  const s = DATA.site || (DATA.site = {});
  const c = s.contact || (s.contact = {});
  root.innerHTML = `
    <h2 style="margin-top:0;">ข้อมูลเว็บไซต์ทั่วไป</h2>
    <div class="row">
      <div class="field"><label>ชื่อเว็บไซต์</label><input id="site_name" value="${esc(s.name)}"></div>
      <div class="field"><label>Logo Text</label><input id="site_logo" value="${esc(s.logoText)}"></div>
    </div>
    <div class="field"><label>Tagline</label><input id="site_tagline" value="${esc(s.tagline)}"></div>
    <div class="field"><label>คำอธิบาย (หน้าแรก)</label><textarea id="site_desc">${esc(s.description)}</textarea></div>
    <div class="field"><label>รูป Hero (URL)</label><input id="site_hero" value="${esc(s.heroImage)}"></div>

    <h3 style="margin-top:32px;">ข้อมูลติดต่อ</h3>
    <div class="row">
      <div class="field"><label>เบอร์โทร</label><input id="c_phone" value="${esc(c.phone)}"></div>
      <div class="field"><label>LINE ID หรือ LINE URL (เว้นว่างได้)</label><input id="c_line" value="${esc(c.line)}" placeholder="@chaanwedding หรือ https://lin.ee/..."></div>
    </div>
    <div class="row">
      <div class="field"><label>Facebook URL</label><input id="c_fb" value="${esc(c.facebook)}"></div>
      <div class="field"><label>Instagram URL</label><input id="c_ig" value="${esc(c.instagram)}"></div>
    </div>
    <div class="field"><label>Email</label><input id="c_email" value="${esc(c.email)}"></div>
    <div class="field"><label>ชื่อ/ที่อยู่ที่แสดง</label><input id="c_addr" value="${esc(c.address)}"></div>
    <div class="field"><label>Google Maps URL</label><input id="c_map" value="${esc(c.mapLink)}"></div>

    <h3 style="margin-top:32px;">ช่วงฤดูกาล</h3>
    <p style="color:var(--color-text-muted);font-size:0.9rem;">เดือนที่ถือเป็น Low Season (1=ม.ค. ... 12=ธ.ค.) คั่นด้วยจุลภาค</p>
    <div class="field"><label>เดือน Low Season</label><input id="low_months" value="${(DATA.seasonInfo?.lowSeasonMonths || []).join(',')}"></div>

    <h3 style="margin-top:32px;">🔒 บัญชีแอดมิน</h3>
    <p style="color:var(--color-text-muted);font-size:0.9rem;">ใช้สำหรับเข้าหน้าจัดการ — เปลี่ยนแล้วต้อง Export + push เพื่ออัพเดท</p>
    <div class="row">
      <div class="field"><label>Username</label><input id="admin_user" value="${esc(s.admin?.username || 'chaan')}"></div>
      <div class="field"><label>Password ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label><input id="admin_pass" type="password" placeholder="●●●●●●●●"></div>
    </div>
    <div style="font-size:0.85rem;color:var(--color-text-muted);margin:-4px 0 12px;">รหัสจะถูก hash ก่อนเก็บ ปลอดภัยกว่าเก็บเป็น plain text</div>

    <div class="admin-actions"><button class="btn btn--primary" id="saveSite">บันทึก</button></div>
  `;
  document.getElementById('saveSite').addEventListener('click', async () => {
    s.name = val('site_name'); s.logoText = val('site_logo');
    s.tagline = val('site_tagline'); s.description = val('site_desc');
    s.heroImage = val('site_hero');
    c.phone = val('c_phone'); c.line = val('c_line');
    c.facebook = val('c_fb'); c.instagram = val('c_ig');
    c.email = val('c_email'); c.address = val('c_addr'); c.mapLink = val('c_map');
    DATA.seasonInfo = DATA.seasonInfo || {};
    DATA.seasonInfo.lowSeasonMonths = val('low_months').split(',').map(x => parseInt(x.trim(), 10)).filter(Boolean);

    // Admin credentials
    s.admin = s.admin || {};
    const newUser = val('admin_user').trim();
    if (newUser) s.admin.username = newUser;
    const newPass = val('admin_pass');
    if (newPass) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newPass));
      s.admin.passwordHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
      document.getElementById('admin_pass').value = '';
      toast('บันทึกแล้ว + Password เปลี่ยนแล้ว');
    } else {
      toast('บันทึกแล้ว');
    }
    persist();
  });
}

// ---------- Featured ----------
function renderFeatured(root) {
  const all = [...(DATA.packages?.wedding || []), ...(DATA.packages?.seminar || [])];
  root.innerHTML = `
    <h2 style="margin-top:0;">แพ็คเกจที่จะโชว์เป็น Featured ในหน้าแรก</h2>
    <div class="field">
      <label>แพ็คเกจ Featured</label>
      <select id="featuredSel">
        ${all.map(p => `<option value="${esc(p.id)}" ${p.id === DATA.featuredPackageId ? 'selected':''}>${esc(p.name)}</option>`).join('')}
      </select>
    </div>
    <div class="admin-actions"><button class="btn btn--primary" id="saveFeatured">บันทึก</button></div>
  `;
  document.getElementById('saveFeatured').addEventListener('click', () => {
    DATA.featuredPackageId = val('featuredSel');
    persist(); toast('บันทึกแล้ว');
  });
}

// ---------- Packages ----------
function renderPackages(root, type, title) {
  DATA.packages = DATA.packages || { wedding: [], seminar: [] };
  const list = DATA.packages[type] || (DATA.packages[type] = []);
  const allSlots = DATA.timeSlots?.[type] || [];
  const allAddons = DATA.venueFees?.addons || [];

  root.innerHTML = `
    <h2 style="margin-top:0;">${title}</h2>
    <button class="btn btn--primary btn--sm" id="addPkg">+ เพิ่มแพ็คเกจใหม่</button>
    <div id="pkgList" style="margin-top:16px;"></div>
  `;
  document.getElementById('addPkg').addEventListener('click', () => {
    const defaultSlots = allSlots.map(s => s.id);
    const basePricing = {};
    defaultSlots.forEach(sid => { basePricing[sid] = { high: 100000, low: 90000 }; });
    list.push({
      id: type + '_' + Date.now(),
      name: 'แพ็คเกจใหม่',
      subtitle: '', shortDescription: '', longDescription: '',
      image: '', isFeatured: false, isPromo: false, season: 'all',
      availableTimeSlots: defaultSlots,
      guestBase: 100,
      includedSections: [], rituals: [],
      basePricing,
      crossYearDiscount: 0,
      overflowPricing: {},
      freeBonuses: [],
      customerProvides: [],
      availableMenus: [], allowedMenuSetIds: [], availableAddons: [],
      notes: ''
    });
    persist(); render();
  });

  const pkgList = document.getElementById('pkgList');
  pkgList.innerHTML = list.map((p, idx) => `
    <div class="admin-item">
      <div class="admin-item__head">
        <strong>${esc(p.name)}</strong>
        <div style="display:flex;gap:6px;">
          <button class="btn btn--ghost btn--sm" onclick="movePkg('${type}', ${idx}, -1)">↑</button>
          <button class="btn btn--ghost btn--sm" onclick="movePkg('${type}', ${idx}, 1)">↓</button>
          <button class="btn btn--ghost btn--sm" onclick="delPkg('${type}', ${idx})">ลบ</button>
        </div>
      </div>

      <div class="row">
        <div class="field"><label>ชื่อแพ็คเกจ</label><input value="${esc(p.name)}" oninput="DATA.packages['${type}'][${idx}].name = this.value; persist()"></div>
        <div class="field"><label>Slug (ID)</label><input value="${esc(p.id)}" oninput="DATA.packages['${type}'][${idx}].id = this.value; persist()"></div>
      </div>
      <div class="field"><label>Subtitle</label><input value="${esc(p.subtitle)}" oninput="DATA.packages['${type}'][${idx}].subtitle = this.value; persist()"></div>
      <div class="field"><label>คำอธิบายสั้น</label><input value="${esc(p.shortDescription)}" oninput="DATA.packages['${type}'][${idx}].shortDescription = this.value; persist()"></div>
      <div class="field"><label>คำอธิบายยาว</label><textarea oninput="DATA.packages['${type}'][${idx}].longDescription = this.value; persist()">${esc(p.longDescription)}</textarea></div>
      <div class="row">
        <div class="field"><label>URL รูป</label>
          <input value="${esc(p.image)}" oninput="DATA.packages['${type}'][${idx}].image = this.value; persist(); refreshImgEditor('imgEdSlot_${type}_${idx}', this.value, &quot;DATA.packages['${type}'][${idx}]&quot;, '4/3')">
          <div id="imgEdSlot_${type}_${idx}">${imgPosEditor(p.image, `DATA.packages['${type}'][${idx}]`, '4/3')}</div>
        </div>
        <div class="field" style="flex:0 0 160px;"><label>ฤดูกาล</label>
          <select onchange="DATA.packages['${type}'][${idx}].season = this.value; persist()">
            <option value="all" ${p.season==='all'?'selected':''}>ทั้งสองฤดู</option>
            <option value="low" ${p.season==='low'?'selected':''}>เฉพาะ Low</option>
            <option value="high" ${p.season==='high'?'selected':''}>เฉพาะ High</option>
          </select>
        </div>
        <div class="field" style="flex:0 0 120px;"><label>Featured</label>
          <select onchange="DATA.packages['${type}'][${idx}].isFeatured = this.value === 'true'; persist()">
            <option value="false" ${!p.isFeatured?'selected':''}>ไม่</option>
            <option value="true" ${p.isFeatured?'selected':''}>ใช่</option>
          </select>
        </div>
      </div>

      <details open style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">⏰ ช่วงเวลาที่จัดได้ (${(p.availableTimeSlots||[]).length} จาก ${allSlots.length})</summary>
        <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:10px;">
          ${allSlots.map(s => `
            <label style="display:inline-flex; align-items:center; gap:6px; background:var(--color-cream); padding: 8px 14px; border-radius: 999px; border:1px solid var(--color-line);">
              <input type="checkbox" ${(p.availableTimeSlots||[]).includes(s.id)?'checked':''} onchange="toggleSlot('${type}', ${idx}, '${s.id}', this.checked)">
              <span>${esc(s.name)} <small style="color:var(--color-text-muted);">${esc(s.hours)}</small></span>
            </label>
          `).join('')}
        </div>
      </details>

      <details style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">💰 ราคาฐาน (100 ท่าน) ต่อช่วงเวลา</summary>
        <p style="color:var(--color-text-muted); font-size: 0.85rem; margin: 8px 0;">ราคาฐาน 100 ท่าน — ระบบจะปรับให้อัตโนมัติตามจำนวนแขกที่เลือก สามารถ override per-tier ด้านล่าง</p>
        <table class="t">
          <thead><tr><th>ช่วงเวลา</th><th>High Season</th><th>Low Season</th></tr></thead>
          <tbody>
            ${allSlots.filter(s => (p.availableTimeSlots||[]).includes(s.id)).map(s => {
              const bp = (p.basePricing||{})[s.id] || { high: 0, low: 0 };
              return `<tr>
                <td>${esc(s.name)}</td>
                <td><input type="number" value="${bp.high||0}" oninput="setBasePrice('${type}', ${idx}, '${s.id}', 'high', this.value)"></td>
                <td><input type="number" value="${bp.low||0}" oninput="setBasePrice('${type}', ${idx}, '${s.id}', 'low', this.value)"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </details>

      <div class="row" style="margin-top:12px;">
        <div class="field" style="flex:0 0 200px;"><label>จำนวนแขกเริ่มต้น (guestBase)</label><input type="number" value="${p.guestBase||100}" oninput="DATA.packages['${type}'][${idx}].guestBase = Number(this.value); persist()"></div>
        <div class="field" style="flex:0 0 200px;"><label>ส่วนลดจองข้ามปี (บาท)</label><input type="number" value="${p.crossYearDiscount||0}" oninput="DATA.packages['${type}'][${idx}].crossYearDiscount = Number(this.value); persist()"></div>
        <div class="field" style="flex:0 0 120px;"><label>Promo</label>
          <select onchange="DATA.packages['${type}'][${idx}].isPromo = this.value === 'true'; persist()">
            <option value="false" ${!p.isPromo?'selected':''}>ไม่</option>
            <option value="true" ${p.isPromo?'selected':''}>ใช่</option>
          </select>
        </div>
      </div>
      <div class="alert" style="margin-top:12px;font-size:0.85rem;">
        💡 ข้อมูลซับซ้อน (includedSections, freeBonuses, customerProvides, overflowPricing, allowedMenuSetIds) แก้ผ่าน <strong>{ } JSON ทั้งหมด</strong> ใน sidebar
      </div>

      <details style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">📋 หมวดสิ่งที่ได้รับ (${(p.includedSections||[]).length} หมวด)</summary>
        <p style="color:var(--color-text-muted);font-size:0.85rem;">รายการอ่านอย่างเดียว — แก้ไขผ่าน Raw JSON</p>
        <div style="margin-top:12px;">
          ${(p.includedSections || []).map(sec => `
            <div style="background:var(--color-cream);padding:10px 14px;border-radius:6px;margin-bottom:6px;border:1px solid var(--color-line);">
              <strong>${esc(sec.title)}</strong>
              <div style="font-size:0.8rem;color:var(--color-text-muted);">${(sec.items||[]).length} รายการ</div>
            </div>
          `).join('') || '<div style="color:var(--color-text-muted);">ยังไม่มีหมวด — เพิ่มผ่าน Raw JSON</div>'}
        </div>
      </details>

      <details style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">🪔 พิธีที่ตัดออกได้ (${(p.rituals||[]).length})</summary>
        <div style="margin-top:12px;">
          ${(p.rituals || []).map((r, i) => `
            <div class="row" style="margin-bottom:6px;">
              <div class="field" style="margin:0;flex:0 0 130px;"><input placeholder="id" value="${esc(r.id)}" oninput="DATA.packages['${type}'][${idx}].rituals[${i}].id = this.value; persist()"></div>
              <div class="field" style="margin:0;"><input placeholder="ชื่อพิธี" value="${esc(r.name)}" oninput="DATA.packages['${type}'][${idx}].rituals[${i}].name = this.value; persist()"></div>
              <div class="field" style="margin:0;flex:0 0 130px;"><input type="number" placeholder="ลด ฿" value="${r.deductIfRemoved||0}" oninput="DATA.packages['${type}'][${idx}].rituals[${i}].deductIfRemoved = Number(this.value); persist()"></div>
              <button class="btn btn--ghost btn--sm" onclick="delRitual('${type}', ${idx}, ${i})">×</button>
            </div>
          `).join('')}
          <button class="btn btn--ghost btn--sm" onclick="addRitual('${type}', ${idx})">+ เพิ่ม</button>
        </div>
      </details>

      <details open style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">✨ Add-ons สำหรับแพ็คเกจนี้ (${(p.availableAddons||[]).length} จาก ${allAddons.length})</summary>
        <p style="color:var(--color-text-muted); font-size: 0.85rem; margin: 8px 0;">ติ๊กเลือก add-on ที่ลูกค้าสามารถเพิ่มในแพ็คเกจนี้ได้</p>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px;">
          ${allAddons.map(a => `
            <label style="display:flex;align-items:center;gap:8px;background:var(--color-cream);padding:10px 12px;border-radius:8px;border:1px solid var(--color-line);">
              <input type="checkbox" ${(p.availableAddons||[]).includes(a.id)?'checked':''} onchange="toggleAddon('${type}', ${idx}, '${a.id}', this.checked)">
              <div style="flex:1;">
                <div style="font-weight:500;font-size:0.9rem;">${esc(a.name)}</div>
                <div style="color:var(--color-text-muted); font-size:0.75rem;">+ ${a.price?.toLocaleString()||0}฿ / ${esc(a.unit || '')}</div>
              </div>
            </label>
          `).join('') || '<div style="color:var(--color-text-muted);">ยังไม่มี add-on ใน library · เพิ่มในหมวด "Add-ons Library"</div>'}
        </div>
      </details>

      <details style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">🍽 เมนูที่เลือกได้</summary>
        <div style="margin-top:12px;">
          ${['buffet','chinese','thai'].map(m => `
            <label style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;">
              <input type="checkbox" ${(p.availableMenus||[]).includes(m)?'checked':''} onchange="toggleMenu('${type}', ${idx}, '${m}', this.checked)">
              ${DATA.menus?.[m]?.name || m}
            </label>
          `).join('')}
        </div>
      </details>

      <div class="field" style="margin-top:12px;"><label>หมายเหตุ</label><textarea oninput="DATA.packages['${type}'][${idx}].notes = this.value; persist()">${esc(p.notes)}</textarea></div>
    </div>
  `).join('') || '<div class="empty-state">ยังไม่มีแพ็คเกจ คลิก "+ เพิ่มแพ็คเกจใหม่"</div>';
}

window.movePkg = (type, idx, dir) => {
  const list = DATA.packages[type];
  const j = idx + dir;
  if (j < 0 || j >= list.length) return;
  [list[idx], list[j]] = [list[j], list[idx]];
  persist(); render();
};
window.delPkg = (type, idx) => {
  if (!confirm('ลบแพ็คเกจนี้?')) return;
  DATA.packages[type].splice(idx, 1); persist(); render();
};
window.addInclItem = (type, idx) => { DATA.packages[type][idx].includedItems.push('รายการใหม่'); persist(); render(); };
window.delInclItem = (type, idx, i) => { DATA.packages[type][idx].includedItems.splice(i, 1); persist(); render(); };
window.addRitual = (type, idx) => {
  DATA.packages[type][idx].rituals = DATA.packages[type][idx].rituals || [];
  DATA.packages[type][idx].rituals.push({ id: 'ritual_' + Date.now(), name: 'พิธีใหม่', deductIfRemoved: 5000 });
  persist(); render();
};
window.delRitual = (type, idx, i) => { DATA.packages[type][idx].rituals.splice(i, 1); persist(); render(); };

window.toggleSlot = (type, idx, slotId, checked) => {
  const p = DATA.packages[type][idx];
  p.availableTimeSlots = p.availableTimeSlots || [];
  if (checked && !p.availableTimeSlots.includes(slotId)) {
    p.availableTimeSlots.push(slotId);
    p.basePricing = p.basePricing || {};
    if (!p.basePricing[slotId]) p.basePricing[slotId] = { high: 100000, low: 90000 };
  }
  if (!checked) p.availableTimeSlots = p.availableTimeSlots.filter(x => x !== slotId);
  persist(); render();
};
window.setBasePrice = (type, idx, slotId, season, value) => {
  const p = DATA.packages[type][idx];
  p.basePricing = p.basePricing || {};
  p.basePricing[slotId] = p.basePricing[slotId] || { high: 0, low: 0 };
  p.basePricing[slotId][season] = Number(value) || 0;
  persist();
};
window.setOverride = (type, idx, slotId, n, season, value) => {
  const p = DATA.packages[type][idx];
  p.guestPricingOverrides = p.guestPricingOverrides || {};
  p.guestPricingOverrides[slotId] = p.guestPricingOverrides[slotId] || {};
  p.guestPricingOverrides[slotId][n] = p.guestPricingOverrides[slotId][n] || {};
  if (value === '' || value == null) {
    delete p.guestPricingOverrides[slotId][n][season];
    if (Object.keys(p.guestPricingOverrides[slotId][n]).length === 0) {
      delete p.guestPricingOverrides[slotId][n];
    }
    if (Object.keys(p.guestPricingOverrides[slotId]).length === 0) {
      delete p.guestPricingOverrides[slotId];
    }
  } else {
    p.guestPricingOverrides[slotId][n][season] = Number(value);
  }
  persist();
};
window.toggleMenu = (type, idx, menu, checked) => {
  const p = DATA.packages[type][idx];
  p.availableMenus = p.availableMenus || [];
  if (checked && !p.availableMenus.includes(menu)) p.availableMenus.push(menu);
  if (!checked) p.availableMenus = p.availableMenus.filter(x => x !== menu);
  persist();
};
window.toggleAddon = (type, idx, addonId, checked) => {
  const p = DATA.packages[type][idx];
  p.availableAddons = p.availableAddons || [];
  if (checked && !p.availableAddons.includes(addonId)) p.availableAddons.push(addonId);
  if (!checked) p.availableAddons = p.availableAddons.filter(x => x !== addonId);
  persist();
};

// ---------- Rental ----------
function renderRental(root) {
  DATA.venueFees = DATA.venueFees || { rental: [], addons: [] };
  const list = DATA.venueFees.rental;
  root.innerHTML = `
    <h2 style="margin-top:0;">ค่าเช่าสถานที่</h2>
    <button class="btn btn--primary btn--sm" id="addRent">+ เพิ่มรายการ</button>
    <div id="rentList" style="margin-top:16px;"></div>
  `;
  document.getElementById('addRent').addEventListener('click', () => {
    list.push({ id: 'rent_'+Date.now(), name: 'รายการใหม่', duration: '1 วัน', price: 10000, description: '', image: '' });
    persist(); render();
  });
  document.getElementById('rentList').innerHTML = list.map((r, i) => `
    <div class="admin-item">
      <div class="admin-item__head"><strong>${esc(r.name)}</strong>
        <button class="btn btn--ghost btn--sm" onclick="DATA.venueFees.rental.splice(${i},1); persist(); render();">ลบ</button>
      </div>
      <div class="row">
        <div class="field"><label>ชื่อ</label><input value="${esc(r.name)}" oninput="DATA.venueFees.rental[${i}].name = this.value; persist()"></div>
        <div class="field" style="flex:0 0 180px;"><label>ระยะเวลา</label><input value="${esc(r.duration)}" oninput="DATA.venueFees.rental[${i}].duration = this.value; persist()"></div>
        <div class="field" style="flex:0 0 140px;"><label>ราคา (฿)</label><input type="number" value="${r.price||0}" oninput="DATA.venueFees.rental[${i}].price = Number(this.value); persist()"></div>
      </div>
      <div class="field"><label>คำอธิบาย</label><input value="${esc(r.description)}" oninput="DATA.venueFees.rental[${i}].description = this.value; persist()"></div>
      <div class="field"><label>URL รูป</label>
        <input value="${esc(r.image)}" oninput="DATA.venueFees.rental[${i}].image = this.value; persist(); refreshImgEditor('imgEdRen_${i}', this.value, &quot;DATA.venueFees.rental[${i}]&quot;, '4/3')">
        <div id="imgEdRen_${i}">${imgPosEditor(r.image, `DATA.venueFees.rental[${i}]`, '4/3')}</div>
      </div>
    </div>
  `).join('') || '<div class="empty-state">ยังไม่มีรายการ</div>';
}

// ---------- Add-ons Library ----------
function renderAddons(root) {
  DATA.venueFees = DATA.venueFees || { rental: [], addons: [] };
  const list = DATA.venueFees.addons;
  root.innerHTML = `
    <h2 style="margin-top:0;">Add-ons Library</h2>
    <p style="color:var(--color-text-muted);">รายการ add-on ทั้งหมดที่ shared ระหว่างแพ็คเกจ · เพิ่มที่นี่ แล้วไปติ๊กในหน้าแพ็คเกจว่าจะให้ add-on ไหนใช้กับแพ็คเกจไหนได้</p>
    <button class="btn btn--primary btn--sm" id="addAdd">+ เพิ่มรายการ</button>
    <div id="addList" style="margin-top:16px;"></div>
  `;
  document.getElementById('addAdd').addEventListener('click', () => {
    list.push({ id: 'addon_'+Date.now(), name: 'บริการเสริมใหม่', unit: 'ชุด', price: 5000, description: '' });
    persist(); render();
  });
  document.getElementById('addList').innerHTML = list.map((a, i) => `
    <div class="admin-item">
      <div class="admin-item__head"><strong>${esc(a.name)}</strong>
        <button class="btn btn--ghost btn--sm" onclick="DATA.venueFees.addons.splice(${i},1); persist(); render();">ลบ</button>
      </div>
      <div class="row">
        <div class="field" style="flex:0 0 200px;"><label>ID</label><input value="${esc(a.id)}" oninput="DATA.venueFees.addons[${i}].id = this.value; persist()"></div>
        <div class="field"><label>ชื่อ</label><input value="${esc(a.name)}" oninput="DATA.venueFees.addons[${i}].name = this.value; persist()"></div>
        <div class="field" style="flex:0 0 120px;"><label>หน่วย</label><input value="${esc(a.unit)}" oninput="DATA.venueFees.addons[${i}].unit = this.value; persist()"></div>
        <div class="field" style="flex:0 0 140px;"><label>ราคา (฿)</label><input type="number" value="${a.price||0}" oninput="DATA.venueFees.addons[${i}].price = Number(this.value); persist()"></div>
      </div>
      <div class="field"><label>คำอธิบาย</label><input value="${esc(a.description)}" oninput="DATA.venueFees.addons[${i}].description = this.value; persist()"></div>
    </div>
  `).join('') || '<div class="empty-state">ยังไม่มี add-on</div>';
}

// ---------- Menu ----------
function renderMenu(root, type) {
  DATA.menus = DATA.menus || {};
  const menu = DATA.menus[type] || (DATA.menus[type] = { name: type, sets: [] });
  const isPerPerson = type === 'buffet';
  root.innerHTML = `
    <h2 style="margin-top:0;">เมนู: ${esc(menu.name)}</h2>
    <div class="field"><label>ชื่อหมวด</label><input id="m_name" value="${esc(menu.name)}"></div>
    <div class="field"><label>คำอธิบายสั้น</label><input id="m_short" value="${esc(menu.shortDescription)}"></div>
    <div class="field"><label>คำอธิบาย</label><textarea id="m_desc">${esc(menu.description)}</textarea></div>
    <div class="row">
      <div class="field"><label>URL รูปหัว</label>
        <input id="m_img" value="${esc(menu.image)}" oninput="DATA.menus['${type}'].image = this.value; persist(); refreshImgEditor('imgEdMenu_${type}', this.value, &quot;DATA.menus['${type}']&quot;, '16/9')">
        <div id="imgEdMenu_${type}">${imgPosEditor(menu.image, `DATA.menus['${type}']`, '16/9')}</div>
      </div>
      <div class="field" style="flex:0 0 100px;"><label>Icon</label><input id="m_icon" value="${esc(menu.icon)}"></div>
    </div>
    <div class="admin-actions"><button class="btn btn--primary btn--sm" id="saveMenuMeta">บันทึกข้อมูลหมวด</button></div>

    <h3 style="margin-top:32px;">Sets</h3>
    <button class="btn btn--primary btn--sm" id="addSet">+ เพิ่ม Set</button>
    <div id="setList" style="margin-top:16px;"></div>
  `;
  document.getElementById('saveMenuMeta').addEventListener('click', () => {
    menu.name = val('m_name'); menu.shortDescription = val('m_short');
    menu.description = val('m_desc'); menu.image = val('m_img'); menu.icon = val('m_icon');
    persist(); toast('บันทึกแล้ว');
  });
  document.getElementById('addSet').addEventListener('click', () => {
    menu.sets = menu.sets || [];
    const newSet = { id: type+'_set_'+Date.now(), name: 'Set ใหม่', description: '', image: '', items: [] };
    if (isPerPerson) newSet.pricePerPerson = 500;
    else { newSet.pricePerTable = 5000; newSet.tableSize = 10; }
    menu.sets.push(newSet);
    persist(); render();
  });
  document.getElementById('setList').innerHTML = (menu.sets || []).map((s, i) => `
    <div class="admin-item">
      <div class="admin-item__head"><strong>${esc(s.name)}</strong>
        <button class="btn btn--ghost btn--sm" onclick="DATA.menus['${type}'].sets.splice(${i},1); persist(); render();">ลบ</button>
      </div>
      <div class="row">
        <div class="field"><label>ชื่อ Set</label><input value="${esc(s.name)}" oninput="DATA.menus['${type}'].sets[${i}].name = this.value; persist()"></div>
        ${isPerPerson
          ? `<div class="field" style="flex:0 0 160px;"><label>ราคา/ท่าน</label><input type="number" value="${s.pricePerPerson||0}" oninput="DATA.menus['${type}'].sets[${i}].pricePerPerson = Number(this.value); persist()"></div>`
          : `<div class="field" style="flex:0 0 160px;"><label>ราคา/โต๊ะ</label><input type="number" value="${s.pricePerTable||0}" oninput="DATA.menus['${type}'].sets[${i}].pricePerTable = Number(this.value); persist()"></div>
             <div class="field" style="flex:0 0 100px;"><label>คน/โต๊ะ</label><input type="number" value="${s.tableSize||10}" oninput="DATA.menus['${type}'].sets[${i}].tableSize = Number(this.value); persist()"></div>`}
      </div>
      <div class="field"><label>คำอธิบาย</label><input value="${esc(s.description)}" oninput="DATA.menus['${type}'].sets[${i}].description = this.value; persist()"></div>
      <div class="field"><label>URL รูป</label>
        <input value="${esc(s.image)}" oninput="DATA.menus['${type}'].sets[${i}].image = this.value; persist(); refreshImgEditor('imgEdSet_${type}_${i}', this.value, &quot;DATA.menus['${type}'].sets[${i}]&quot;, '4/3')">
        <div id="imgEdSet_${type}_${i}">${imgPosEditor(s.image, `DATA.menus['${type}'].sets[${i}]`, '4/3')}</div>
      </div>
      <details><summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">📋 รายการอาหาร (${(s.items||[]).length})</summary>
        <div style="margin-top:12px;">
          ${(s.items || []).map((it, j) => `
            <div class="row" style="margin-bottom:6px;">
              <div class="field" style="margin:0;"><input value="${esc(it)}" oninput="DATA.menus['${type}'].sets[${i}].items[${j}] = this.value; persist()"></div>
              <button class="btn btn--ghost btn--sm" onclick="DATA.menus['${type}'].sets[${i}].items.splice(${j},1); persist(); render();">×</button>
            </div>
          `).join('')}
          <button class="btn btn--ghost btn--sm" onclick="DATA.menus['${type}'].sets[${i}].items.push('เมนูใหม่'); persist(); render();">+ เพิ่ม</button>
        </div>
      </details>
    </div>
  `).join('') || '<div class="empty-state">ยังไม่มี Set</div>';
}

// ---------- Ceremonies ----------
function renderCeremonies(root) {
  DATA.ceremonies = DATA.ceremonies || [];
  const list = DATA.ceremonies;
  root.innerHTML = `
    <h2 style="margin-top:0;">ประเภทพิธี (ใช้สำหรับ tag รูปในแกลเลอรี)</h2>
    <button class="btn btn--primary btn--sm" id="addCer">+ เพิ่มประเภทพิธี</button>
    <div id="cerList" style="margin-top:16px;"></div>
  `;
  document.getElementById('addCer').addEventListener('click', () => {
    list.push({ id: 'ceremony_'+Date.now(), name: 'พิธีใหม่' });
    persist(); render();
  });
  document.getElementById('cerList').innerHTML = list.map((c, i) => `
    <div class="row" style="margin-bottom:8px;">
      <div class="field" style="margin:0; flex: 0 0 200px;"><input placeholder="id" value="${esc(c.id)}" oninput="DATA.ceremonies[${i}].id = this.value; persist()"></div>
      <div class="field" style="margin:0;"><input placeholder="ชื่อพิธี" value="${esc(c.name)}" oninput="DATA.ceremonies[${i}].name = this.value; persist()"></div>
      <button class="btn btn--ghost btn--sm" onclick="DATA.ceremonies.splice(${i},1); persist(); render();">ลบ</button>
    </div>
  `).join('') || '<div class="empty-state">ยังไม่มีประเภทพิธี</div>';
}

// ---------- Zones ----------
function renderZones(root) {
  DATA.gallery = DATA.gallery || { zones: [], photos: [] };
  const zones = DATA.gallery.zones;
  root.innerHTML = `
    <h2 style="margin-top:0;">โซนสถานที่</h2>
    <button class="btn btn--primary btn--sm" id="addZone">+ เพิ่มโซน</button>
    <div id="zoneList" style="margin-top:16px;"></div>
  `;
  document.getElementById('addZone').addEventListener('click', () => {
    zones.push({ id: 'zone_'+Date.now(), name: 'โซนใหม่', description: '' });
    persist(); render();
  });
  document.getElementById('zoneList').innerHTML = zones.map((z, i) => `
    <div class="admin-item">
      <div class="admin-item__head"><strong>${esc(z.name)}</strong>
        <button class="btn btn--ghost btn--sm" onclick="DATA.gallery.zones.splice(${i},1); persist(); render();">ลบ</button>
      </div>
      <div class="row">
        <div class="field" style="flex:0 0 200px;"><label>ID</label><input value="${esc(z.id)}" oninput="DATA.gallery.zones[${i}].id = this.value; persist()"></div>
        <div class="field"><label>ชื่อโซน</label><input value="${esc(z.name)}" oninput="DATA.gallery.zones[${i}].name = this.value; persist()"></div>
      </div>
      <div class="field"><label>คำอธิบาย</label><input value="${esc(z.description)}" oninput="DATA.gallery.zones[${i}].description = this.value; persist()"></div>
    </div>
  `).join('') || '<div class="empty-state">ยังไม่มีโซน</div>';
}

// ---------- Photos ----------
function renderPhotos(root) {
  DATA.gallery = DATA.gallery || { zones: [], photos: [] };
  const photos = DATA.gallery.photos;
  const zones = DATA.gallery.zones || [];
  const ceremonies = DATA.ceremonies || [];
  root.innerHTML = `
    <h2 style="margin-top:0;">รูปภาพในแกลเลอรี</h2>
    <p style="color:var(--color-text-muted);">ใส่ URL รูปจาก hosting (Imgur, Cloudinary, ฯลฯ) หรือ relative path เช่น <code>./images/p1.jpg</code></p>
    <button class="btn btn--primary btn--sm" id="addPhoto">+ เพิ่มรูป</button>
    <div id="photoList" style="margin-top:16px;"></div>
  `;
  document.getElementById('addPhoto').addEventListener('click', () => {
    photos.push({ id: 'p_'+Date.now(), url: '', caption: '', zone: zones[0]?.id || '', ceremony: ceremonies[0]?.id || '' });
    persist(); render();
  });
  document.getElementById('photoList').innerHTML = photos.map((p, i) => `
    <div class="admin-item">
      <div class="admin-item__head">
        <strong>${esc(p.caption || 'ไม่มี caption')}</strong>
        <button class="btn btn--ghost btn--sm" onclick="DATA.gallery.photos.splice(${i},1); persist(); render();">ลบ</button>
      </div>
      <div class="field"><label>URL รูป</label>
        <input value="${esc(p.url)}" oninput="DATA.gallery.photos[${i}].url = this.value; persist(); refreshImgEditor('imgEdPhoto_${i}', this.value, 'DATA.gallery.photos[${i}]', '1/1')">
        <div id="imgEdPhoto_${i}">${imgPosEditor(p.url, `DATA.gallery.photos[${i}]`, '1/1')}</div>
      </div>
      <div class="field"><label>Caption</label><input value="${esc(p.caption)}" oninput="DATA.gallery.photos[${i}].caption = this.value; persist()"></div>
      <div class="row">
        <div class="field"><label>โซน</label>
          <select onchange="DATA.gallery.photos[${i}].zone = this.value; persist()">
            ${zones.map(z => `<option value="${esc(z.id)}" ${z.id===p.zone?'selected':''}>${esc(z.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>ประเภทพิธี</label>
          <select onchange="DATA.gallery.photos[${i}].ceremony = this.value; persist()">
            ${ceremonies.map(c => `<option value="${esc(c.id)}" ${c.id===p.ceremony?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `).join('') || '<div class="empty-state">ยังไม่มีรูป</div>';
}

// ============================================
// Auspicious wedding dates editor
// ============================================
function renderAuspicious(root) {
  DATA.auspiciousDates = DATA.auspiciousDates || {};
  const years = Object.keys(DATA.auspiciousDates).sort();
  const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  let activeYear = window._auspActiveYear || years[0] || '2569';
  if (!DATA.auspiciousDates[activeYear]) DATA.auspiciousDates[activeYear] = {};

  root.innerHTML = `
    <h2 style="margin-top:0;">💍 ฤกษ์งานแต่ง (ดิถีเรียงหมอน)</h2>
    <p style="color:var(--color-text-muted);">คลิกวันที่เพื่อ toggle ว่าเป็นฤกษ์ดีหรือไม่ · ใช้แสดงในหน้า "ตารางวันว่าง" (ปี พ.ศ.)</p>

    <div style="display:flex;gap:8px;align-items:center;margin:16px 0;flex-wrap:wrap;">
      <strong>เลือกปี:</strong>
      ${years.map(y => `<button class="btn btn--${y === activeYear ? 'primary' : 'ghost'} btn--sm" onclick="window._auspActiveYear='${y}'; render();">${y}</button>`).join('')}
      <input id="newYear" type="number" min="2568" max="2599" placeholder="เพิ่มปี (พ.ศ.)" style="width:140px;">
      <button class="btn btn--ghost btn--sm" onclick="addAuspYear()">+ เพิ่มปี</button>
      ${years.length > 1 ? `<button class="btn btn--ghost btn--sm" style="margin-left:auto;color:#B23A2E;" onclick="if(confirm('ลบปี ${activeYear}?')){delete DATA.auspiciousDates['${activeYear}'];window._auspActiveYear=null;persist();render();}">ลบปี ${activeYear}</button>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr;gap:14px;" id="monthEditors">
      ${[1,2,3,4,5,6,7,8,9,10,11,12].map(mo => renderMonthEditor(activeYear, mo, TH_MONTHS)).join('')}
    </div>
  `;
}

function renderMonthEditor(year, month, monthNames) {
  const mKey = String(month).padStart(2,'0');
  const days = (DATA.auspiciousDates[year]?.[mKey] || []).sort((a,b) => a-b);
  const adYear = parseInt(year) - 543;
  const lastDay = new Date(adYear, month, 0).getDate();
  const firstDow = (new Date(adYear, month - 1, 1).getDay() + 6) % 7;

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += `<div></div>`;
  for (let d = 1; d <= lastDay; d++) {
    const sel = days.includes(d);
    cells += `<button type="button" onclick="toggleAuspDay('${year}','${mKey}',${d})" style="aspect-ratio:1;border:1px solid ${sel?'var(--color-gold)':'var(--color-line)'};background:${sel?'linear-gradient(135deg,#FFEEF2,#FFE0E8)':'var(--color-ivory)'};color:${sel?'#A8505F':'var(--color-text)'};font-weight:${sel?'600':'400'};border-radius:6px;cursor:pointer;font-size:0.85rem;font-variant-numeric:tabular-nums;">${d}${sel?' 💍':''}</button>`;
  }
  return `
    <div style="background:var(--color-ivory);border:1px solid var(--color-line);border-radius:8px;padding:12px 14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong>${monthNames[month-1]}</strong>
        <span style="color:var(--color-gold-dark);font-size:0.85rem;">${days.length} วันฤกษ์ดี</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:0.72rem;color:var(--color-text-muted);text-align:center;margin-bottom:4px;">
        <div>จ</div><div>อ</div><div>พ</div><div>พฤ</div><div>ศ</div><div>ส</div><div>อา</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">${cells}</div>
    </div>
  `;
}

function toggleAuspDay(year, mKey, d) {
  DATA.auspiciousDates[year] = DATA.auspiciousDates[year] || {};
  DATA.auspiciousDates[year][mKey] = DATA.auspiciousDates[year][mKey] || [];
  const arr = DATA.auspiciousDates[year][mKey];
  const i = arr.indexOf(d);
  if (i >= 0) arr.splice(i, 1);
  else { arr.push(d); arr.sort((a,b)=>a-b); }
  persist();
  render();
}

function addAuspYear() {
  const y = document.getElementById('newYear').value;
  if (!y) return;
  if (!DATA.auspiciousDates[y]) DATA.auspiciousDates[y] = {};
  window._auspActiveYear = y;
  persist();
  render();
}

// ============================================
// Bookings Google Sheet config
// ============================================
function renderBookings(root) {
  DATA.bookingsSheet = DATA.bookingsSheet || {};
  const b = DATA.bookingsSheet;
  root.innerHTML = `
    <h2 style="margin-top:0;">📅 ตั้งค่า Google Sheet สำหรับตารางจอง</h2>
    <p style="color:var(--color-text-muted);font-size:0.95rem;">หน้า "ตารางวันว่าง" จะดึงข้อมูลจาก Google Sheet ที่นี่ — ลูกค้าจะเห็นวันที่ถูกจองแล้ว</p>

    <div class="alert" style="background:#FBF6EF;border-left-color:var(--color-gold-dark);">
      <strong>วิธีตั้งค่า:</strong><br>
      1. เปิด Google Sheet ของคุณ<br>
      2. <strong>File → Share → Publish to web</strong><br>
      3. เลือก tab "งาน" (หรือชื่อ tab ที่มีตารางจอง)<br>
      4. เลือก format = <strong>CSV (comma-separated values)</strong><br>
      5. กด <strong>Publish</strong> → คัดลอก URL ที่ได้มาวางใน "CSV URL" ด้านล่าง<br>
      <small style="color:var(--color-text-muted);">URL ที่ถูกต้องจะมีคำว่า <code>/pub?</code> และ <code>output=csv</code></small>
    </div>

    <div class="field"><label>CSV URL</label>
      <input id="b_url" value="${esc(b.csvUrl)}" placeholder="https://docs.google.com/.../pub?gid=...&single=true&output=csv" style="font-family:monospace;font-size:0.85rem;">
    </div>

    <h3 style="margin-top:24px;">ชื่อคอลัมน์ในชีท</h3>
    <p style="color:var(--color-text-muted);font-size:0.88rem;">ระบบจะมองหาคอลัมน์เหล่านี้ในแถวหัวตาราง · ใส่คำที่อยู่ในชื่อคอลัมน์ (พอบางส่วน)</p>
    <div class="row">
      <div class="field"><label>คอลัมน์ "วันจัดงาน"</label><input id="b_date" value="${esc(b.dateColumn || 'วันจัดงาน')}"></div>
      <div class="field"><label>คอลัมน์ "ชื่อลูกค้า"</label><input id="b_cust" value="${esc(b.customerColumn || 'ชื่อลูกค้า')}"></div>
    </div>
    <div class="row">
      <div class="field"><label>คอลัมน์ "แพ็คเกจ"</label><input id="b_pkg" value="${esc(b.packageColumn || 'แพ็คเกจ')}"></div>
      <div class="field"><label>คอลัมน์ "ช่วงเวลา"</label><input id="b_slot" value="${esc(b.timeSlotColumn || 'ช่วงเวลา')}"></div>
    </div>

    <div class="admin-actions"><button class="btn btn--primary" onclick="saveBookings()">บันทึก</button>
      <button class="btn btn--ghost" onclick="testBookings()">🔍 ทดสอบดึงข้อมูล</button>
    </div>
    <div id="bookingsTest" style="margin-top:14px;"></div>
  `;
}

function saveBookings() {
  DATA.bookingsSheet = DATA.bookingsSheet || {};
  DATA.bookingsSheet.csvUrl = val('b_url').trim();
  DATA.bookingsSheet.dateColumn = val('b_date').trim() || 'วันจัดงาน';
  DATA.bookingsSheet.customerColumn = val('b_cust').trim() || 'ชื่อลูกค้า';
  DATA.bookingsSheet.packageColumn = val('b_pkg').trim() || 'แพ็คเกจ';
  DATA.bookingsSheet.timeSlotColumn = val('b_slot').trim() || 'ช่วงเวลา';
  persist();
  toast('บันทึกแล้ว');
}

async function testBookings() {
  const out = document.getElementById('bookingsTest');
  out.innerHTML = '<div style="color:var(--color-text-muted);">กำลังดึงข้อมูล...</div>';
  const url = val('b_url').trim();
  if (!url) { out.innerHTML = '<div style="color:#B23A2E;">กรุณาใส่ CSV URL ก่อน</div>'; return; }
  try {
    const r = await fetch(url + '&_=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    const lines = text.split('\n').filter(x => x.trim()).length;
    out.innerHTML = `<div style="color:var(--color-success);">✓ ดึงสำเร็จ · พบ ${lines} บรรทัด · ไปดูที่หน้า <a href="./calendar/" target="_blank">ตารางวันว่าง</a></div>`;
  } catch(e) {
    out.innerHTML = `<div style="color:#B23A2E;">✗ ดึงไม่สำเร็จ: ${e.message}<br><small>ตรวจสอบว่า URL เป็น Publish to web → CSV และมี output=csv</small></div>`;
  }
}

// ============================================
// GitHub publish (live editing)
// ============================================
function renderPublish(root) {
  DATA.github = DATA.github || {};
  const g = DATA.github;
  const hasToken = !!localStorage.getItem('chaan_gh_token');

  root.innerHTML = `
    <h2 style="margin-top:0;">🚀 เผยแพร่ขึ้น GitHub (Live Edit)</h2>
    <p style="color:var(--color-text-muted);">เมื่อบันทึก token แล้ว ปุ่ม <strong>"💾 บันทึก & เผยแพร่"</strong> จะอัปโหลด data.json ขึ้น GitHub โดยตรง — ลูกค้าเห็นภายใน 1-2 นาที</p>

    <div class="alert" style="background:#FBF6EF;border-left-color:var(--color-gold-dark);">
      <strong>วิธีสร้าง GitHub Personal Access Token:</strong><br>
      1. เปิด <a href="https://github.com/settings/tokens/new?description=Chaan%20Wedding%20Admin&scopes=repo" target="_blank">GitHub Token settings</a> (ลิงก์ตั้งไว้แล้ว)<br>
      2. ตั้งชื่อ token (เช่น "Chaan Wedding Admin")<br>
      3. Expiration เลือก <strong>No expiration</strong> หรือ 1 ปี<br>
      4. ✅ ติ๊ก <strong>repo</strong> scope (สำคัญ)<br>
      5. กด <strong>Generate token</strong> → คัดลอก token ที่ขึ้นต้นด้วย <code>ghp_</code> หรือ <code>github_pat_</code><br>
      6. วาง token ในช่องด้านล่าง<br>
      <small style="color:#B23A2E;">⚠ Token จะเก็บไว้ใน browser นี้เท่านั้น · ไม่บันทึกลง data.json</small>
    </div>

    <h3 style="margin-top:24px;">การตั้งค่า Repo</h3>
    <div class="row">
      <div class="field"><label>Owner (username)</label><input id="gh_owner" value="${esc(g.owner || 'ajarnbae')}"></div>
      <div class="field"><label>Repo name</label><input id="gh_repo" value="${esc(g.repo || 'chaan-wedding-info')}"></div>
    </div>
    <div class="row">
      <div class="field"><label>Branch</label><input id="gh_branch" value="${esc(g.branch || 'main')}"></div>
      <div class="field"><label>Data path</label><input id="gh_path" value="${esc(g.dataPath || 'data/data.json')}"></div>
    </div>

    <h3 style="margin-top:24px;">GitHub Token ${hasToken ? '<span style="color:var(--color-success);font-size:0.85rem;">· ✓ มี token แล้ว</span>' : '<span style="color:#B23A2E;font-size:0.85rem;">· ยังไม่มี token</span>'}</h3>
    <div class="field"><label>Token (ขึ้นต้นด้วย ghp_ หรือ github_pat_)</label>
      <input id="gh_token" type="password" placeholder="${hasToken ? '●●●●●●●●●●●● (มี token แล้ว — เว้นว่างถ้าไม่เปลี่ยน)' : 'ghp_xxxxxxxxxxxxxxxxxxxxx'}" style="font-family:monospace;font-size:0.85rem;">
    </div>

    <div class="admin-actions">
      <button class="btn btn--primary" onclick="saveGithubConfig()">บันทึกการตั้งค่า</button>
      <button class="btn btn--primary" onclick="publishToGitHub()" style="background:linear-gradient(135deg,#28a745,#1e7e34);">💾 บันทึก &amp; เผยแพร่ data.json ขึ้น GitHub</button>
      ${hasToken ? '<button class="btn btn--ghost" onclick="if(confirm(\'ลบ token?\')){localStorage.removeItem(\'chaan_gh_token\');render();}" style="color:#B23A2E;">🗑 ลบ token</button>' : ''}
    </div>

    <div id="ghStatus" style="margin-top:16px;"></div>
  `;
}

function saveGithubConfig() {
  DATA.github = DATA.github || {};
  DATA.github.owner = val('gh_owner').trim();
  DATA.github.repo = val('gh_repo').trim();
  DATA.github.branch = val('gh_branch').trim() || 'main';
  DATA.github.dataPath = val('gh_path').trim() || 'data/data.json';
  const newToken = val('gh_token');
  if (newToken) {
    localStorage.setItem('chaan_gh_token', newToken);
    document.getElementById('gh_token').value = '';
  }
  persist();
  toast('บันทึกแล้ว');
  render();
}

async function publishToGitHub() {
  const status = document.getElementById('ghStatus');
  const token = localStorage.getItem('chaan_gh_token');
  if (!token) { status.innerHTML = '<div style="color:#B23A2E;">✗ ยังไม่มี GitHub token — กรอก token แล้วบันทึกก่อน</div>'; return; }
  const g = DATA.github || {};
  if (!g.owner || !g.repo) { status.innerHTML = '<div style="color:#B23A2E;">✗ กรุณากรอก Owner และ Repo</div>'; return; }
  if (!confirm('ยืนยันเผยแพร่ data.json ขึ้น GitHub?\nลูกค้าจะเห็นการเปลี่ยนแปลงภายใน 1-2 นาที')) return;

  status.innerHTML = '<div style="color:var(--color-text-muted);">กำลังเผยแพร่...</div>';
  const apiBase = `https://api.github.com/repos/${g.owner}/${g.repo}/contents/${g.dataPath}`;
  try {
    let sha = null;
    const getRes = await fetch(apiBase + '?ref=' + (g.branch || 'main'), {
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
    });
    if (getRes.ok) {
      const cur = await getRes.json();
      sha = cur.sha;
    } else if (getRes.status !== 404) {
      throw new Error('GET ' + getRes.status + ': ' + (await getRes.text()).slice(0,200));
    }
    const json = JSON.stringify(DATA, null, 2);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify({
        message: 'Update data.json from admin · ' + new Date().toISOString(),
        content: b64,
        sha: sha,
        branch: g.branch || 'main'
      })
    });
    if (!putRes.ok) throw new Error('PUT ' + putRes.status + ': ' + (await putRes.text()).slice(0,300));
    const result = await putRes.json();
    status.innerHTML = `<div style="background:#E8F5E9;color:#1B5E20;padding:14px 16px;border-radius:8px;border:1px solid #4CAF50;">
      ✓ เผยแพร่สำเร็จ · commit <code>${result.commit?.sha?.slice(0,7) || ''}</code><br>
      <small>GitHub Pages จะ rebuild ภายใน 1-2 นาที — ลูกค้าเห็นเมื่อโหลดหน้าใหม่</small>
    </div>`;
  } catch(e) {
    status.innerHTML = `<div style="color:#B23A2E;background:#FDECEA;padding:14px 16px;border-radius:8px;">✗ ผิดพลาด: ${esc(e.message)}<br><small>ตรวจสอบ token (ต้องมี repo scope) และ owner/repo/branch</small></div>`;
  }
}

// ---------- Raw JSON ----------
function renderRaw(root) {
  root.innerHTML = `
    <h2 style="margin-top:0;">JSON ดิบทั้งหมด</h2>
    <p style="color:var(--color-text-muted);">แก้ JSON ทั้งหมดได้โดยตรง (ระวังโครงสร้าง)</p>
    <textarea id="rawText" style="min-height:480px;font-family:Consolas,Monaco,monospace;font-size:0.85rem;">${esc(JSON.stringify(DATA, null, 2))}</textarea>
    <div class="admin-actions"><button class="btn btn--primary" id="rawSave">บันทึก JSON</button></div>
  `;
  document.getElementById('rawSave').addEventListener('click', () => {
    try {
      DATA = JSON.parse(document.getElementById('rawText').value);
      persist(); toast('บันทึกแล้ว');
    } catch (e) { alert('JSON ไม่ถูกต้อง: ' + e.message); }
  });
}

// ---------- Helpers ----------
function esc(s) { return CW.escape(s); }
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--color-brown-dark);color:#fff;padding:12px 20px;border-radius:8px;z-index:200;box-shadow:var(--shadow-lg);font-size:0.95rem;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._h);
  t._h = setTimeout(() => t.style.display = 'none', 2200);
}
