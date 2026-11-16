import fs from 'fs';
import path from 'path';

const filePath = path.resolve('lib/utils/pdfStickerEngine.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the inside of 2x6 sticker loop in generate12LStickerPdf
const startMarker = `      // Outer boundary border
      doc.setDrawColor(190, 200, 215);
      doc.setLineWidth(0.3);
      doc.rect(x + 0.5, y + 0.5, labelWidth - 1, labelHeight - 1);`;

const endMarker = `        doc.text(item.remark!.trim().slice(0, 46), x + 17, y + 40);
      }
    }
  } else {`;

const new2x6Block = `      // Outer rounded border (Industrial format matching factory photo)
      doc.setDrawColor(140, 150, 165);
      doc.setLineWidth(0.35);
      doc.roundedRect(x + 0.5, y + 0.5, labelWidth - 1, labelHeight - 1, 1.8, 1.8, 'S');

      // Line 1: Party & Job Card Badge
      const safeCustomer = (item.customerName || 'Client').toUpperCase().slice(0, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 80, 95);
      doc.text('Party', x + 3.0, y + 5.0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      doc.text(safeCustomer, x + 11.5, y + 5.0);

      // Job Card rounded badge on top right
      const jcText = item.jobCardNumber || item.orderNumber || 'JC-2026';
      const badgeW = 25.0;
      const badgeH = 4.8;
      const badgeX = x + labelWidth - badgeW - 3.0;
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.3);
      doc.roundedRect(badgeX, y + 1.8, badgeW, badgeH, 1.2, 1.2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text(jcText, badgeX + badgeW / 2, y + 5.1, { align: 'center' });

      // Line 2: Model & Circled Door Number
      const modelText = (item.modelCode || item.profile || 'EXM-A-101').slice(0, 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(70, 80, 95);
      doc.text('Model', x + 3.0, y + 11.0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      doc.text(modelText, x + 12.0, y + 11.0);

      // Circled Door Number on right
      const circleX = x + labelWidth - 8.0;
      const circleY = y + 10.5;
      doc.setDrawColor(100, 116, 139);
      doc.roundedRect(circleX - 3.2, circleY - 3.2, 6.4, 6.4, 3.2, 3.2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(item.doorNumber), circleX, circleY + 1.2, { align: 'center' });

      // Line 3: Hinge circle, Lock pill, Color pill
      const hSide = (item.hingeSide || item.hand || 'R').toUpperCase().startsWith('L') ? 'L' : 'R';
      const hPillX = x + 3.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(70, 80, 95);
      doc.text('H :', hPillX, y + 17.0);

      // Circle for (R) or (L)
      doc.roundedRect(hPillX + 5.0, y + 13.8, 5.0, 4.6, 2.3, 2.3, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(15, 23, 42);
      doc.text(hSide, hPillX + 7.5, y + 17.1, { align: 'center' });

      // Lock pill
      const lockX = hPillX + 13.0;
      doc.roundedRect(lockX, y + 13.8, 28.0, 4.6, 1.2, 1.2, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('LOCK:', lockX + 1.5, y + 17.0);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text((item.lock || 'Latch').toUpperCase().slice(0, 12), lockX + 9.5, y + 17.0);

      // Color pill
      const clrX = lockX + 29.5;
      const clrW = x + labelWidth - clrX - 3.0;
      doc.roundedRect(clrX, y + 13.8, clrW, 4.6, 1.2, 1.2, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('CLR:', clrX + 1.5, y + 17.0);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text((item.finish || 'Teak').toUpperCase().slice(0, 22), clrX + 7.5, y + 17.0);

      // Line 4: 3-Cell Industrial Cutting Box
      const hasRemark = Boolean(item.remark && item.remark.trim().length > 0);
      const boxX = x + 2.5;
      const boxY = y + 20.5;
      const boxW = labelWidth - 5.0;
      const boxH = hasRemark ? 17.0 : 22.0;

      // Outer box border
      doc.setDrawColor(50, 60, 75);
      doc.setLineWidth(0.4);
      doc.roundedRect(boxX, boxY, boxW, boxH, 1.0, 1.0, 'S');

      // 2 Vertical dividers dividing into 3 cells:
      const c1W = 30.0;
      const c2W = 36.0;
      doc.line(boxX + c1W, boxY, boxX + c1W, boxY + boxH);
      doc.line(boxX + c1W + c2W, boxY, boxX + c1W + c2W, boxY + boxH);

      // Heights and Widths formatted with minus sign as in factory
      const finHNum = item.finH || parseFloat(item.finHText || '0') || (item.heightMm ? item.heightMm / 10 : 0);
      const finTopWNum = item.finTopW || parseFloat(item.finTopWText || '0') || (item.widthMm ? item.widthMm / 10 : 0);
      const finBtmWNum = item.finBtmW || parseFloat(item.finBtmWText || '0') || finTopWNum;
      const hCut = \`-\${finHNum > 0 ? finHNum.toFixed(1) : '205.5'}\`;
      const topCut = \`-\${finTopWNum > 0 ? finTopWNum.toFixed(1) : '82.4'}\`;
      const btmCut = \`-\${finBtmWNum > 0 ? finBtmWNum.toFixed(1) : topCut.replace('-', '')}\`;

      // Cell 1: H-LEFT or H-RIGHT
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(hSide === 'R' ? 'H-LEFT' : 'H-RIGHT', boxX + 2.5, boxY + 5.0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(hasRemark ? 10.0 : 11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(hCut, boxX + c1W - 2.5, boxY + (hasRemark ? 12.0 : 14.5), { align: 'right' });

      // Cell 2: TOP and BTM width rows with horizontal divider
      doc.line(boxX + c1W, boxY + boxH / 2, boxX + c1W + c2W, boxY + boxH / 2);

      // Row 1: TOP
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text('TOP', boxX + c1W + 2.5, boxY + (hasRemark ? 5.5 : 6.8));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(hasRemark ? 8.5 : 9.8);
      doc.setTextColor(15, 23, 42);
      doc.text(topCut, boxX + c1W + c2W - 2.5, boxY + (hasRemark ? 6.2 : 7.5), { align: 'right' });

      // Row 2: BTM
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text('BTM', boxX + c1W + 2.5, boxY + boxH / 2 + (hasRemark ? 5.8 : 7.2));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(hasRemark ? 8.5 : 9.8);
      doc.setTextColor(15, 23, 42);
      doc.text(btmCut, boxX + c1W + c2W - 2.5, boxY + boxH / 2 + (hasRemark ? 6.5 : 7.8), { align: 'right' });

      // Cell 3: QR Code & Door Tag
      const qrSize = hasRemark ? 12.0 : 15.0;
      const qrX = boxX + c1W + c2W + (boxW - c1W - c2W - qrSize) / 2;
      const qrY = boxY + 1.2;
      const targetQrUrl = item.qrUrl || \`http://192.168.8.101:4000/track/\${item.barcode.replace(/\\*/g, '')}\`;
      doc.drawQrCode(targetQrUrl, qrX, qrY, qrSize);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(100, 116, 139);
      doc.text(\`#\${item.doorNumber}\`, qrX + qrSize / 2, boxY + boxH - 1.2, { align: 'center' });

      // Conditional Remark (if non-empty)
      if (hasRemark) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.2);
        doc.roundedRect(boxX, boxY + boxH + 1.0, boxW, 5.0, 0.8, 0.8, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        doc.setFontSize(5.5);
        doc.text('REMARK:', boxX + 2.0, boxY + boxH + 4.0);

        doc.setTextColor(15, 23, 42);
        doc.text(item.remark!.trim().slice(0, 48), boxX + 15.0, boxY + boxH + 4.0);
      }
    }
  } else {`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + new2x6Block + content.slice(endIndex + endMarker.length);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Successfully updated 2x6 sticker in pdfStickerEngine.ts to match user photo');
} else {
  console.error('Start or end marker not found in pdfStickerEngine.ts', { startIndex, endIndex });
  process.exit(1);
}
