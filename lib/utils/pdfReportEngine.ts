import { ReportExecutionResult } from '@/types/communication';
import { PureVectorPdf, sanitizePdfText } from './pdfStickerEngine';

export interface ReportPdfOptions {
  reportTitle?: string;
  reportCode?: string;
  factoryName?: string;
  preparedBy?: string;
}

function isCurrencyField(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes('revenue') ||
    lower.includes('amount') ||
    lower.includes('margin') ||
    lower.includes('cost') ||
    lower.includes('price') ||
    lower.includes('gst') ||
    lower.includes('due') ||
    lower.includes('value')
  );
}

function formatColHeader(key: string): string {
  return sanitizePdfText(key.replace(/([A-Z])/g, ' $1').trim()).toUpperCase();
}

function formatCellValue(val: unknown, key: string): string {
  if (val === undefined || val === null || val === '') return '-';
  if (typeof val === 'number') {
    const formatted = val.toLocaleString('en-IN');
    return isCurrencyField(key) ? `Rs.${formatted}` : formatted;
  }
  return sanitizePdfText(val);
}

function fitText(text: string, maxMm: number, fontSizePt: number): string {
  const clean = sanitizePdfText(text);
  // Helvetica average char width ~ 0.48 * fontSizePt points (~0.17 * fontSizePt mm)
  const charWidthMm = fontSizePt * 0.175;
  const maxChars = Math.max(4, Math.floor(maxMm / charWidthMm));
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(3, maxChars - 2))}..`;
}

/**
 * Generates a structured, multi-page A4 vector PDF (.pdf) for any ERP Executive Report.
 */
export function generateExecutiveReportPdf(
  reportResult: ReportExecutionResult,
  options: ReportPdfOptions = {}
): PureVectorPdf {
  const title = sanitizePdfText(options.reportTitle || reportResult.title || 'Executive Business Report');
  const code = sanitizePdfText(options.reportCode || reportResult.reportCode || 'EXMARK-REPORT');
  const factoryName = sanitizePdfText(options.factoryName || 'Central Manufacturing Unit (Malappuram)');
  const preparedBy = sanitizePdfText(options.preparedBy || 'Plant Accounts & Operations Desk');
  const rows = reportResult.rows || [];
  const colKeys = rows.length > 0 ? Object.keys(rows[0]) : [];

  const isLandscape = colKeys.length >= 6;
  const doc = new PureVectorPdf({ orientation: isLandscape ? 'landscape' : 'portrait' });
  const pageW = doc.pageWidthMm;
  const pageH = doc.pageHeightMm;
  const margin = 12;
  const contentW = pageW - margin * 2;
  const bottomLimit = pageH - 18;

  const generatedDate = sanitizePdfText(
    new Date(reportResult.generatedAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  // Header on page 1
  let y = margin;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentW, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('EX-MARK DOORS PRIVATE LIMITED', margin + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Central Factory Unit, Cherur, Vengara, Malappuram, Kerala - 676304', margin + 4, y + 11.5);
  doc.text('Ph: +91 94479 28866  |  Email: exmarkdoors@gmail.com  |  www.exmarkdoors.com', margin + 4, y + 16.5);

  doc.setFillColor(225, 29, 72);
  doc.rect(pageW - margin - 34, y + 3, 31, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUDIT REPORT', pageW - margin - 18.5, y + 7.2, { align: 'center' });

  y += 23;

  // Report Metadata Band
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 14, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`REPORT CODE: ${code}  |  ${factoryName}`, margin + 3, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(fitText(title, contentW - 68, 10.5), margin + 3, y + 10.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${generatedDate}`, pageW - margin - 3, y + 5, { align: 'right' });
  doc.text(`Prepared By: ${preparedBy}`, pageW - margin - 3, y + 10.5, { align: 'right' });

  y += 17;

  // Summary Metrics Strip
  const summaryEntries = reportResult.summaryMetrics
    ? Object.entries(reportResult.summaryMetrics)
    : [];
  if (summaryEntries.length > 0) {
    const cardsPerRow = Math.min(4, summaryEntries.length);
    const cardGap = 3;
    const cardW = (contentW - cardGap * (cardsPerRow - 1)) / cardsPerRow;
    const cardH = 12.5;

    for (let idx = 0; idx < summaryEntries.length; idx++) {
      const colIdx = idx % cardsPerRow;
      if (idx > 0 && colIdx === 0) {
        y += cardH + 2.5;
      }
      const [mKey, mVal] = summaryEntries[idx];
      const cx = margin + colIdx * (cardW + cardGap);

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(cx, y, cardW, cardH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(fitText(formatColHeader(mKey), cardW - 4, 6.5), cx + 2.5, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(fitText(sanitizePdfText(mVal), cardW - 4, 9.5), cx + 2.5, y + 10);
    }
    y += cardH + 5;
  }

  // Compute Column Widths
  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No report records found for the selected criteria.', margin + 2, y + 6);
  } else {
    const idxColW = 9;
    const dataAreaW = contentW - idxColW;

    const weights = colKeys.map((key) => {
      const isNum = rows.some((r) => typeof r[key] === 'number');
      if (isNum) return 1.0;
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => sanitizePdfText(r[key] ?? '').length)
      );
      return Math.min(2.6, Math.max(1.1, maxLen / 12));
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;
    const colWidths = weights.map((w) => (w / totalWeight) * dataAreaW);

    const isNumericCol = colKeys.map((key) => rows.some((r) => typeof r[key] === 'number'));
    const numericTotals: Record<string, number> = {};
    colKeys.forEach((key, cIdx) => {
      if (isNumericCol[cIdx]) {
        numericTotals[key] = rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
      }
    });

    const headerH = 7.5;
    const rowH = 6.5;

    const drawTableHeader = (topY: number) => {
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, topY, contentW, headerH, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('#', margin + idxColW / 2, topY + 5, { align: 'center' });

      let cx = margin + idxColW;
      colKeys.forEach((key, cIdx) => {
        const w = colWidths[cIdx];
        const label = fitText(formatColHeader(key), w - 3, 7);
        if (isNumericCol[cIdx]) {
          doc.text(label, cx + w - 1.5, topY + 5, { align: 'right' });
        } else {
          doc.text(label, cx + 1.5, topY + 5);
        }
        cx += w;
      });
    };

    const drawPageFooter = (pageNo: number) => {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`EXMARK ERP AUDIT EXPORT | CODE: ${code}`, margin, pageH - 8);
      doc.text(`Page ${pageNo}`, pageW - margin, pageH - 8, { align: 'right' });
    };

    drawTableHeader(y);
    y += headerH;

    rows.forEach((row, rIdx) => {
      if (y + rowH > bottomLimit) {
        drawPageFooter(doc.getPageCount());
        doc.addPage();
        y = margin;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`${fitText(title, contentW - 40, 9)} (Cont.)`, margin, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Code: ${code}`, pageW - margin, y + 4, { align: 'right' });
        y += 7;

        drawTableHeader(y);
        y += headerH;
      }

      if (rIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentW, rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, contentW, rowH, 'S');

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(rIdx + 1), margin + idxColW / 2, y + 4.4, { align: 'center' });

      let cx = margin + idxColW;
      colKeys.forEach((key, cIdx) => {
        const w = colWidths[cIdx];
        const formatted = fitText(formatCellValue(row[key], key), w - 3, 7.5);
        doc.setFont('helvetica', isNumericCol[cIdx] ? 'bold' : 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        if (isNumericCol[cIdx]) {
          doc.text(formatted, cx + w - 1.5, y + 4.4, { align: 'right' });
        } else {
          doc.text(formatted, cx + 1.5, y + 4.4);
        }
        cx += w;
      });

      y += rowH;
    });

    // Totals Row
    if (y + rowH + 22 > pageH - 12) {
      drawPageFooter(doc.getPageCount());
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(226, 232, 240);
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.35);
    doc.rect(margin, y, contentW, rowH + 0.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Total', margin + idxColW / 2, y + 4.6, { align: 'center' });

    let tx = margin + idxColW;
    colKeys.forEach((key, cIdx) => {
      const w = colWidths[cIdx];
      if (cIdx === 0 && !isNumericCol[cIdx]) {
        doc.text(fitText(`TOTALS (${rows.length} Records)`, w - 3, 7.5), tx + 1.5, y + 4.6);
      } else if (isNumericCol[cIdx]) {
        const totalText = fitText(formatCellValue(numericTotals[key], key), w - 3, 7.5);
        doc.text(totalText, tx + w - 1.5, y + 4.6, { align: 'right' });
      } else {
        doc.text('-', tx + 1.5, y + 4.6);
      }
      tx += w;
    });

    y += rowH + 10;

    // Statutory Signatory Strip
    const sigW = (contentW - 12) / 3;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    const sigTitles = [
      { top: preparedBy, sub: 'Operations Data Desk' },
      { top: 'Plant General Manager', sub: 'Central Unit, Malappuram' },
      { top: 'EX-MARK DOORS PVT LTD', sub: 'Authorized Signatory' },
    ];
    sigTitles.forEach((sig, i) => {
      const sx = margin + i * (sigW + 6);
      doc.line(sx, y + 7, sx + sigW, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(fitText(sig.top, sigW, 7.5), sx + sigW / 2, y + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(sig.sub, sx + sigW / 2, y + 14.5, { align: 'center' });
    });

    drawPageFooter(doc.getPageCount());
  }

  return doc;
}
