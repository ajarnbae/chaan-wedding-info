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

    <div class="admin-actions"><button class="btn btn--primary" id="saveSite">บันทึก</button></div>
  `;
  document.getElementById('saveSite').addEventListener('click', () => {
    s.name = val('site_name'); s.logoText = val('site_logo');
    s.tagline = val('site_tagline'); s.description = val('site_desc');
    s.heroImage = val('site_hero');
    c.phone = val('c_phone'); c.line = val('c_line');
    c.facebook = val('c_fb'); c.instagram = val('c_ig');
    c.email = val('c_email'); c.address = val('c_addr'); c.mapLink = val('c_map');
    DATA.seasonInfo = DATA.seasonInfo || {};
    DATA.seasonInfo.lowSeasonMonths = val('low_months').split(',').map(x => parseInt(x.trim(), 10)).filter(Boolean);
    persist();
    toast('บันทึกแล้ว');
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
      image: '', isFeatured: false, season: 'all',
      availableTimeSlots: defaultSlots,
      includedItems: [], rituals: [],
      basePricing, guestPricingOverrides: {},
      availableMenus: [], availableAddons: [],
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
        <div class="field"><label>URL รูป</label><input value="${esc(p.image)}" oninput="DATA.packages['${type}'][${idx}].image = this.value; persist()"></div>
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

      <details style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">🎯 Override ราคาเฉพาะ tier (เลือกใช้)</summary>
        <p style="color:var(--color-text-muted); font-size: 0.85rem; margin: 8px 0;">เว้นว่าง = ให้ระบบคำนวณจาก base × (n/100) อัตโนมัติ · ใส่ตัวเลขเพื่อ override</p>
        <div style="overflow-x:auto;">
          <table class="t" style="font-size: 0.85rem;">
            <thead><tr>
              <th>จำนวน</th>
              ${allSlots.filter(s => (p.availableTimeSlots||[]).includes(s.id)).map(s => `<th colspan="2">${esc(s.name)}<br><small style="color:var(--color-text-muted);">H · L</small></th>`).join('')}
            </tr></thead>
            <tbody>
              ${(DATA.guestCountTiers || []).map(n => {
                const slotCells = allSlots.filter(s => (p.availableTimeSlots||[]).includes(s.id)).map(s => {
                  const ov = (p.guestPricingOverrides||{})[s.id]?.[n] || {};
                  return `
                    <td><input type="number" style="width:90px;" placeholder="auto" value="${ov.high ?? ''}" oninput="setOverride('${type}', ${idx}, '${s.id}', ${n}, 'high', this.value)"></td>
                    <td><input type="number" style="width:90px;" placeholder="auto" value="${ov.low ?? ''}" oninput="setOverride('${type}', ${idx}, '${s.id}', ${n}, 'low', this.value)"></td>`;
                }).join('');
                return `<tr><td>${n}</td>${slotCells}</tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </details>

      <details style="margin-top:8px;">
        <summary style="cursor:pointer;color:var(--color-gold-dark);font-weight:500;">📋 สิ่งที่ได้รับ (${(p.includedItems||[]).length})</summary>
        <div style="margin-top:12px;">
          ${(p.includedItems || []).map((it, i) => `
            <div class="row" style="margin-bottom:6px;">
              <div class="field" style="margin:0;"><input value="${esc(it)}" oninput="DATA.packages['${type}'][${idx}].includedItems[${i}] = this.value; persist()"></div>
              <button class="btn btn--ghost btn--sm" onclick="delInclItem('${type}', ${idx}, ${i})">×</button>
            </div>
          `).join('')}
          <button class="btn btn--ghost btn--sm" onclick="addInclItem('${type}', ${idx})">+ เพิ่ม</button>
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
      <div class="field"><label>URL รูป</label><input value="${esc(r.image)}" oninput="DATA.venueFees.rental[${i}].image = this.value; persist()"></div>
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
      <div class="field"><label>URL รูปหัว</label><input id="m_img" value="${esc(menu.image)}"></div>
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
      <div class="field"><label>URL รูป</label><input value="${esc(s.image)}" oninput="DATA.menus['${type}'].sets[${i}].image = this.value; persist()"></div>
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
      <div class="row">
        ${p.url ? `<div style="flex:0 0 100px;"><img src="${esc(p.url)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;"></div>` : ''}
        <div class="field"><label>URL รูป</label><input value="${esc(p.url)}" oninput="DATA.gallery.photos[${i}].url = this.value; persist()"></div>
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
