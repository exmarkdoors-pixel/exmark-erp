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
}

export interface StickerSheetConfig {
  companyName?: string;
  layout?: '2x6' | '3x4'; // '2x6' (105mm x 48mm) or '3x4' (70mm x 74mm)
  brandColor?: [number, number, number]; // RGB
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
  private readonly pageWidthPt = 595.28; // 210mm
  private readonly pageHeightPt = 841.89; // 297mm

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

  text(str: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }): void {
    const safeStr = String(str ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    let px = x * this.k;
    // PDF baseline adjustment
    const py = this.pageHeightPt - (y * this.k) - (this.fontSize * 0.25);
    const approxW = safeStr.length * this.fontSize * 0.52;

    if (options?.align === 'right') {
      px -= approxW;
    } else if (options?.align === 'center') {
      px -= approxW / 2;
    }

    const op = `BT ${this.fontKey} ${this.fontSize} Tf ${this.textColor} ${px.toFixed(2)} ${py.toFixed(2)} Td (${safeStr}) Tj ET`;
    this.pages[this.currentPage].push(op);
  }

  buildPdf(): Uint8Array {
    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    let objCount = 1;

    const addObj = (content: string): number => {
      offsets.push(out.length);
      const id = objCount++;
      out += `${id} 0 obj\n${content}\nendobj\n`;
      return id;
    };

    const font1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const font2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const font3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
    const font4 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>');

    const contentObjIds: number[] = [];
    for (const pageOps of this.pages) {
      const streamBody = pageOps.join('\n');
      const streamLen = typeof Buffer !== 'undefined'
        ? Buffer.byteLength(streamBody, 'utf8')
        : new TextEncoder().encode(streamBody).length;

      const cId = addObj(`<< /Length ${streamLen} >>\nstream\n${streamBody}\nendstream`);
      contentObjIds.push(cId);
    }

    const pagesRootId = objCount++;
    const pageObjIds: number[] = [];

    for (let i = 0; i < this.pages.length; i++) {
      const pId = addObj(
        `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${this.pageWidthPt} ${this.pageHeightPt}] /Contents ${contentObjIds[i]} 0 R /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R /F3 ${font3} 0 R /F4 ${font4} 0 R >> >> >>`
      );
      pageObjIds.push(pId);
    }

    // Write Pages Root catalog
    offsets.push(out.length);
    out += `${pagesRootId} 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`;

    const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`);

    const xrefOffset = out.length;
    out += `xref\n0 ${objCount}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      out += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objCount} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

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

  if (layout === '2x6') {
    // 2 COLUMNS x 6 ROWS = 12 STICKERS PER A4 PAGE (105mm x 48mm per label)
    const labelWidth = 105;
    const labelHeight = 48;
    const cols = 2;
    const rows = 6;
    const perPage = cols * rows;

    for (let i = 0; i < stickers.length; i++) {
      const item = stickers[i];
      const indexOnPage = i % perPage;
      if (i > 0 && indexOnPage === 0) doc.addPage();

      const col = indexOnPage % cols;
      const row = Math.floor(indexOnPage / cols);
      const x = col * labelWidth;
      const y = 4.5 + row * labelHeight;

      // Outer boundary border
      doc.setDrawColor(200, 205, 215);
      doc.setLineWidth(0.3);
      doc.rect(x + 1.5, y + 1.5, labelWidth - 3, labelHeight - 3);

      // Top title banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(x + 1.5, y + 1.5, labelWidth - 3, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(companyName, x + 3.5, y + 6.5);

      // Door sequence badge
      doc.setFontSize(7.5);
      doc.text(
        `${item.orderNumber} • DOOR ${item.doorNumber}/${item.totalDoorsInOrder}`,
        x + labelWidth - 3.5,
        y + 6.5,
        { align: 'right' }
      );

      // Customer & site
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const safeCustomer = (item.customerName || 'Client').slice(0, 32);
      doc.text(safeCustomer, x + 3.5, y + 13.5);

      if (item.siteName) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(item.siteName.slice(0, 40), x + 3.5, y + 17);
      }

      // Shutter dimensions box
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x + 3.5, y + 19, 58, 12, 1, 1, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(item.shutterSize, x + 5, y + 24.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tape: ${item.tape}`, x + 5, y + 28.5);

      // Specs column (right side of box)
      const specX = x + 64;
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Spec: ${(item.profile || 'FRP Molded 30mm').slice(0, 22)}`, specX, y + 21);
      doc.text(`Color: ${(item.finish || 'Teak Woodgrain').slice(0, 22)}`, specX, y + 25);
      doc.text(`Hdw: ${(item.hand || 'RH').slice(0, 8)} • ${(item.lock || 'Mortise').slice(0, 12)}`, specX, y + 29);

      // Barcode / Tracking code
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode, x + labelWidth / 2, y + 33.5, { align: 'center' });

      // ==============================================================
      // STRICT CONDITIONAL REMARK LOGIC:
      // Rendered ONLY when remark is non-empty. Otherwise completely blank!
      // ==============================================================
      const hasRemark = item.remark && item.remark.trim().length > 0;
      if (hasRemark) {
        doc.setFillColor(254, 243, 199); // amber-100
        doc.setDrawColor(245, 158, 11); // amber-500
        doc.setLineWidth(0.2);
        doc.roundedRect(x + 3.5, y + 36, labelWidth - 7, 7, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9); // amber-700
        doc.setFontSize(6.5);
        doc.text('REMARK:', x + 5, y + 40.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(7);
        doc.text(item.remark!.trim().slice(0, 48), x + 18, y + 40.5);
      }
    }
  } else {
    // 3 COLUMNS x 4 ROWS = 12 STICKERS PER A4 PAGE (70mm x 74mm per label)
    const labelWidth = 70;
    const labelHeight = 74;
    const cols = 3;
    const rows = 4;
    const perPage = cols * rows;

    for (let i = 0; i < stickers.length; i++) {
      const item = stickers[i];
      const indexOnPage = i % perPage;
      if (i > 0 && indexOnPage === 0) doc.addPage();

      const col = indexOnPage % cols;
      const row = Math.floor(indexOnPage / cols);
      const x = col * labelWidth;
      const y = 3 + row * labelHeight;

      doc.setDrawColor(200, 205, 215);
      doc.setLineWidth(0.3);
      doc.rect(x + 1.5, y + 1.5, labelWidth - 3, labelHeight - 3);

      doc.setFillColor(15, 23, 42);
      doc.rect(x + 1.5, y + 1.5, labelWidth - 3, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(companyName, x + 3, y + 6);
      doc.text(item.orderNumber, x + labelWidth - 3, y + 6, { align: 'right' });

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.text((item.customerName || 'Client').slice(0, 26), x + 3, y + 13);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x + 2.5, y + 16, labelWidth - 5, 14, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(item.shutterSize, x + 4, y + 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tape: ${item.tape}`, x + 4, y + 27);

      doc.setFontSize(6.5);
      doc.text(`Spec: ${(item.profile || 'FRP 30mm').slice(0, 24)}`, x + 3, y + 34);
      doc.text(`Finish: ${(item.finish || 'Teak').slice(0, 24)}`, x + 3, y + 38);
      doc.text(`Hdw: ${item.hand} • ${item.lock}`, x + 3, y + 42);

      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode, x + labelWidth / 2, y + 48, { align: 'center' });

      // STRICT CONDITIONAL REMARK
      const hasRemark = item.remark && item.remark.trim().length > 0;
      if (hasRemark) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.roundedRect(x + 2.5, y + 52, labelWidth - 5, 8, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        doc.setFontSize(6);
        doc.text('REMARK:', x + 4, y + 56);
        doc.setTextColor(15, 23, 42);
        doc.text(item.remark!.trim().slice(0, 32), x + 4, y + 59);
      }
    }
  }

  return doc;
}
