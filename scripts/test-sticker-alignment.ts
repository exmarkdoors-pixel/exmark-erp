import { PureVectorPdf } from '../lib/utils/pdfStickerEngine';

function testAlignment() {
  const doc = new PureVectorPdf({ orientation: 'portrait' });
  // 2x6 on A4
  const cols = 2;
  const rows = 6;
  const labelWidth = 99.0;
  const labelHeight = 46.5;
  const leftMargin = 5.0;
  const topMargin = 5.0;
  const colGap = 2.0;
  const rowGap = 1.5;

  for (let i = 0; i < 12; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = leftMargin + col * (labelWidth + colGap);
    const y = topMargin + row * (labelHeight + rowGap);

    const doorNum = i + 1;
    const customer = 'KAMARU YUSUF';
    const jc = 'JC-2026-012';
    const model = 'EXM-A-101';
    const hinge = 'R';
    const lock = 'BABY LATCH';
    const clr = 'NATURAL TEAK EXGC-510';
    const hCut = '-235.5';
    const topCut = '-92.4';
    const btmCut = '-92.4';

    // Outer rounded border
    doc.setDrawColor(140, 150, 165);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, labelWidth, labelHeight, 2, 2, 'S');

    // Line 1: Party & JC Badge
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 95);
    doc.text('Party', x + 3.0, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(customer, x + 11.5, y + 4.8);

    // JC rounded pill badge on top right
    const badgeW = 24.0;
    const badgeH = 4.8;
    const badgeX = x + labelWidth - badgeW - 3.0;
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.roundedRect(badgeX, y + 1.6, badgeW, badgeH, 1.2, 1.2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(jc, badgeX + badgeW / 2, y + 4.9, { align: 'center' });

    // Line 2: Model & Circled Door Number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(70, 80, 95);
    doc.text('Model', x + 3.0, y + 10.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(model, x + 12.0, y + 10.8);

    // Circled Door Number on right
    const circleX = x + labelWidth - 8.0;
    const circleY = y + 10.2;
    doc.setDrawColor(100, 116, 139);
    doc.roundedRect(circleX - 3.2, circleY - 3.2, 6.4, 6.4, 3.2, 3.2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(doorNum), circleX, circleY + 1.2, { align: 'center' });

    // Line 3: Hinge circle, Lock pill, Color pill
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
    doc.text(hinge, hPillX + 7.5, y + 17.1, { align: 'center' });

    // Lock pill
    const lockX = hPillX + 13.0;
    doc.roundedRect(lockX, y + 13.8, 28.0, 4.6, 1.2, 1.2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('LOCK:', lockX + 1.5, y + 17.0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(lock.slice(0, 12), lockX + 9.5, y + 17.0);

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
    doc.text(clr.slice(0, 22), clrX + 7.5, y + 17.0);

    // Line 4: 3-Cell Industrial Cutting Box
    const boxX = x + 2.5;
    const boxY = y + 20.5;
    const boxW = labelWidth - 5.0;
    const boxH = 22.0;

    // Box outer border
    doc.setDrawColor(50, 60, 75);
    doc.setLineWidth(0.4);
    doc.roundedRect(boxX, boxY, boxW, boxH, 1.0, 1.0, 'S');

    // 2 Vertical dividers dividing into 3 cells:
    // Cell 1: 30mm | Cell 2: 36mm | Cell 3: remaining (boxW - 66mm = ~28mm)
    const c1W = 30.0;
    const c2W = 36.0;
    doc.line(boxX + c1W, boxY, boxX + c1W, boxY + boxH);
    doc.line(boxX + c1W + c2W, boxY, boxX + c1W + c2W, boxY + boxH);

    // Cell 1: H-LEFT and Height Deduction
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text(hinge === 'R' ? 'H-LEFT' : 'H-RIGHT', boxX + 2.5, boxY + 5.0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(hCut, boxX + c1W - 2.5, boxY + 14.5, { align: 'right' });

    // Cell 2: TOP and BTM width rows with horizontal divider
    doc.line(boxX + c1W, boxY + boxH / 2, boxX + c1W + c2W, boxY + boxH / 2);

    // Row 1: TOP
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text('TOP', boxX + c1W + 2.5, boxY + 6.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    doc.text(topCut, boxX + c1W + c2W - 2.5, boxY + 7.5, { align: 'right' });

    // Row 2: BTM
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text('BTM', boxX + c1W + 2.5, boxY + boxH / 2 + 7.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    doc.text(btmCut, boxX + c1W + c2W - 2.5, boxY + boxH / 2 + 7.8, { align: 'right' });

    // Cell 3: QR Code & Door Tag
    const qrSize = 15.0;
    const qrX = boxX + c1W + c2W + (boxW - c1W - c2W - qrSize) / 2;
    const qrY = boxY + 1.5;
    doc.drawQrCode(`http://192.168.8.101:4000/track/JC-2026-012-D0${doorNum}`, qrX, qrY, qrSize);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`#${doorNum}`, qrX + qrSize / 2, boxY + boxH - 1.5, { align: 'center' });
  }

  const pdf = doc.buildPdf();
  console.log(`✓ 12L Sticker Alignment PDF generated: ${pdf.length} bytes`);
}

testAlignment();
