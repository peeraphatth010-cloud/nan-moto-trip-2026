/**
 * Google Apps Script - Database API for Vercel
 * รองรับ Itinerary, Accommodations, Checklist, และ Expenses (เพิ่ม/ลบ ค่าใช้จ่ายพร้อม GPS)
 */

// 1. GET Request: ดึงข้อมูลทริปทั้งหมดจาก Sheet ส่งให้ Vercel
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureExpensesSheet(ss);

  const data = {
    itinerary: getSheetData(ss.getSheetByName('Itinerary')),
    accommodations: getSheetData(ss.getSheetByName('Accommodations')),
    checklist: getSheetData(ss.getSheetByName('Checklist')),
    expenses: getSheetData(ss.getSheetByName('Expenses')),
    lastUpdated: new Date().toISOString()
  };

  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// 2. POST Request: รับคำสั่งอัปเดต, บันทึก หรือลบค่าใช้จ่ายจาก Vercel
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'addExpense') {
      const sheet = ensureExpensesSheet(ss);
      const exp = contents.expense;
      
      const newRow = [
        exp.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
        exp.title || 'ค่าใช้จ่ายทั่วไป',
        exp.category || 'อื่นๆ',
        Number(exp.amount) || 0,
        exp.payer || 'พี',
        exp.splitType || 'หาร 2 (คนละครึ่ง)',
        exp.locationName || '',
        exp.lat || '',
        exp.lng || '',
        exp.mapUrl || (exp.lat && exp.lng ? `https://www.google.com/maps?q=${exp.lat},${exp.lng}` : '')
      ];

      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Expense added', rowIndex: sheet.getLastRow() }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'deleteExpense') {
      const sheet = ss.getSheetByName('Expenses');
      if (sheet) {
        if (contents.rowIndex && contents.rowIndex <= sheet.getLastRow()) {
          sheet.deleteRow(contents.rowIndex);
        } else if (contents.timestamp || contents.title) {
          const data = sheet.getDataRange().getValues();
          for (let i = data.length - 1; i >= 1; i--) {
            const rowTime = String(data[i][0]);
            const rowTitle = String(data[i][1]);
            if ((contents.timestamp && rowTime.includes(contents.timestamp)) || (contents.title && rowTitle === contents.title)) {
              sheet.deleteRow(i + 1);
              break;
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'deleteExpense' }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'updateChecklist') {
      const sheet = ss.getSheetByName('Checklist');
      if (sheet && contents.rowIndex) {
        sheet.getRange(contents.rowIndex, 3).setValue(contents.status);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'updateItinerary') {
      const sheet = ss.getSheetByName('Itinerary');
      if (sheet && contents.rowIndex) {
        sheet.getRange(contents.rowIndex, 6).setValue(contents.status || '');
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'resetItinerary') {
      const sheet = ss.getSheetByName('Itinerary');
      if (sheet && sheet.getLastRow() > 1) {
        sheet.getRange(2, 6, sheet.getLastRow() - 1, 1).clearContent();
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureExpensesSheet(ss) {
  let sheet = ss.getSheetByName('Expenses');
  if (!sheet) {
    sheet = ss.insertSheet('Expenses');
    const headers = ['วันที่_เวลา', 'รายการ', 'หมวดหมู่', 'จำนวนเงิน', 'ผู้จ่าย', 'การหาร', 'สถานที่', 'lat', 'lng', 'map_url'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#171e19').setFontColor('#ffffff').setFontWeight('bold');
  }
  return sheet;
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.every(cell => cell === '')) continue;
    const obj = {};
    headers.forEach((h, colIndex) => {
      let val = row[colIndex];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
      }
      obj[h] = val;
    });
    obj._rowIndex = i + 1;
    rows.push(obj);
  }
  return rows;
}

// 3. ฟังก์ชันสร้าง Sheet และใส่ข้อมูลเริ่มต้นทั้งหมด
function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: Itinerary
  let sheetItinerary = ss.getSheetByName('Itinerary') || ss.insertSheet('Itinerary');
  sheetItinerary.clear();
  const itineraryData = [
    ['วันที่', 'เวลา', 'กิจกรรม_สถานที่', 'ที่อยู่_หมายเหตุ', 'ค่าใช้จ่าย', 'สถานะ', 'map', 'lat', 'lng'],
    ['2026-10-21', '15:00-16:00', 'เตรียมตัวออกเดินทาง', 'ไปรับเบบี๋', '', '', '', 13.8055, 100.5738],
    ['2026-10-21', '16:00-17:30', 'ลาดพร้าว-YLลาด-รถไฟฟ้าสีแดง-ก่อนถึงสถานีรังสิตเลี้ยวซ้าย', 'อยุธยา', '', '', '', 14.3532, 100.5684],
    ['2026-10-21', '19:00:00', 'ถึงสิงห์บุรี', '', '', '', '', 14.8936, 100.4015],
    ['2026-10-21', '18:00-23:00', 'ถึงพิษณุโลก', '', '', '', '', 16.8211, 100.2659],
    ['2026-10-21', '00:00-06:00', 'ถึงพิษณุโลก or อุตรดิตถ์', 'นอนพักผ่อน', '', '', '', 17.6256, 100.0993],
    ['2026-10-22', '06:00-10:00', 'เดินทางมุ่งสู่น่าน', '', '', '', '', 18.3188, 100.6500],
    ['2026-10-22', '08:00:00', 'ป้ายยินดีต้อนรับ จังหวัดน่าน', 'ถ่ายรูปเข้าน่าน', '', '', 'https://maps.app.goo.gl/MZeWY1d3Le41tcmJ6', 18.2384, 100.6729],
    ['2026-10-22', '10:00-11:00', 'วัดภูมินทร์ วัดกระซิบรัก', 'เช็คอินตัวเมืองน่าน', '', '', 'https://maps.app.goo.gl/5kDR1BVDsLGjvg3F9', 18.7744, 100.7715],
    ['2026-10-22', '12:00-13:00', 'โรงบ่มปัว คาเฟ่ แอนด์ อีทเทอรี่', '', '', '', 'https://maps.app.goo.gl/rVg4FyBSTfHAc9Yz5', 19.1685, 100.9168],
    ['2026-10-22', '14:00-16:00', 'ม่อนสกาดคาเฟ่&ฟาร์มสเตย์ ดอยสกาด', '', '', '', 'https://maps.app.goo.gl/SYtikcXtn2CfoYUF6', 19.2312, 101.0345],
    ['2026-10-22', '16:00-17:00', 'วังศิลาแลง', '', '', '', '', 19.1837, 100.9691],
    ['2026-10-22', '17:00:00', 'เข้าที่พัก โกไฮโอ้ Go high \'o', '', '', '', 'https://maps.app.goo.gl/NNxsBoqfBr1Fa81D6', 19.1754, 100.9234],
    ['2026-10-23', '07:00:00', 'ถนนลอยฟ้า ดอยภูคา', 'แวะถ่ายรูป', '', '', 'https://maps.app.goo.gl/FkK8JZ4ZBCQ5zfUL6', 19.1989, 101.0768],
    ['2026-10-23', '08:00:00', 'อุทยานแห่งชาติดอยภูคา', 'ประทับตราสมุดอุทยาน', '', '', 'https://maps.app.goo.gl/ru3BbB3u65fB6ARF7', 19.2016, 101.0825],
    ['2026-10-23', '08:30:00', 'จุดชมวิวดอยภูคา 1715', 'พักประมาณ 30 นาที', '', '', 'https://maps.app.goo.gl/iSxAQuhvN1LV7TuU7', 19.2045, 101.0978],
    ['2026-10-23', '09:00-10:00', 'หลงเขาคาเฟ่ น่าน', 'แวะถ่ายรูป', '', '', 'https://maps.app.goo.gl/PxHjjs8dBCUD3JoW7', 19.1678, 101.1735],
    ['2026-10-23', '10:00-12:00', 'จุดชมวิวนาขั้นบันได', 'แวะถ่ายรูป', '', '', 'https://maps.app.goo.gl/152gDuyR27WJJUd86', 19.1852, 101.2014],
    ['2026-10-23', '12:00-14:00', 'จุดชมวิวบ้านเปียงซ้อ', 'แวะถ่ายรูป', '', '', 'https://maps.app.goo.gl/eTf3B2RQMGNFHXrv6', 19.1354, 101.2723],
    ['2026-10-23', '14:00-15:30', 'ซื้อของทำอาหารเย็น + อช.ขุนน่าน', 'Free Time ซื้อของ', '', '', '', 19.1822, 101.1911],
    ['2026-10-23', '15:30:00', 'ขึ้นที่พัก ดาวลอยแคมป์ปิ้ง', 'ขึ้นที่พัก ห้วยหมี', '', '', 'https://maps.app.goo.gl/oYQeRH6jxV7gzD8B9', 19.1945, 101.2312],
    ['2026-10-24', '09:00:00', 'ลงจากที่พัก', '', '', '', '', 19.1945, 101.2312],
    ['2026-10-24', '09:30:00', 'หยุดเวลา คาเฟ่', 'ทานอาหารเช้า สะปัน', '', '', 'https://maps.app.goo.gl/TqiUF6p182ZgdEqd9', 19.1916, 101.2038],
    ['2026-10-24', '10:30-11:30', 'น้ำตกสะปัน Or บ่อเกลือสินเธาว์ภูเขา', '', '', '', '', 19.1505, 101.1512],
    ['2026-10-24', '11:45:00', 'โค้งเลขศูนย์', '', '', '', 'https://maps.app.goo.gl/91QTT8DCfQzYeaNw7', 19.0682, 101.0743],
    ['2026-10-24', '12:15:00', 'ถนนเลข 3 น่าน', '', '', '', 'https://maps.app.goo.gl/z2qxJnPf9BPUDXQw5', 18.9951, 100.9984],
    ['2026-10-24', '12:35:00', 'จุดชมวิว ไอเลิฟ โค้งรูปตัว ยู', '', '', '', 'https://maps.app.goo.gl/iNhNfsNnnsUFwcBMA', 18.9832, 100.9652],
    ['2026-10-24', '12:50:00', 'จุดชมวิวบาหลี น่าน แอนด์ คาเฟ่', '', '', '', 'https://maps.app.goo.gl/82x5sMHi6wNkAdho9', 18.9712, 100.9421],
    ['2026-10-24', '13:00-15:00', 'เดินทางไปขุนสถาน', '', '', '', '', 18.2756, 100.5214],
    ['2026-10-24', '15:00-16:00', 'อุทยานแห่งชาติขุนสถาน จังหวัดน่าน', '', '', '', 'https://maps.app.goo.gl/zt5xEQsxhxFm1Qk8A', 18.2833, 100.5056],
    ['2026-10-24', '16:00-21:00', 'เดินทางไปพิษณุโลก', '', '', '', 'https://maps.app.goo.gl/QY9DYL3ggfjkgfzW8', 16.8211, 100.2659],
    ['2026-10-25', '09:00-12:00', 'นอนพัก or The Rock Cafe So Goood', '', '', '', '', 16.5367, 100.6721],
    ['2026-10-25', '12:00:00', 'จุดชมวิวหินสามกษัตริย์ สวนดอกไม้เขาน้อย 360 บ้านมุง', 'จุดชมฝูงค้างคาว', '', '', 'https://maps.app.goo.gl/bypyAH9zMJyusDed7', 16.5412, 100.6845],
    ['2026-10-25', '12:00-15:00', 'พิษณุโลกไปเพชรบูรณ์', '', '', '', '', 16.4251, 101.1554],
    ['2026-10-25', '15:00:00', 'อุทยานประวัติศาสตร์ศรีเทพ', '', '', '', 'https://maps.app.goo.gl/vJFjqrHQLrJAq1Uh8', 15.4809, 101.1444],
    ['2026-10-25', '17:00-19:00', 'เขื่อนป่าสักชลสิทธิ์', '', '', '', 'https://maps.app.goo.gl/7FMRcTUz61EC1wq16', 14.8624, 101.0772],
    ['2026-10-25', '19:00-22:00', 'กลับกรุงเทพ', '', '', '', 'https://maps.app.goo.gl/rb28spfvhXbHb5fYA', 13.8055, 100.5738]
  ];
  sheetItinerary.getRange(1, 1, itineraryData.length, itineraryData[0].length).setValues(itineraryData);
  sheetItinerary.setFrozenRows(1);
  sheetItinerary.getRange(1, 1, 1, itineraryData[0].length).setBackground('#171e19').setFontColor('#ffffff').setFontWeight('bold');

  // Sheet 2: Accommodations
  let sheetAcc = ss.getSheetByName('Accommodations') || ss.insertSheet('Accommodations');
  sheetAcc.clear();
  const accData = [
    ['วันที่', 'ชื่อที่พัก', 'ราคา', 'หาร2', 'จังหวัด_อำเภอ', 'map', 'สถานะจอง', 'รายละเอียด'],
    ['คืนที่1', 'โรงแรมทั่วไป', 500, 250, 'พิษณุโลก', '', 'ยังไม่จอง', 'คืน 21 OCT 26'],
    ['คืนที่2', 'โกไฮโอ้ Go high \'o', 1859.54, 929.77, 'อ.ปัว, น่าน', 'https://maps.app.goo.gl/HpnskJkeziyqDWzj6', 'จองแล้ว', 'คืน 22 OCT 26'],
    ['คืนที่3', 'ห้วยหมี ดาวลอยแคมป์ปิ้ง', 1600, 300, 'สะปัน, น่าน', 'https://maps.app.goo.gl/SZW5ocSz4Cnbf387A', 'จองแล้ว', 'คืน 23 OCT 26'],
    ['คืนที่4', 'นั่งชิล วิวเขามุง', 1000, 500, 'บ้านมุง, พิษณุโลก', 'https://maps.app.goo.gl/QW7EYR8BFy4tfP6KA', 'จองแล้ว', 'คืน 24 OCT 26']
  ];
  sheetAcc.getRange(1, 1, accData.length, accData[0].length).setValues(accData);
  sheetAcc.setFrozenRows(1);
  sheetAcc.getRange(1, 1, 1, accData[0].length).setBackground('#171e19').setFontColor('#ffffff').setFontWeight('bold');

  // Sheet 3: Checklist
  let sheetChecklist = ss.getSheetByName('Checklist') || ss.insertSheet('Checklist');
  sheetChecklist.clear();
  const checkData = [
    ['ลำดับ', 'รายการ', 'เช็ค', 'หมายเหตุ'],
    [1, 'สมุดอุทยาน พีกับเนิร์ส', 'ไม่พร้อม', 'สำหรับประทับตราอุทยาน'],
    [2, 'เสื้อแขนยาว', 'ไม่พร้อม', 'กันแดด ขี่มอเตอร์ไซค์'],
    [3, 'แปรงสีฟันยาสีฟัน', 'ไม่พร้อม', 'ของใช้ส่วนตัว'],
    [4, 'สบู่', 'ไม่พร้อม', ''],
    [5, 'ผ้าขนหนู', 'ไม่พร้อม', ''],
    [6, 'ชุดมินิมอล ถ่ายรูป', 'ไม่พร้อม', 'คาเฟ่ & จุดชมวิว'],
    [7, 'ไฟติดเต็นท์', 'ไม่พร้อม', 'แคมป์ปิ้งคืนที่ 3'],
    [8, 'ชุดหม้อแคมป์ปิ้ง', 'ไม่พร้อม', 'ทำอาหารเย็น'],
    [9, 'แก๊สกระป๋อง', 'ไม่พร้อม', ''],
    [10, 'จานกระดาษกับแก้วน้ำ', 'ไม่พร้อม', ''],
    [11, 'เสื้อกันฝน', 'ไม่พร้อม', 'สำคัญมากตอนขี่มอไซค์']
  ];
  sheetChecklist.getRange(1, 1, checkData.length, checkData[0].length).setValues(checkData);
  sheetChecklist.setFrozenRows(1);
  sheetChecklist.getRange(1, 1, 1, checkData[0].length).setBackground('#171e19').setFontColor('#ffffff').setFontWeight('bold');

  // Sheet 4: Expenses
  ensureExpensesSheet(ss);

  return 'Setup Initial Sheets สำเร็จเรียบร้อย!';
}
