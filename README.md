# Nan Moto Trip 2026 - Deploy on Vercel with Google Sheets Database

เว็บแอปสำหรับทริปน่าน 21-25 ตุลาคม 2569 ขี่มอเตอร์ไซค์
- **โฮสต์ & ดีพลอย:** Vercel (เร็ว เสถียร รองรับ Custom Domain และ HTTPS ฟรี)
- **ฐานข้อมูล:** Google Sheets (ดู แก้ไข จัดการข้อมูลได้ทั้งใน Sheet และในแอป)
- **สไตล์:** Sophisticated Playful (Nunito, Charcoal, Vibrant Red, Gray-Green, Off-White)
- **ระบบ GPS:** คำนวณระยะทางและเวลารถมอไซค์ (Curvature 1.35x + Speed 45 km/h) พร้อมปุ่มเปิด Google Maps App
- **โหมดออฟไลน์:** มี Offline-First Local Cache เปิดดูข้อมูลได้ตลอดเวลาแม้ไม่มีสัญญาณเน็ตบนดอย

---

## โครงสร้างโปรเจกต์
```
nan-trip-vercel/
├── api/
│   ├── trip.js             # Vercel Serverless Function (ดึงข้อมูลทริปทั้งหมดจาก Sheet)
│   └── update.js           # Vercel Serverless Function (อัปเดตสถานะ Checklist / จุดหมาย)
├── google-sheet-backend/
│   └── Code.gs             # สคริปต์วางใน Google Sheet ให้บริการ REST API
├── index.html              # Frontend Web App รองรับมือถือ
├── package.json
├── vercel.json             # การตั้งค่า Routing บน Vercel
├── .env.example            # ตัวอย่าง Environment Variables
└── README.md
```

---

## ขั้นตอนการติดตั้งและ Deploy (ทำเพียง 3 ขั้นตอน)

### ขั้นตอนที่ 1: เตรียม Google Sheets เป็นฐานข้อมูล (ใช้เวลา 1 นาที)
1. ไปที่ [Google Sheets](https://sheets.new) เพื่อสร้างสเปรดชีตใหม่ ตั้งชื่อไฟล์ว่า `Nan Trip 2026 DB`
2. ที่เมนูด้านบน คลิก **ส่วนขยาย (Extensions)** > **Apps Script**
3. ก๊อปปี้โค้ดจากไฟล์ `google-sheet-backend/Code.gs` ไปวางแทนโค้ดเดิมทั้งหมด แล้วกดบันทึก
4. ด้านบนเลือกดรอปดาวน์เป็น `setupInitialSheets` แล้วคลิกปุ่ม **เรียกใช้ (Run)** (กดยอมรับสิทธิ์ครั้งแรก)
   - *ระบบจะสร้างตาราง `Itinerary`, `Accommodations`, `Checklist` ให้ครบถ้วนทันที!*
5. คลิกปุ่มสีน้ำเงินมุมขวาบน **การทำให้ใช้งานได้ (Deploy)** > **การทำให้ใช้งานได้รายการใหม่ (New deployment)**
   - ชนิด: **เว็บแอป (Web app)**
   - ดำเนินการในฐานะ: **ฉัน (Me)**
   - ผู้ที่มีสิทธิ์เข้าถึง: **ทุกคน (Anyone)**
6. กด **ทำให้ใช้งานได้ (Deploy)** แล้ว **ก๊อปปี้ URL เว็บแอปที่ได้** (เช่น `https://script.google.com/macros/s/.../exec`) เก็บไว้

---

### ขั้นตอนที่ 2: Deploy ขึ้น Vercel (เลือกวิธีใดวิธีหนึ่ง)

#### วิธี A: Deploy ผ่าน GitHub (แนะนำ สะดวกที่สุด)
1. นำโฟลเดอร์ `nan-trip-vercel` อัปขึ้น GitHub Repository ของคุณ
2. เข้าสู่ระบบ [Vercel](https://vercel.com) แล้วคลิก **Add New...** > **Project**
3. เลือก Import Repository ที่เพิ่งสร้าง
4. ในหัวข้อ **Environment Variables**:
   - **Key:** `GOOGLE_SHEET_API_URL`
   - **Value:** วาง URL เว็บแอป Google Apps Script ที่ก๊อปปี้มาจากขั้นตอนที่ 1
5. คลิก **Deploy**! รอประมาณ 30 วินาที จะได้ URL เว็บแอป เช่น `https://nan-moto-trip.vercel.app`

#### วิธี B: Deploy ผ่าน Vercel CLI (จากหน้าต่าง Terminal)
```bash
# 1. ติดตั้ง vercel cli (ถ้ายังไม่มี)
npm i -g vercel

# 2. เข้าโฟลเดอร์โปรเจกต์แล้วสั่ง deploy
cd nan-trip-vercel
vercel
```
*(เมื่อสั่ง deploy สามารถไปเพิ่ม Environment Variable `GOOGLE_SHEET_API_URL` ในหน้า Vercel Project Settings > Environment Variables ได้ทันที)*

---

### ขั้นตอนที่ 3: ติดตั้งลงหน้าจอมือถือ (Add to Home Screen)
1. เปิด URL ที่ได้จาก Vercel บนมือถือของคุณ (และมือถือของเบบี๋)
2. **iPhone (Safari):** กดปุ่ม Share > เลือก **เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)**
3. **Android (Chrome):** กด 3 จุดมุมขวาบน > เลือก **ติดตั้งแอป** หรือ **เพิ่มลงในหน้าจอหลัก**
4. แอปจะแสดงผลเต็มจอเสมือน Native App ลื่นไหล ไม่กินแบตเตอรี่ และเปิดดูแผนที่นำทางได้ตลอดทริป!
