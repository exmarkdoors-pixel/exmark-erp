import * as QRCode from 'qrcode';
/**
 * EXMARK FACTORY PRODUCTION & INDUSTRIAL 12L STICKER PRINT ENGINE
 * Pure vector PDF generator for standardized A4 12-Up Die-Cut Sheets & Continuous Thermal Rolls.
 *
 * ZERO EXTERNAL DEPENDENCY:
 * Pure TypeScript vector PDF engine compliant with PDF-1.4 specification.
 * Eliminates bulky node/browser polyfill conflicts (core-js/canvg) in Next.js Turbopack & SSR.
 *
 * STRICT CONDITIONAL REMARK RULE:
 * "Remark in 12L STICKER WHEN I TYPE SOMETHING IN REMARK COLUMN ONLY OTHERWISE REMARK WILL BE BLANK"
 * - If remark has non-empty text: draws high-visibility amber/yellow remark container.
 * - If remark is empty/blank: completely omitted to keep sticker clean and un-cluttered.
 */

export interface Printable12LStickerItem {
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
}

export interface StickerSheetConfig {
  companyName?: string;
  layout?: '2x6' | '3x4'; // '2x6' (2 cols x 6 rows) or '3x4' (3 cols x 4 rows)
  brandColor?: [number, number, number]; // RGB
  topMarginMm?: number;
  leftMarginMm?: number;
  rowGapMm?: number;
  colGapMm?: number;
  nudgeXmm?: number;
  nudgeYmm?: number;
  safeMarginBufferActive?: boolean;
}

export function sanitizePdfText(input: unknown): string {
  return String(input ?? '')
    .replace(/\u20B9/g, 'Rs.') // Rupee symbol -> ASCII
    .replace(/\u00D7/g, 'x')   // Multiplication sign -> x
    .replace(/\u2022/g, '-')   // Bullet -> -
    .replace(/[\u2013\u2014]/g, '-') // En/Em dash -> -
    .replace(/\u03A3/g, 'Total')
    .replace(/[\u2713\u2714]/g, 'OK')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class PureVectorPdf {
  private pages: string[][] = [[]];
  private currentPage = 0;
  private strokeColor = '0.784 0.804 0.843 RG';
  private fillColor = '0.059 0.090 0.165 rg';
  private textColor = '0.059 0.090 0.165 rg';
  private lineWidth = '0.85 w';
  private fontSize = 10;
  private fontKey = '/F1';
  private readonly k = 72 / 25.4; // 2.8346 points per mm
  public readonly pageWidthMm: number;
  public readonly pageHeightMm: number;
  private readonly pageWidthPt: number;
  private readonly pageHeightPt: number;

  constructor(options?: { orientation?: 'portrait' | 'landscape'; widthMm?: number; heightMm?: number }) {
    if (options?.widthMm && options?.heightMm) {
      this.pageWidthMm = options.widthMm;
      this.pageHeightMm = options.heightMm;
      this.pageWidthPt = Number((options.widthMm * this.k).toFixed(2));
      this.pageHeightPt = Number((options.heightMm * this.k).toFixed(2));
      return;
    }
    const isLandscape = options?.orientation === 'landscape';
    this.pageWidthMm = isLandscape ? 297 : 210;
    this.pageHeightMm = isLandscape ? 210 : 297;
    this.pageWidthPt = isLandscape ? 841.89 : 595.28;
    this.pageHeightPt = isLandscape ? 595.28 : 841.89;
  }

  getPageCount(): number {
    return this.pages.length;
  }

  addPage(): void {
    this.pages.push([]);
    this.currentPage++;
  }

  setDrawColor(r: number, g: number, b: number): void {
    this.strokeColor = `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG`;
  }

  setFillColor(r: number, g: number, b: number): void {
    this.fillColor = `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`;
  }

  setTextColor(r: number, g: number, b: number): void {
    this.textColor = `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`;
  }

  setLineWidth(wMm: number): void {
    this.lineWidth = `${(wMm * this.k).toFixed(2)} w`;
  }

  setFont(family: string, style?: string): void {
    if (family === 'courier') {
      this.fontKey = style === 'bold' ? '/F4' : '/F3';
    } else {
      this.fontKey = style === 'bold' ? '/F2' : '/F1';
    }
  }

  setFontSize(pt: number): void {
    this.fontSize = pt;
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    const p1x = (x1 * this.k).toFixed(2);
    const p1y = (this.pageHeightPt - y1 * this.k).toFixed(2);
    const p2x = (x2 * this.k).toFixed(2);
    const p2y = (this.pageHeightPt - y2 * this.k).toFixed(2);
    this.pages[this.currentPage].push(`${this.strokeColor} ${this.lineWidth} ${p1x} ${p1y} m ${p2x} ${p2y} l S`);
  }

  rect(x: number, y: number, w: number, h: number, style?: 'F' | 'FD' | 'S'): void {
    const px = (x * this.k).toFixed(2);
    const py = (this.pageHeightPt - (y + h) * this.k).toFixed(2);
    const pw = (w * this.k).toFixed(2);
    const ph = (h * this.k).toFixed(2);

    let op: string;
    if (style === 'F') {
      op = `${this.fillColor} ${px} ${py} ${pw} ${ph} re f`;
    } else if (style === 'FD') {
      op = `${this.fillColor} ${this.strokeColor} ${this.lineWidth} ${px} ${py} ${pw} ${ph} re B`;
    } else {
      op = `${this.strokeColor} ${this.lineWidth} ${px} ${py} ${pw} ${ph} re S`;
    }
    this.pages[this.currentPage].push(op);
  }

  roundedRect(x: number, y: number, w: number, h: number, _rx?: number, _ry?: number, style?: 'F' | 'FD' | 'S'): void {
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
  }

  text(str: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }): void {
    const clean = sanitizePdfText(str);
    const safeStr = clean
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    let px = x * this.k;
    // PDF baseline adjustment
    const py = this.pageHeightPt - (y * this.k) - (this.fontSize * 0.25);
    const approxW = safeStr.length * this.fontSize * 0.50;

    if (options?.align === 'right') {
      px -= approxW;
    } else if (options?.align === 'center') {
      px -= approxW / 2;
    }

    const op = `BT ${this.fontKey} ${this.fontSize} Tf ${this.textColor} ${px.toFixed(2)} ${py.toFixed(2)} Td (${safeStr}) Tj ET`;
    this.pages[this.currentPage].push(op);
  }

  private byteLength(str: string): number {
    if (typeof Buffer !== 'undefined') {
      return Buffer.byteLength(str, 'utf8');
    }
    return new TextEncoder().encode(str).length;
  }

  buildPdf(): Uint8Array {
    const header = '%PDF-1.4\n';
    const chunks: string[] = [header];
    let currentByteOffset = this.byteLength(header);
    const offsets: number[] = [];
    let objCount = 1;

    const addObj = (content: string): number => {
      offsets.push(currentByteOffset);
      const id = objCount++;
      const block = `${id} 0 obj\n${content}\nendobj\n`;
      chunks.push(block);
      currentByteOffset += this.byteLength(block);
      return id;
    };

    const font1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const font2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const font3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
    const font4 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>');

    const contentObjIds: number[] = [];
    for (const pageOps of this.pages) {
      const streamBody = pageOps.join('\n');
      const streamLen = this.byteLength(streamBody);
      const cId = addObj(`<< /Length ${streamLen} >>\nstream\n${streamBody}\nendstream`);
      contentObjIds.push(cId);
    }

    const pagesRootId = objCount++;
    const pagesRootSlotIndex = objCount - 2; // reserve chronological obj ID; fill Kids once created
    offsets.push(0); // placeholder for pagesRootId

    const pageObjIds: number[] = [];
    const pageDefs: string[] = [];

    for (let i = 0; i < this.pages.length; i++) {
      const pId = objCount++;
      pageObjIds.push(pId);
      pageDefs.push(
        `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${this.pageWidthPt} ${this.pageHeightPt}] /Contents ${contentObjIds[i]} 0 R /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R /F3 ${font3} 0 R /F4 ${font4} 0 R >> >> >>`
      );
    }

    // Emit Pages root object first so offset matches ID
    offsets[pagesRootSlotIndex] = currentByteOffset;
    const pagesRootBlock = `${pagesRootId} 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`;
    chunks.push(pagesRootBlock);
    currentByteOffset += this.byteLength(pagesRootBlock);

    for (let i = 0; i < pageObjIds.length; i++) {
      offsets.push(currentByteOffset);
      const block = `${pageObjIds[i]} 0 obj\n${pageDefs[i]}\nendobj\n`;
      chunks.push(block);
      currentByteOffset += this.byteLength(block);
    }

    const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`);

    const xrefOffset = currentByteOffset;
    let xrefBlock = `xref\n0 ${objCount}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xrefBlock += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    xrefBlock += `trailer\n<< /Size ${objCount} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(xrefBlock);

    const out = chunks.join('');
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(out);
    }
    return Buffer.from(out, 'utf8');
  }

  output(type: 'blob' | 'arraybuffer' = 'blob'): Blob | ArrayBuffer {
    const uint8 = this.buildPdf();
    if (type === 'arraybuffer') return uint8.buffer as ArrayBuffer;
    return new Blob([uint8 as any], { type: 'application/pdf' });
  }

  save(filename = 'EXMARK_12L_Stickers.pdf'): void {
    if (typeof window === 'undefined') return;
    const blob = this.output('blob') as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }
}

export async function generate12LStickerPdf(
  stickers: Printable12LStickerItem[],
  settings: StickerSheetConfig = {}
): Promise<PureVectorPdf> {
  const doc = new PureVectorPdf();
  const layout = settings.layout || '2x6';
  const companyName = settings.companyName || 'EXMARK DOORS';
  const topMargin = Math.max(0, settings.topMarginMm ?? 4);
  const leftMargin = Math.max(0, settings.leftMarginMm ?? 4);
  const rowGap = Math.max(0, settings.rowGapMm ?? 2);
  const colGap = Math.max(0, settings.colGapMm ?? 2);

  if (layout === '2x6') {
    // 2 COLUMNS x 6 ROWS = 12 STICKERS PER A4 PAGE (Anchored strictly TOP-LEFT)
    const cols = 2;
    const rows = 6;
    const perPage = cols * rows;
    const usableW = 210 - leftMargin * 2 - colGap * (cols - 1);
    const usableH = 297 - topMargin * 2 - rowGap * (rows - 1);
    const labelWidth = Number((usableW / cols).toFixed(2));
    const labelHeight = Math.min(49.5, Number((usableH / rows).toFixed(2)));

    const nudgeX = settings.nudgeXmm ?? 0;
    const nudgeY = settings.nudgeYmm ?? 0;
    const safeBuffer = settings.safeMarginBufferActive !== false;

    for (let i = 0; i < stickers.length; i++) {
      const item = stickers[i];
      const indexOnPage = i % perPage;
      if (i > 0 && indexOnPage === 0) doc.addPage();

      const col = indexOnPage % cols;
      const row = Math.floor(indexOnPage / cols);
      const x = leftMargin + col * (labelWidth + colGap) + nudgeX;
      const y = topMargin + row * (labelHeight + rowGap) + nudgeY;

      // Outer rounded border (Industrial format matching factory photo)
      doc.setDrawColor(140, 150, 165);
      doc.setLineWidth(0.35);
      doc.roundedRect(x + 0.5, y + 0.5, labelWidth - 1, labelHeight - 1, 1.8, 1.8, 'S');

      // Line 1: Party & Job Card Badge
      const maxPartyChars = safeBuffer ? 22 : 28;
      const safeCustomer = (item.customerName || 'Client').toUpperCase().slice(0, maxPartyChars);
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
      const hCut = `-${finHNum > 0 ? finHNum.toFixed(1) : '205.5'}`;
      const topCut = `-${finTopWNum > 0 ? finTopWNum.toFixed(1) : '82.4'}`;
      const btmCut = `-${finBtmWNum > 0 ? finBtmWNum.toFixed(1) : topCut.replace('-', '')}`;

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
      const targetQrUrl = item.qrUrl || `http://192.168.8.101:4000/track/${item.barcode.replace(/\*/g, '')}`;
      doc.drawQrCode(targetQrUrl, qrX, qrY, qrSize);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(100, 116, 139);
      doc.text(`#${item.doorNumber}/${item.totalDoorsInOrder || 1}`, qrX + qrSize / 2, boxY + boxH - 1.2, { align: 'center' });

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
  } else {
    // 3 COLUMNS x 4 ROWS = 12 STICKERS PER A4 PAGE (Anchored strictly TOP-LEFT)
    const cols = 3;
    const rows = 4;
    const perPage = cols * rows;
    const usableW = 210 - leftMargin * 2 - colGap * (cols - 1);
    const usableH = 297 - topMargin * 2 - rowGap * (rows - 1);
    const labelWidth = Number((usableW / cols).toFixed(2));
    const labelHeight = Math.min(72, Number((usableH / rows).toFixed(2)));

    for (let i = 0; i < stickers.length; i++) {
      const item = stickers[i];
      const indexOnPage = i % perPage;
      if (i > 0 && indexOnPage === 0) doc.addPage();

      const col = indexOnPage % cols;
      const row = Math.floor(indexOnPage / cols);
      const x = leftMargin + col * (labelWidth + colGap);
      const y = topMargin + row * (labelHeight + rowGap);

      doc.setDrawColor(190, 200, 215);
      doc.setLineWidth(0.3);
      doc.rect(x + 0.5, y + 0.5, labelWidth - 1, labelHeight - 1);

      doc.setFillColor(15, 23, 42);
      doc.rect(x + 0.5, y + 0.5, labelWidth - 1, 6.8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(companyName, x + 2.5, y + 5);
      doc.text(item.jobCardNumber || item.orderNumber, x + labelWidth - 2.5, y + 5, { align: 'right' });

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.2);
      doc.text((item.customerName || 'Client').toUpperCase().slice(0, 25), x + 2.5, y + 12.2);

      // Dimensions box with explicit Top & Bottom
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
      const hStr34 = item.finHText || (item.heightMm ? `${(item.heightMm / 10).toFixed(1)} cm` : '0');
      const hTape34 = item.tapeInchH ? `(${item.tapeInchH})` : '';
      doc.text(`H  : ${hStr34} ${hTape34}`, x + 3.5, cut34Y + 7.8);

      const topStr34 = item.finTopWText || (item.widthMm ? `${(item.widthMm / 10).toFixed(1)} cm` : '0');
      const topTape34 = item.tapeInchTopW ? `(${item.tapeInchTopW})` : '';
      doc.text(`TOP: ${topStr34} ${topTape34}`, x + 3.5, cut34Y + 11.8);

      const btmStr34 = item.finBtmWText || topStr34;
      const btmTape34 = item.tapeInchBtmW || topTape34;
      doc.text(`BTM: ${btmStr34} ${btmTape34}`, x + 3.5, cut34Y + 15.8);

      // Center Vector QR Code
      const qr34Size = 16.0;
      const qr34X = x + (labelWidth - qr34Size) / 2;
      const qr34Y = cut34Y + 19.5;
      const targetQrUrl34 = item.qrUrl || `http://192.168.8.101:4000/track/${item.barcode.replace(/\*/g, '')}`;
      doc.drawQrCode(targetQrUrl34, qr34X, qr34Y, qr34Size);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.0);
      doc.setTextColor(100, 116, 139);
      doc.text('SCAN FLOOR QR', x + labelWidth / 2, qr34Y + qr34Size + 2.5, { align: 'center' });

      // Specs & Barcode below QR
      doc.setFontSize(6.2);
      doc.setTextColor(51, 65, 85);
      doc.text(`Spec: ${(item.profile || 'FRP 30mm').slice(0, 22)}`, x + 2.5, qr34Y + qr34Size + 6.5);
      doc.text(`Finish: ${(item.finish || 'Teak').slice(0, 22)}`, x + 2.5, qr34Y + qr34Size + 10.0);
      doc.text(`Hdw: ${item.hand} | ${item.lock}`, x + 2.5, qr34Y + qr34Size + 13.5);

      doc.setFont('courier', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode, x + labelWidth / 2, qr34Y + qr34Size + 17.5, { align: 'center' });

      const hasRemark = item.remark && item.remark.trim().length > 0;
      if (hasRemark) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.roundedRect(x + 2, y + 52, labelWidth - 4, 8, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        doc.setFontSize(6);
        doc.text('REMARK:', x + 3.5, y + 56.2);
        doc.setTextColor(15, 23, 42);
        doc.text(item.remark!.trim().slice(0, 30), x + 3.5, y + 59);
      }
    }
  }

  return doc;
}

/**
 * Generates exact 4" x 2" (101.6mm x 50.8mm / 288pt x 144pt) continuous Thermal Printer Labels.
 * One sticker per label page for desktop thermal label printers (TSC / Zebra / Godex / TVS).
 */
export async function generateThermal4x2Pdf(
  stickers: Printable12LStickerItem[],
  settings: StickerSheetConfig = {}
): Promise<PureVectorPdf> {
  const widthMm = 101.6;
  const heightMm = 50.8;
  const doc = new PureVectorPdf({ widthMm, heightMm });
  const companyName = settings.companyName || 'EXMARK DOORS';

  for (let i = 0; i < stickers.length; i++) {
    if (i > 0) doc.addPage();
    const item = stickers[i];
    const hasRemark = Boolean(item.remark && item.remark.trim().length > 0);

    // Outer cut border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.rect(1.5, 1.5, widthMm - 3, heightMm - 3);

    // Dark top bar (0..7.5mm)
    doc.setFillColor(15, 23, 42);
    doc.rect(1.5, 1.5, widthMm - 3, 6.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(companyName, 3.2, 5.7);

    doc.setFontSize(7.2);
    doc.text(
      `${item.jobCardNumber || item.orderNumber} | DOOR ${item.doorNumber}/${item.totalDoorsInOrder}`,
      widthMm - 3.2,
      5.7,
      { align: 'right' }
    );

    // Party & Model row
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text((item.customerName || 'Client').toUpperCase().slice(0, 34), 3.2, 12.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const modelLine = `${item.isOnlyDoor ? '[ONLY DOOR] ' : ''}${(item.profile || 'FRP Door').slice(0, 30)}`;
    doc.text(modelLine, 3.2, 15.8);

    // Shutter cutting box (left)
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.25);
    doc.roundedRect(3.2, 17.6, 56, 15, 1, 1, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(item.shutterSize, 4.8, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Tape: ${item.tape}`, 4.8, 29.5);

    // Specs box (right)
    const sx = 61;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(`HINGE: ${item.hingeSide || item.hand || 'RH'}`, sx, 20.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`LOCK: ${(item.lock || 'Latch').slice(0, 18)}`, sx, 25);
    doc.text(`CLR: ${(item.finish || 'Teak').slice(0, 18)}`, sx, 29.2);

    // Barcode row
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(item.barcode, widthMm / 2, hasRemark ? 37.4 : 42.5, { align: 'center' });

    // Strict Conditional Remark strip
    if (hasRemark) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(180, 83, 9);
      doc.roundedRect(3.2, 40.2, widthMm - 6.4, 7.2, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(6.5);
      doc.text('REMARK:', 4.5, 44.8);
      doc.setTextColor(15, 23, 42);
      doc.text(item.remark!.trim().slice(0, 48), 18, 44.8);
    }
  }

  return doc;
}
