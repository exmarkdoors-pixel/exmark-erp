import qrcode from 'qrcode';

const qr = qrcode.create('http://192.168.8.101:4000/track/EXM-DR-001', { errorCorrectionLevel: 'M' });
const size = qr.modules.size;
const data = qr.modules.data;

console.log('QR Module Size:', size);
console.log('Total modules:', data.length);
let darkCount = 0;
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (data[r * size + c]) darkCount++;
  }
}
console.log('Dark modules:', darkCount);
