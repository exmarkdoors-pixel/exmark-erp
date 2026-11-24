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
  // After-Packing Site Verification Pass fields
  doorTag?: string;
  rebateLabel?: string;
  doorThicknessLabel?: string;
  hDedMm?: number;
  wDedMm?: number;
  roomLabel?: string;
}

export interface StickerSheetConfig {
  companyName?: string;
  layout?: '2x6' | '3x4'; // Universal standard: strictly 2 cols x 6 rows = 12 stickers per A4 page
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
    .replace(/[\u00D8\u00F8\u2205\u29B5\u2300]/g, '0') // Enforce normal open oval '0' (no slashed/diameter zeros)
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
  // FACTORY STANDARD 12L DIE-CUT FORMAT (2 COLUMNS x 6 ROWS = 12 STICKERS PER A4 PAGE)
  // Exact 2D Dimensions: Label 99mm x 44mm, Top Margin 9mm, Bottom Margin 9mm, Col Gap 3.2mm, Row Gap 3.0mm
  const cols = 2;
  const rows = 6;
  const perPage = cols * rows;

  const topMargin = Math.max(0, settings.topMarginMm ?? 9.0);
  const leftMargin = Math.max(0, settings.leftMarginMm ?? 4.4);
  const rowGap = Math.max(0, settings.rowGapMm ?? 3.0);
  const colGap = Math.max(0, settings.colGapMm ?? 3.2);

  const labelWidth = 99.0;
  const labelHeight = 44.0;

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

    // Outer rounded border (Industrial format matching factory photo & reference PDF)
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.35);
    doc.roundedRect(x + 0.5, y + 0.5, labelWidth - 1, labelHeight - 1, 2.4, 2.4, 'S');

    // Line 1: PartyName & Customer (matching factory reference photo)
    const maxPartyChars = safeBuffer ? 26 : 32;
    const safeCustomer = (item.customerName || 'Client').toUpperCase().slice(0, maxPartyChars);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(70, 80, 95);
    doc.text('PartyName', x + 3.0, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(15, 23, 42);
    doc.text(safeCustomer, x + 18.0, y + 4.8);

    // Line 2: Model/Part & Capsule Pill Door Number (matching factory reference photo)
    const modelText = (item.modelCode || item.profile || 'EXM-A-101').slice(0, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(70, 80, 95);
    doc.text('Model/Part', x + 3.0, y + 10.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(modelText, x + 18.0, y + 10.2);

    // Rounded Stadium Capsule Door Number on right (matching reference PDF)
    const pillW = 10.5;
    const pillH = 4.6;
    const pillX = x + labelWidth - pillW - 3.0;
    const pillY = y + 7.0;
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.3);
    doc.roundedRect(pillX, pillY, pillW, pillH, 2.3, 2.3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.doorNumber), pillX + pillW / 2, pillY + 3.3, { align: 'center' });

    // Optional ONLY DOOR badge pill if door has no frame
    if (item.isOnlyDoor) {
      const odW = 16.5;
      const odH = 4.4;
      const odX = pillX - odW - 1.5;
      const odY = y + 7.2;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.25);
      doc.roundedRect(odX, odY, odW, odH, 1.0, 1.0, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.0);
      doc.setTextColor(146, 64, 14);
      doc.text('ONLY DOOR', odX + odW / 2, odY + 3.1, { align: 'center' });
    }

    // Line 3: Hinge circle, LOCK Pill Box, COLOUR Pill Box (matching reference PDF)
    const hSide = (item.hingeSide || item.hand || 'R').toUpperCase().startsWith('L') ? 'L' : 'R';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(70, 80, 95);
    doc.text('Hinge:', x + 3.0, y + 15.2);

    // Circle for (R) or (L)
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.3);
    doc.roundedRect(x + 11.5, y + 12.0, 4.8, 4.2, 2.1, 2.1, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(15, 23, 42);
    doc.text(hSide, x + 13.9, y + 15.2, { align: 'center' });

    // LOCK pill container
    const lockPillX = x + 18.0;
    const lockPillY = y + 12.0;
    const lockPillW = 34.0;
    const lockPillH = 4.3;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(lockPillX, lockPillY, lockPillW, lockPillH, 1.2, 1.2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text('LOCK:', lockPillX + 1.8, lockPillY + 3.1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    const lockName = (item.lock || 'BABY LATCH').toUpperCase().slice(0, 16);
    doc.text(lockName, lockPillX + 9.2, lockPillY + 3.1);

    // COLOUR pill container
    const colPillX = lockPillX + lockPillW + 1.5;
    const colPillY = y + 12.0;
    const colPillW = labelWidth - (colPillX - x) - 3.0;
    const colPillH = 4.3;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(colPillX, colPillY, colPillW, colPillH, 1.2, 1.2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text('COLOUR:', colPillX + 1.8, colPillY + 3.1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    const colourName = (item.finish || 'ROSE WOOD').toUpperCase().slice(0, 24);
    doc.text(colourName, colPillX + 12.5, colPillY + 3.1);

    // Line 4: 2-Cell Industrial Cutting Box (Full width, balanced 50/50 split)
    const hasRemark = Boolean(item.remark && item.remark.trim().length > 0);
    const boxX = x + 2.5;
    const boxY = y + 17.5;
    const boxW = labelWidth - 5.0; // 94.0mm
    const boxH = hasRemark ? 19.5 : 24.5;

    // Outer box border
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.roundedRect(boxX, boxY, boxW, boxH, 1.0, 1.0, 'S');

    // 1 Vertical divider dividing Height (50%) and Width (50%)
    const c1W = Math.round(boxW * 0.50); // 47.0mm
    doc.line(boxX + c1W, boxY, boxX + c1W, boxY + boxH);

    // Heights and Widths formatted with minus sign as in factory photo
    const cleanNum = (val?: string | number): number => {
      if (typeof val === 'number') return Math.abs(val);
      if (!val) return 0;
      const cleaned = String(val).replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const finHNum = cleanNum(item.finH) || cleanNum(item.finHText) || (item.heightMm ? item.heightMm / 10 : 205.5);
    const finTopWNum = cleanNum(item.finTopW) || cleanNum(item.finTopWText) || (item.widthMm ? item.widthMm / 10 : 82.4);
    const finBtmWNum = cleanNum(item.finBtmW) || cleanNum(item.finBtmWText) || finTopWNum;

    const hCut = `-${finHNum > 0 ? finHNum.toFixed(1) : '205.5'}`;
    const topCut = `-${finTopWNum > 0 ? finTopWNum.toFixed(1) : '82.4'}`;
    const btmCut = `-${finBtmWNum > 0 ? finBtmWNum.toFixed(1) : finTopWNum.toFixed(1)}`;

    // Cell 1: H-LEFT or H-RIGHT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(hasRemark ? 6.8 : 7.2);
    doc.setTextColor(30, 41, 59);
    doc.text(hSide === 'R' ? 'H-LEFT' : 'H-RIGHT', boxX + 2.5, boxY + (hasRemark ? 5.0 : 5.4));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(hasRemark ? 11.5 : 13.0);
    doc.setTextColor(15, 23, 42);
    doc.text(hCut, boxX + c1W - 3.0, boxY + (hasRemark ? 13.5 : 15.5), { align: 'right' });

    // Cell 2: Stacked TOP and BOTTOM width rows with horizontal center divider
    const dividerY = hasRemark ? boxY + 9.5 : boxY + boxH / 2;
    doc.line(boxX + c1W, dividerY, boxX + boxW, dividerY);

    // Row 1: TOP
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(hasRemark ? 6.5 : 7.0);
    doc.setTextColor(30, 41, 59);
    doc.text('TOP', boxX + c1W + 3.0, boxY + (hasRemark ? 5.0 : 5.8));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(hasRemark ? 9.5 : 11.0);
    doc.setTextColor(15, 23, 42);
    doc.text(topCut, boxX + boxW - 3.0, boxY + (hasRemark ? 5.5 : 7.5), { align: 'right' });

    // Row 2: BOTTOM (Exact match to reference PDF)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(hasRemark ? 6.5 : 7.0);
    doc.setTextColor(30, 41, 59);
    doc.text('BOTTOM', boxX + c1W + 3.0, dividerY + (hasRemark ? 5.0 : 6.0));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(hasRemark ? 9.5 : 11.0);
    doc.setTextColor(15, 23, 42);
    doc.text(btmCut, boxX + boxW - 3.0, dividerY + (hasRemark ? 5.5 : 7.8), { align: 'right' });

    // Line 5: Conditional Remark (if non-empty)
    if (hasRemark) {
      const remarkY = boxY + boxH + 0.8;
      const remarkH = 4.5;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.25);
      doc.roundedRect(boxX, remarkY, boxW, remarkH, 0.8, 0.8, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(6.0);
      doc.text('REMARK:', boxX + 2.5, remarkY + 3.1);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(6.2);
      doc.text(item.remark!.trim().slice(0, 60), boxX + 16.0, remarkY + 3.1);
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

/**
 * Generates exact 12L A4 (99mm x 44mm, 2x6 Grid) "AFTER-PACKING SITE VERIFICATION PASS" stickers.
 * Matches the factory packing sticker layout:
 * - Dark header bar: AFTER-PACKING SITE VERIFICATION PASS | DOOR #N [Tag]
 * - Party + Model (Thickness) + [LOCK] + [COLOUR]
 * - 3-Column Grid: GIVEN OPENING (FRAME) | CONFIRM FINISH DOOR (QC: PASSED & PACKED) | SCAN QR (FIND & VERIFY)
 * - Footer: [ ] SITE VERIFIED: Confirmed matches opening & model | Sign/Date: ______
 */
export async function generate12LPackingPassPdf(
  stickers: Printable12LStickerItem[],
  settings: StickerSheetConfig = {}
): Promise<PureVectorPdf> {
  const doc = new PureVectorPdf();
  const cols = 2;
  const rows = 6;
  const perPage = cols * rows;

  const topMargin = Math.max(0, settings.topMarginMm ?? 9.0);
  const leftMargin = Math.max(0, settings.leftMarginMm ?? 4.4);
  const rowGap = Math.max(0, settings.rowGapMm ?? 3.0);
  const colGap = Math.max(0, settings.colGapMm ?? 3.2);

  const labelWidth = 99.0;
  const labelHeight = 44.0;

  const nudgeX = settings.nudgeXmm ?? 0;
  const nudgeY = settings.nudgeYmm ?? 0;

  const totalPages = Math.max(1, Math.ceil(stickers.length / perPage));
  const uniqueParties = Array.from(
    new Set(stickers.map((s) => (s.customerName || 'CLIENT').trim().toUpperCase()).filter(Boolean))
  );
  const partySummaryText =
    uniqueParties.length > 1
      ? `MULTI-PARTY 12L LABELS: ${uniqueParties.length} Parties (${uniqueParties.slice(0, 4).join(', ')}${uniqueParties.length > 4 ? '...' : ''})`
      : `PARTY: ${uniqueParties[0] || 'EXMARK CLIENT'}`;

  const cleanNum = (val?: string | number): number => {
    if (typeof val === 'number') return Math.abs(val);
    if (!val) return 0;
    const cleaned = String(val).replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const fmtCm = (n: number, decimals = 2): string => {
    if (!Number.isFinite(n) || n <= 0) return '-';
    return Number(n.toFixed(decimals)).toString();
  };

  const drawPageHeader = (pageNumber: number) => {
    const headerY = Math.max(4.5, topMargin - 3.2) + nudgeY;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(120, 130, 145);
    doc.text(
      `12L A4 AFTER-PACKING SITE VERIFICATION LABELS (2x6 GRID) | ${partySummaryText} | PAGE ${pageNumber} OF ${totalPages}`,
      105,
      headerY,
      { align: 'center' }
    );
  };

  drawPageHeader(1);

  for (let i = 0; i < stickers.length; i++) {
    const item = stickers[i];
    const indexOnPage = i % perPage;
    if (i > 0 && indexOnPage === 0) {
      doc.addPage();
      drawPageHeader(Math.floor(i / perPage) + 1);
    }

    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);
    const x = leftMargin + col * (labelWidth + colGap) + nudgeX;
    const y = topMargin + row * (labelHeight + rowGap) + nudgeY;

    // Resolve measurements
    const finHNum =
      cleanNum(item.finH) || cleanNum(item.finHText) || (item.heightMm ? item.heightMm / 10 : 201.2);
    const finTopWNum =
      cleanNum(item.finTopW) || cleanNum(item.finTopWText) || (item.widthMm ? item.widthMm / 10 : 72.4);
    const finBtmWNum = cleanNum(item.finBtmW) || cleanNum(item.finBtmWText) || finTopWNum;

    const hDedMm =
      item.hDedMm !== undefined
        ? Math.round(item.hDedMm)
        : item.rawHeightCm && finHNum > 0
        ? Math.max(0, Math.round((item.rawHeightCm - finHNum) * 10))
        : 17;
    const wDedMm =
      item.wDedMm !== undefined
        ? Math.round(item.wDedMm)
        : item.rawWidthTopCm && finTopWNum > 0
        ? Math.max(0, Math.round((item.rawWidthTopCm - finTopWNum) * 10))
        : 85;

    const rawH = item.rawHeightCm && item.rawHeightCm > 0 ? item.rawHeightCm : finHNum + hDedMm / 10;
    const rawTopW =
      item.rawWidthTopCm && item.rawWidthTopCm > 0 ? item.rawWidthTopCm : finTopWNum + wDedMm / 10;
    const rawBtmW =
      item.rawWidthBtmCm && item.rawWidthBtmCm > 0
        ? item.rawWidthBtmCm
        : finBtmWNum + wDedMm / 10;

    const doorTag = (item.doorTag || item.roomLabel || item.floorZone || `Door #${item.doorNumber}`).trim();
    const thicknessTag = item.doorThicknessLabel ? ` (${item.doorThicknessLabel})` : ' (28mm)';
    const modelBase = (item.modelCode || item.profile || 'EXM-A-101').trim();
    const modelLine = modelBase.includes('mm') ? modelBase : `${modelBase}${thicknessTag}`;
    const lockText = (item.lock || 'BABY LATCH').toUpperCase().slice(0, 16);
    const colourText = (item.finish || 'NATURAL TEAK').toUpperCase().slice(0, 18);
    const rebateText = (item.rebateLabel || 'Mini 40x25').slice(0, 22);
    const roomText = (item.roomLabel || doorTag).slice(0, 22);
    const tapeInchH = item.tapeInchH || `${Math.round(rawH / 2.54)}"`;
    const qrPayload = item.qrUrl || item.barcode || `${item.jobCardNumber || item.orderNumber}-D${item.doorNumber}`;

    // Outer card border (99 x 44 mm)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.35);
    doc.roundedRect(x + 0.4, y + 0.4, labelWidth - 0.8, labelHeight - 0.8, 1.5, 1.5, 'FD');

    // ROW 1: Solid dark header bar (5.2mm tall)
    doc.setFillColor(17, 24, 39);
    doc.rect(x + 0.4, y + 0.4, labelWidth - 0.8, 5.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text('AFTER-PACKING SITE VERIFICATION PASS', x + 2.4, y + 4.0);

    doc.setFontSize(6.6);
    doc.text(`DOOR #${item.doorNumber} [${doorTag.slice(0, 14)}]`, x + labelWidth - 2.4, y + 4.0, {
      align: 'right',
    });

    // ROW 2: Party & Model/Lock/Colour specs band (y+5.6 .. y+13.8)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text(`PARTY: ${(item.customerName || 'CLIENT').toUpperCase().slice(0, 38)}`, x + 2.4, y + 9.1);

    // Line 2b: MODEL left | [ LOCK ] [ COLOUR ] right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`MODEL: ${modelLine.slice(0, 24)}`, x + 2.4, y + 12.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.9);
    doc.setTextColor(30, 41, 59);
    const specsRight = `[ LOCK: ${lockText} ] [ COLOUR: ${colourText} ]`;
    doc.text(specsRight, x + labelWidth - 2.2, y + 12.6, { align: 'right' });

    // ROW 3: 3-Column Bordered Spec & QR Grid (y+13.9 .. y+36.8 => height 22.9mm)
    const gridX = x + 1.6;
    const gridY = y + 13.9;
    const gridW = labelWidth - 3.2; // 95.8mm
    const gridH = 22.9;
    const subHeaderH = 3.6;
    const col1W = 35.5;
    const col2W = 38.0;
    const col3W = gridW - col1W - col2W; // 22.3mm

    // Column fills
    // Col 1 header fill (soft slate gray)
    doc.setFillColor(226, 232, 240);
    doc.rect(gridX, gridY, col1W, subHeaderH, 'F');
    // Col 2 header fill (soft blue) + body fill (very pale blue)
    doc.setFillColor(219, 234, 254);
    doc.rect(gridX + col1W, gridY, col2W, subHeaderH, 'F');
    doc.setFillColor(239, 246, 255);
    doc.rect(gridX + col1W, gridY + subHeaderH, col2W, gridH - subHeaderH, 'F');
    // Col 3 header fill (soft amber)
    doc.setFillColor(254, 243, 199);
    doc.rect(gridX + col1W + col2W, gridY, col3W, subHeaderH, 'F');

    // Outer grid border & vertical/horizontal dividers
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.28);
    doc.rect(gridX, gridY, gridW, gridH, 'S');
    doc.line(gridX + col1W, gridY, gridX + col1W, gridY + gridH);
    doc.line(gridX + col1W + col2W, gridY, gridX + col1W + col2W, gridY + gridH);
    doc.line(gridX, gridY + subHeaderH, gridX + gridW, gridY + subHeaderH);

    // Subheader titles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.4);
    doc.setTextColor(30, 41, 59);
    doc.text('GIVEN OPENING (FRAME)', gridX + col1W / 2, gridY + 2.6, { align: 'center' });

    doc.setTextColor(29, 78, 216);
    doc.text('CONFIRM FINISH DOOR', gridX + col1W + col2W / 2, gridY + 2.6, { align: 'center' });

    doc.setTextColor(180, 83, 9);
    doc.text('SCAN QR', gridX + col1W + col2W + col3W / 2, gridY + 2.6, { align: 'center' });

    // Col 1 body: GIVEN OPENING (FRAME)
    const c1Left = gridX + 1.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.9);
    doc.setTextColor(51, 65, 85);
    doc.text('Opening H:', c1Left, gridY + 7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(fmtCm(rawH, 2), c1Left + 11.8, gridY + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${tapeInchH})`, gridX + col1W - 1.2, gridY + 7.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.7);
    doc.setTextColor(51, 65, 85);
    doc.text(`Opening W: T:${fmtCm(rawTopW, 2)} / B:${fmtCm(rawBtmW, 2)}`, c1Left, gridY + 12.1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.7);
    doc.setTextColor(51, 65, 85);
    doc.text(`Rebate: ${rebateText}`, c1Left, gridY + 16.6);

    doc.setFontSize(5.4);
    doc.setTextColor(100, 116, 139);
    const roomOrRemark = item.remark && item.remark.trim().length > 0
      ? `Note: ${item.remark.trim().slice(0, 22)}`
      : `Room: ${roomText}`;
    doc.text(roomOrRemark, c1Left, gridY + 20.8);

    // Col 2 body: CONFIRM FINISH DOOR
    const c2Left = gridX + col1W + 1.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(15, 23, 42);
    doc.text(`HEIGHT: ${fmtCm(finHNum, 1)} cm`, c2Left, gridY + 7.7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`WIDTH: T:${fmtCm(finTopWNum, 1)}  B:${fmtCm(finBtmWNum, 1)} cm`, c2Left, gridY + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Clearance: H-${hDedMm} / W-${wDedMm}mm`, c2Left, gridY + 16.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    doc.setTextColor(4, 120, 87);
    doc.text('QC: PASSED & PACKED', c2Left, gridY + 21.0);

    // Col 3 body: SCAN QR + FIND & VERIFY
    const qrSize = 14.4;
    const qrX = gridX + col1W + col2W + (col3W - qrSize) / 2;
    const qrY = gridY + subHeaderH + 0.9;
    doc.drawQrCode(qrPayload, qrX, qrY, qrSize);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.0);
    doc.setTextColor(15, 23, 42);
    doc.text('FIND & VERIFY', gridX + col1W + col2W + col3W / 2, gridY + gridH - 1.0, {
      align: 'center',
    });

    // ROW 4: Bottom Site Verification Footer (y+36.8 .. y+43.6)
    const footerLineY = y + 37.6;
    const checkboxY = y + 39.1;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(x + 1.6, footerLineY, x + labelWidth - 1.6, footerLineY);

    // Empty checkbox
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.rect(x + 2.4, checkboxY, 2.7, 2.7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.6);
    doc.setTextColor(15, 23, 42);
    doc.text('SITE VERIFIED:', x + 6.2, y + 41.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Confirmed matches opening & model', x + 21.6, y + 41.2);

    // Sign/Date right side
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Sign/Date:', x + 70.5, y + 41.2);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.22);
    doc.line(x + 80.5, y + 41.5, x + labelWidth - 2.2, y + 41.5);
  }

  return doc;
}
