# Chaan Wedding — Information Website

เว็บไซต์ข้อมูลครบจบในที่เดียวสำหรับ Wedding Venue ที่ลูกค้าสามารถดูแพ็คเกจ ราคา เมนู และรูปภาพได้ผ่าน link เดียว พร้อมหน้า Admin สำหรับเจ้าของในการแก้ไขข้อมูลเองได้

## โครงสร้างไฟล์

```
Chaan Wedding Information Site/
├── index.html              ← หน้าแรก (โชว์ Featured Package)
├── venue-fees.html         ← ค่าเช่า + บริการเสริม
├── admin.html              ← หน้า Admin แก้ไขข้อมูล
├── packages/
│   ├── index.html          ← รวมแพ็คเกจ (toggle Wedding/Seminar, High/Low season)
│   └── detail.html         ← รายละเอียดแพ็คเกจ + คำนวณราคาตามจำนวนแขก + ตัดพิธี
├── menu/
│   └── index.html          ← เมนู (บุฟเฟต์ / โต๊ะจีน / โต๊ะจันทร์) + Set A/B/C
├── gallery/
│   └── index.html          ← แกลเลอรี filter ตามโซน + มุม + เดือน + lightbox
├── data/
│   └── data.json           ← ฐานข้อมูลทั้งหมดของเว็บ (แก้ผ่าน admin.html)
├── css/
│   └── style.css           ← ธีม Elegant Classic (cream / gold / brown)
└── js/
    ├── common.js           ← Nav, Footer, ฟอร์แมตราคา ฯลฯ
    └── admin.js            ← Logic ของหน้า Admin
```

## การใช้งานในเครื่อง (ลอง preview ก่อน deploy)

เนื่องจากเว็บโหลด `data/data.json` ผ่าน fetch จึงต้องเปิดผ่าน web server ไม่ใช่เปิดไฟล์ตรง ๆ:

```bash
# ใน folder โปรเจคนี้
python -m http.server 8000
# จากนั้นเปิดเบราว์เซอร์ไปที่ http://localhost:8000
```

หรือใช้ extension `Live Server` ใน VS Code.

## การ Deploy (แนะนำ)

**Vercel / Netlify / GitHub Pages — ฟรีทั้งหมด เหมาะที่สุดสำหรับเว็บนี้**

### วิธีที่ 1 — Netlify Drop (ง่ายที่สุด ไม่ต้องสมัคร command line)

1. เข้า https://app.netlify.com/drop
2. ลากทั้ง folder `Chaan Wedding Information Site` ใส่หน้าเว็บ
3. ได้ลิงก์ทันที เช่น `https://chaan-wedding-12345.netlify.app`
4. สามารถซื้อ custom domain เพิ่ม เช่น `chaanwedding.com` ได้ในภายหลัง

### วิธีที่ 2 — Vercel

1. สร้างบัญชี https://vercel.com (login ด้วย GitHub ได้)
2. กด **Add New → Project → Import** หรือใช้ `vercel` CLI ใน folder
3. Deploy เสร็จได้ลิงก์ทันที

### วิธีที่ 3 — GitHub Pages

1. push folder นี้ขึ้น GitHub repo
2. Settings → Pages → Source: `main / root`
3. ใช้ลิงก์ `https://username.github.io/repo-name/`

## วิธีแก้ไขข้อมูล (ผ่านหน้า Admin)

1. เปิด `/admin.html` (เช่น `https://chaanwedding.com/admin.html`)
2. เลือกหมวดที่ต้องการแก้ไขใน sidebar (ข้อมูลทั่วไป, แพ็คเกจ, เมนู, รูปภาพ ฯลฯ)
3. แก้ไขเสร็จ — การแก้ไขจะถูกเก็บไว้ใน browser ก่อน (preview ได้ทันที)
4. กดปุ่ม **⬇ Export data.json** มุมขวาบน → จะดาวน์โหลดไฟล์ `data.json` มา
5. นำไฟล์ `data.json` ที่ดาวน์โหลดมา **แทนที่** ไฟล์ใน `data/data.json` ของเว็บ
6. Deploy เว็บใหม่ (ถ้าใช้ Netlify Drop ก็ลากไฟล์ใหม่ทับ) → ลูกค้าทุกคนเห็นข้อมูลใหม่

> 💡 ปุ่ม **↺ คืนค่า** จะลบการแก้ไขที่ยังไม่ Export ออก
> 💡 ปุ่ม **⬆ Import JSON** ใช้สำหรับการกลับมาแก้ไขต่อจาก data.json เดิม

## รูปภาพ

ตอนนี้รูปทั้งหมดใน `data.json` ใช้ตัวอย่างจาก Unsplash (ใช้ได้ฟรี) เมื่อมีรูปจริง ให้ upload ขึ้น hosting แล้วเอา URL มาใส่:

- **Imgur** (https://imgur.com) — ฟรี ไม่ต้องสมัคร
- **Cloudinary** (https://cloudinary.com) — ฟรี + auto resize
- เก็บใน folder `/images/` ของเว็บแล้วใช้ path relative เช่น `./images/photo1.jpg`

## Features ที่ครอบคลุม

✅ หน้าแรกโชว์ Featured Package พร้อม CTA
✅ 4 หมวดหลัก: แพ็คเกจ / ค่าเช่า / เมนู / รูปภาพ
✅ Wedding + Seminar packages แยก subcategory
✅ Toggle High/Low Season → ราคาเปลี่ยนตามฤดูกาล
✅ คำนวณราคาตามจำนวนแขก 50-500 ท่าน (13 ขั้น)
✅ Ritual cut-off calculator — ติ๊ก checkbox ตัดพิธี ราคาลดทันที (อยู่ในกล่องราคาด้านขวาของหน้ารายละเอียด)
✅ Link จากแพ็คเกจ → เมนูที่ใช้ได้
✅ เมนู 3 ประเภท × Set A/B/C พร้อมรายการอาหาร
✅ แกลเลอรี filter โซน + มุม + เดือน + lightbox preview
✅ Footer ติดต่อทุกหน้า + Floating LINE button
✅ Mobile-first responsive design
✅ Admin page แก้ไขทุกหมวด + Import/Export JSON

## หมายเหตุการออกแบบ Ritual Cut-off

ฉันเลือกใส่ "ตัดพิธี" ไว้ใน **กล่องคำนวณราคาด้านขวา** ของหน้ารายละเอียดแพ็คเกจ พร้อม**ตารางสรุปในเนื้อหา** (Section 4) เพราะ:

- ลูกค้าเห็นราคาฐาน → ติ๊กตัดพิธี → ราคาลดทันที (real-time)
- ไม่ต้องไปสับหน้าอื่น
- การปรับเปลี่ยนเห็นชัดเจน เปรียบเทียบราคาก่อน/หลังตัดได้

## Customize เพิ่ม

ทุกอย่างควบคุมผ่าน `data.json` และ CSS variables ใน `:root` ของ `css/style.css`:

- เปลี่ยนสี: แก้ `--color-cream`, `--color-gold`, `--color-brown` ฯลฯ
- เปลี่ยนฟอนต์: แก้ `--font-serif`, `--font-sans`, `--font-script`
- เพิ่มหมวดเมนูใหม่: แก้ไขใน `data.menus` + เพิ่ม sidebar ใน `admin.html`
