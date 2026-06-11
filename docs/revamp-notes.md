# Revamp Notes — รอบที่ 1 (หน้าแรก + Global CSS) · 11 มิ.ย. 2026

UI/UX + CSS เท่านั้น — **ไม่มีการแก้เนื้อหา ราคา หรือข้อมูลธุรกิจใด ๆ** (ยกเว้น LINE ID ที่คุณสั่งเพิ่ม)

## 1. Audit สรุป

- โครงสร้างดี: vanilla HTML/CSS/JS, data-driven จาก `data/data.json`, nav/footer render จาก `js/common.js`
- จุดอ่อนเดิม: hero เตี้ย (420px) ไม่ immersive, featured package เป็นกล่องน้ำตาลเข้ม (dark luxury ขัด direction), ไม่มี section แนะนำ 3 โซนสถานที่บนหน้าแรก, ปุ่มเล็กกว่า 48px บนมือถือ, FAB ปุ่มเดียวบังเนื้อหาแต่ conversion ต่ำ, เงา/spacing แข็ง
- เนื้อหาที่ "ไม่มี" ในเว็บปัจจุบัน: Testimonials, FAQ → ข้ามตามกฎ (ดูข้อ 5)

## 2. สิ่งที่เปลี่ยน

### css/style.css (global)
- เพิ่ม token `--space-section: clamp(64px, 9vw, 104px)` → ทุก `.section` หายใจมากขึ้นบนจอใหญ่
- Typography scale: h1/h2 ใหญ่ขึ้นเล็กน้อย (fluid clamp), eyebrow 1.8rem
- เงานุ่มลงทั้ง 3 ระดับ (premium soft shadow)
- ปุ่ม: padding 14×28 + `min-height: 48px` (มาตรฐาน tap target)
- `.card__body` padding fluid
- ใหม่: `.nav__cta` (ปุ่มทอง "สอบถาม / จอง" บน desktop ≥1100px), `.venue-space*` (การ์ดโซนแบบ image-led), `.cta-bar` (sticky bar ล่างจอมือถือ), `prefers-reduced-motion`

### js/common.js
- Nav รับ `data` → ปุ่ม CTA ลิงก์ LINE (ถ้ามี) หรือโทร
- Footer render `.cta-bar` มือถือ: **โทร / ดูแพ็คเกจ / Facebook / LINE** จาก contact data จริง — ปุ่มไหนไม่มีข้อมูลจะไม่แสดง
- มือถือซ่อน FAB เดิม (desktop ยังอยู่), `body.has-cta-bar` กัน content โดนบัง

### index.html (หน้าแรก)
- Hero สูงขึ้น `clamp(520px, 74vh, 700px)` + padding มากขึ้น → immersive แบบ Hillbrook
- **Section ใหม่ "โซนสถานที่"** (แทรกหลัง hero): การ์ดรูปใหญ่ 3 โซนจาก `data.gallery.zones` (ชื่อ+คำอธิบายเดิมใน data ทุกตัวอักษร) ลิงก์ไป `gallery/?zone=...` (filter ทำงานอยู่แล้ว) — แบบ venue spaces ของ The Barn
- Featured package: ดำ→**soft luxury** (พื้น ivory/cream, ตัวหนังสือน้ำตาล, ราคา gold-dark, pills ครีม) — ข้อมูล/ราคา render เหมือนเดิมทุกอย่าง
- Gallery preview สูงขึ้น (260px แถวบน desktop, กว้าง 1000px)
- ลำดับ section: Hero → โซนสถานที่ → Featured → Quick nav → Gallery → Why us → Booking steps → Final CTA

### data/data.json
- `site.contact.line = "@chaanwedding"` (ตามที่สั่ง) + bump `_version` → ปุ่ม LINE โผล่อัตโนมัติทั้ง footer, FAB, cta-bar, nav CTA

## 3. สิ่งที่ *ไม่ได้* แตะ
ทุกหน้าใน packages/, menu/, gallery/, calendar/, venue-fees.html, floorplan/, admin — รอรอบถัดไป · ราคา/แพ็คเกจ/เมนู/ข้อความไทยทั้งหมดเหมือนเดิม

## 4. รอบถัดไป (เสนอ)
1. packages/index.html — การ์ดและ compare view ปรับ spacing/typography ตาม scale ใหม่
2. packages/detail.html — hero + price box
3. menu / gallery / venue-fees / calendar — รูปแบบ section ให้เข้าชุด

## 5. ข้อเสนอด้านเนื้อหา (ยังไม่ทำ — รออนุมัติ)
- **Testimonials / รีวิวคู่บ่าวสาวจริง**: ถ้ามีรีวิวจาก Facebook/Google ส่งมาได้ จะเพิ่ม section ให้
- **FAQ**: คำถามที่ลูกค้าถามบ่อย (เช่น จอดรถ, จำนวนแขกขั้นต่ำ, เลื่อนวันได้ไหม) — ร่างคำตอบเองไม่ได้ตามกฎ ต้องได้เนื้อหาจริงจากคุณ
- Hero headline ปัจจุบัน "WEDDING VENUE" เป็นภาษาอังกฤษล้วน — ถ้าต้องการ emotional headline ภาษาไทย ส่งข้อความที่ต้องการมาได้
- `site.contact.instagram` และ `email` ยังว่าง — เติมใน admin ได้ ปุ่มจะโผล่เอง
