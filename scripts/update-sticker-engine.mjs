import fs from 'fs';
import path from 'path';

const filePath = path.resolve('lib/utils/pdfStickerEngine.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add QRCode import at top if not present
if (!content.includes("import QRCode from 'qrcode'")) {
  content = "import QRCode from 'qrcode';\n" + content;
}

// 2. Expand Printable12LStickerItem
const oldInterface = `export interface Printable12LStickerItem {
  id: string;
  orderNumber: string;
  jobCardNumber?: string;
  customerName: string;
  siteName?: string;
  doorNumber: number;
  totalDoorsInOrder: number;
  widthMm?: number;
  heightMm?: number;
  shutterSize: string;
  tape: string;
  profile: string;
  coreType?: string;
  finish: string;
  hand: string;
  lock: string;
  remark?: string; // Strict conditional: printed ONLY when non-empty!
  barcode: string;
  mfgDate?: string;
  finHText?: string;
  finTopWText?: string;
  finBtmWText?: string;
  hingeSide?: string;
  isOnlyDoor?: boolean;
}`;

const newInterface = `export interface Printable12LStickerItem {
  id: string;
  orderNumber: string;
  jobCardNumber?: string;
  customerName: string;
  siteName?: string;
  doorNumber: number;
  totalDoorsInOrder: number;
  widthMm?: number;
  heightMm?: number;
  shutterSize: string;
  tape: string;
  profile: string;
  coreType?: string;
  finish: string;
  hand: string;
  lock: string;
  remark?: string; // Strict conditional: printed ONLY when non-empty!
  barcode: string;
  mfgDate?: string;
  finHText?: string;
  finTopWText?: string;
  finBtmWText?: string;
  hingeSide?: string;
  isOnlyDoor?: boolean;
  // Dynamic Floor Cutting & QR Metrics
  rawHeightCm?: number;
  rawWidthTopCm?: number;
  rawWidthBtmCm?: number;
  finH?: number;
  finTopW?: number;
  finBtmW?: number;
  tapeInchH?: string;
  tapeInchTopW?: string;
  tapeInchBtmW?: string;
  isTapered?: boolean;
  qrUrl?: string;
  modelCode?: string;
  floorZone?: string;
}`;

content = content.replace(oldInterface, newInterface);

// 3. Add drawQrCode to PureVectorPdf class
const oldRect = `  roundedRect(x: number, y: number, w: number, h: number, _rx?: number, _ry?: number, style?: 'F' | 'FD' | 'S'): void {
    this.rect(x, y, w, h, style);
  }`;

const newRectWithQr = `  roundedRect(x: number, y: number, w: number, h: number, _rx?: number, _ry?: number, style?: 'F' | 'FD' | 'S'): void {
    this.rect(x, y, w, h, style);
  }

  drawQrCode(text: string, x: number, y: number, sizeMm: number): void {
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
      const modules = qr.modules;
      const size = modules.size;
      const cellSize = sizeMm / size;
      const bleed = 0.04;

      this.setFillColor(0, 0, 0);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (modules.get(c, r)) {
            this.rect(
              x + c * cellSize,
              y + r * cellSize,
              cellSize + bleed,
              cellSize + bleed,
              'F'
            );
          }
        }
      }
    } catch (e) {
      console.error('Failed to draw vector QR code:', e);
    }
  }`;

content = content.replace(oldRect, newRectWithQr);

// 4. Overhaul 2x6 sticker rendering in generate12LStickerPdf
const old2x6BlockStart = `      // Shutter dimensions box
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x + 2.5, y + 17, 54, 12.5, 1, 1, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.text(item.shutterSize, x + 4, y + 22.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(\`Tape: \${item.tape}\`, x + 4, y + 27);

      // Specs column (right side of box)
      const specX = x + 58.5;
      doc.setFontSize(6.6);
      doc.setTextColor(51, 65, 85);
      const specPrefix = item.isOnlyDoor ? '[ONLY DOOR] ' : '';
      doc.text(\`\${specPrefix}\${(item.profile || 'FRP 30mm').slice(0, 22)}\`, specX, y + 19.5);
      doc.text(\`Color: \${(item.finish || 'Teak').slice(0, 22)}\`, specX, y + 23.5);
      doc.text(
        \`Hinge:\${item.hingeSide || item.hand || 'RH'} | \${(item.lock || 'Latch').slice(0, 14)}\`,
        specX,
        y + 27.5
      );

      // Barcode / Tracking code
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode, x + labelWidth / 2, y + 33.2, { align: 'center' });`;

const new2x6Block = `      // Site / Zone & Floor tag
      const locationTag = item.floorZone ? \`[\${item.floorZone}] \${item.siteName || ''}\` : (item.siteName || '');
      if (locationTag) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.4);
        doc.setTextColor(79, 70, 229);
        doc.text(locationTag.slice(0, 42), x + 2.5, y + 15.0);
      }

      // Shutter Cutting Dimensions Box (Height, Top Width, Bottom Width)
      const hasRemark = Boolean(item.remark && item.remark.trim().length > 0);
      const cutBoxW = 49.0;
      const cutBoxH = 17.5;
      const cutBoxY = y + 16.0;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(x + 2.5, cutBoxY, cutBoxW, cutBoxH, 1, 1, 'FD');

      // Box Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text('CUTTING SIZE (cm / Tape")', x + 4, cutBoxY + 3.8);

      // Taper flag badge
      if (item.isTapered) {
        doc.setFillColor(254, 243, 199);
        doc.rect(x + cutBoxW - 14, cutBoxY + 1.2, 13, 3.2, 'F');
        doc.setTextColor(180, 83, 9);
        doc.setFontSize(4.8);
        doc.text('▲ TAPER', x + cutBoxW - 7.5, cutBoxY + 3.6, { align: 'center' });
      }

      // Explicit Height, Top Width, Bottom Width
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const hStr = item.finHText || (item.heightMm ? \`\${(item.heightMm / 10).toFixed(1)} cm\` : '0');
      const hTape = item.tapeInchH ? \`(\${item.tapeInchH})\` : '';
      doc.text(\`H  : \${hStr} \${hTape}\`, x + 4, cutBoxY + 7.8);

      const topStr = item.finTopWText || (item.widthMm ? \`\${(item.widthMm / 10).toFixed(1)} cm\` : '0');
      const topTape = item.tapeInchTopW ? \`(\${item.tapeInchTopW})\` : '';
      doc.text(\`TOP: \${topStr} \${topTape}\`, x + 4, cutBoxY + 11.8);

      const btmStr = item.finBtmWText || topStr;
      const btmTape = item.tapeInchBtmW || topTape;
      doc.text(\`BTM: \${btmStr} \${btmTape}\`, x + 4, cutBoxY + 15.8);

      // Vector Floor Door QR Code (Direct scan at cutting & packing table)
      const qrSize = 16.0;
      const qrX = x + 53.0;
      const qrY = cutBoxY;
      const targetQrUrl = item.qrUrl || \`http://192.168.8.101:4000/track/\${item.barcode.replace(/\\*/g, '')}\`;
      doc.drawQrCode(targetQrUrl, qrX, qrY, qrSize);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.8);
      doc.setTextColor(100, 116, 139);
      doc.text('DOOR QR', qrX + qrSize / 2, qrY + qrSize + 2.4, { align: 'center' });

      // Specs column (Right side)
      const specX = x + 71.0;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(15, 23, 42);
      const specPrefix = item.isOnlyDoor ? '[ONLY DOOR] ' : '';
      const modelTitle = item.modelCode ? \`\${item.modelCode}\` : (item.profile || 'FRP 30mm');
      doc.text(\`\${specPrefix}\${modelTitle.slice(0, 18)}\`, specX, cutBoxY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.0);
      doc.setTextColor(71, 85, 105);
      doc.text(\`Clr: \${(item.finish || 'Teak').slice(0, 16)}\`, specX, cutBoxY + 7.8);
      doc.text(\`Hng: \${item.hingeSide || item.hand || 'RH'}\`, specX, cutBoxY + 11.5);
      doc.text(\`Lck: \${(item.lock || 'Latch').slice(0, 12)}\`, specX, cutBoxY + 15.2);

      // Barcode / Tracking code
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode, x + 2.5, y + 36.5);`;

content = content.replace(old2x6BlockStart, new2x6Block);

// 5. Overhaul 3x4 sticker rendering
const old3x4BlockStart = `      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x + 2, y + 15, labelWidth - 4, 14, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.text(item.shutterSize, x + 3.5, y + 21);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
      doc.setTextColor(71, 85, 105);
      doc.text(\`Tape: \${item.tape}\`, x + 3.5, y + 26);

      doc.setFontSize(6.4);
      doc.text(\`Spec: \${(item.profile || 'FRP 30mm').slice(0, 24)}\`, x + 2.5, y + 33);
      doc.text(\`Finish: \${(item.finish || 'Teak').slice(0, 24)}\`, x + 2.5, y + 37.5);
      doc.text(\`Hdw: \${item.hand} | \${item.lock}\`, x + 2.5, y + 42);

      doc.setFont('courier', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode, x + labelWidth / 2, y + 48.5, { align: 'center' });`;

const new3x4Block = `      // Dimensions box with explicit Top & Bottom
      const cut34Y = y + 15.0;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x + 2, cut34Y, labelWidth - 4, 17.5, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text('CUTTING SIZE (cm / Tape")', x + 3.5, cut34Y + 3.8);

      if (item.isTapered) {
        doc.setFillColor(254, 243, 199);
        doc.rect(x + labelWidth - 16, cut34Y + 1.2, 13, 3.2, 'F');
        doc.setTextColor(180, 83, 9);
        doc.setFontSize(4.8);
        doc.text('▲ TAPER', x + labelWidth - 9.5, cut34Y + 3.6, { align: 'center' });
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const hStr34 = item.finHText || (item.heightMm ? \`\${(item.heightMm / 10).toFixed(1)} cm\` : '0');
      const hTape34 = item.tapeInchH ? \`(\${item.tapeInchH})\` : '';
      doc.text(\`H  : \${hStr34} \${hTape34}\`, x + 3.5, cut34Y + 7.8);

      const topStr34 = item.finTopWText || (item.widthMm ? \`\${(item.widthMm / 10).toFixed(1)} cm\` : '0');
      const topTape34 = item.tapeInchTopW ? \`(\${item.tapeInchTopW})\` : '';
      doc.text(\`TOP: \${topStr34} \${topTape34}\`, x + 3.5, cut34Y + 11.8);

      const btmStr34 = item.finBtmWText || topStr34;
      const btmTape34 = item.tapeInchBtmW || topTape34;
      doc.text(\`BTM: \${btmStr34} \${btmTape34}\`, x + 3.5, cut34Y + 15.8);

      // Center Vector QR Code
      const qr34Size = 16.0;
      const qr34X = x + (labelWidth - qr34Size) / 2;
      const qr34Y = cut34Y + 19.5;
      const targetQrUrl34 = item.qrUrl || \`http://192.168.8.101:4000/track/\${item.barcode.replace(/\\*/g, '')}\`;
      doc.drawQrCode(targetQrUrl34, qr34X, qr34Y, qr34Size);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.0);
      doc.setTextColor(100, 116, 139);
      doc.text('SCAN FLOOR QR', x + labelWidth / 2, qr34Y + qr34Size + 2.5, { align: 'center' });

      // Specs & Barcode below QR
      doc.setFontSize(6.2);
      doc.setTextColor(51, 65, 85);
      doc.text(\`Spec: \${(item.profile || 'FRP 30mm').slice(0, 22)}\`, x + 2.5, qr34Y + qr34Size + 6.5);
      doc.text(\`Finish: \${(item.finish || 'Teak').slice(0, 22)}\`, x + 2.5, qr34Y + qr34Size + 10.0);
      doc.text(\`Hdw: \${item.hand} | \${item.lock}\`, x + 2.5, qr34Y + qr34Size + 13.5);

      doc.setFont('courier', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode, x + labelWidth / 2, qr34Y + qr34Size + 17.5, { align: 'center' });`;

content = content.replace(old3x4BlockStart, new3x4Block);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated lib/utils/pdfStickerEngine.ts');
