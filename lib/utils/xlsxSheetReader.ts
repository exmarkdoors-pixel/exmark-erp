import zlib from 'zlib';

export interface XlsxSheetData {
  sheetName: string;
  rows: string[][];
}

interface ZipEntryRecord {
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}

const DATE_NUM_FMT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function readZipCentralDirectory(buf: Buffer): Map<string, ZipEntryRecord> {
  // Locate End of Central Directory (PK\x05\x06) scanning from tail
  let eocdOffset = -1;
  const minOffset = Math.max(0, buf.length - 65558);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid .xlsx file: ZIP central directory signature not found.');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, ZipEntryRecord>();

  let ptr = cdOffset;
  for (let i = 0; i < totalEntries && ptr + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const compressionMethod = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const fileNameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const fileName = buf
      .toString('utf8', ptr + 46, ptr + 46 + fileNameLen)
      .replace(/\\/g, '/');

    entries.set(fileName, {
      fileName,
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });
    ptr += 46 + fileNameLen + extraLen + commentLen;
  }

  return entries;
}

function extractZipEntryText(buf: Buffer, entry: ZipEntryRecord): string {
  const lh = entry.localHeaderOffset;
  if (lh + 30 > buf.length || buf.readUInt32LE(lh) !== 0x04034b50) {
    throw new Error(`Corrupt .xlsx archive entry: ${entry.fileName}`);
  }
  const fnLen = buf.readUInt16LE(lh + 26);
  const exLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + fnLen + exLen;
  const compressedSlice = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressedSlice.toString('utf8');
  }
  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressedSlice).toString('utf8');
  }
  throw new Error(`Unsupported .xlsx compression method (${entry.compressionMethod}). Save as CSV or standard Excel (.xlsx).`);
}

function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const strings: string[] = [];
  const siRegex = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
  let siMatch: RegExpExecArray | null;
  while ((siMatch = siRegex.exec(xml)) !== null) {
    const inner = siMatch[1];
    const tParts: string[] = [];
    const tRegex = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(inner)) !== null) {
      tParts.push(decodeXmlEntities(tMatch[1]));
    }
    strings.push(tParts.join(''));
  }
  return strings;
}

function parseDateStyleIndices(stylesXml: string | null): Set<number> {
  const dateStyleIndexes = new Set<number>();
  if (!stylesXml) return dateStyleIndexes;

  const customDateFmtIds = new Set<number>();
  const numFmtRegex = /<numFmt\s+[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g;
  let nfMatch: RegExpExecArray | null;
  while ((nfMatch = numFmtRegex.exec(stylesXml)) !== null) {
    const id = parseInt(nfMatch[1], 10);
    const code = nfMatch[2].toLowerCase().replace(/"[^"]*"/g, '');
    if (/[ymdh]/.test(code) && !/^[#0.,]+$/.test(code)) {
      customDateFmtIds.add(id);
    }
  }

  const cellXfsMatch = /<cellXfs(?:\s[^>]*)?>([\s\S]*?)<\/cellXfs>/.exec(stylesXml);
  if (!cellXfsMatch) return dateStyleIndexes;

  const xfRegex = /<xf\b([^>]*)(?:\/>|>[\s\S]*?<\/xf>)/g;
  let xfMatch: RegExpExecArray | null;
  let idx = 0;
  while ((xfMatch = xfRegex.exec(cellXfsMatch[1])) !== null) {
    const attrs = xfMatch[1];
    const fmtIdMatch = /numFmtId="(\d+)"/.exec(attrs);
    if (fmtIdMatch) {
      const fmtId = parseInt(fmtIdMatch[1], 10);
      if (DATE_NUM_FMT_IDS.has(fmtId) || customDateFmtIds.has(fmtId)) {
        dateStyleIndexes.add(idx);
      }
    }
    idx++;
  }

  return dateStyleIndexes;
}

function excelSerialToIsoDate(serial: number): string {
  const utcMs = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(utcMs).toISOString().slice(0, 10);
}

function columnLettersToIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, '').toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, col - 1);
}

function parseWorksheetRows(
  sheetXml: string,
  sharedStrings: string[],
  dateStyleIndices: Set<number>
): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1];
    const rowCells: string[] = [];
    let nextSequentialCol = 0;

    const cellRegex = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] || '';

      const refMatch = /\br="([A-Z]+\d+)"/i.exec(attrs);
      const colIdx = refMatch ? columnLettersToIndex(refMatch[1]) : nextSequentialCol;
      nextSequentialCol = colIdx + 1;

      const typeMatch = /\bt="([^"]+)"/.exec(attrs);
      const cellType = typeMatch ? typeMatch[1] : '';
      const styleMatch = /\bs="(\d+)"/.exec(attrs);
      const styleIdx = styleMatch ? parseInt(styleMatch[1], 10) : -1;

      let value = '';
      if (cellType === 'inlineStr') {
        const tParts: string[] = [];
        const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
        let m: RegExpExecArray | null;
        while ((m = tRe.exec(inner)) !== null) {
          tParts.push(decodeXmlEntities(m[1]));
        }
        value = tParts.join('');
      } else {
        const vMatch = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(inner);
        const rawV = vMatch ? decodeXmlEntities(vMatch[1].trim()) : '';

        if (cellType === 's') {
          const strIndex = parseInt(rawV, 10);
          value = Number.isFinite(strIndex) ? sharedStrings[strIndex] ?? '' : '';
        } else if (cellType === 'str' || cellType === 'b' || cellType === 'e') {
          value = rawV;
        } else if (rawV !== '' && styleIdx >= 0 && dateStyleIndices.has(styleIdx)) {
          const serial = Number(rawV);
          value = Number.isFinite(serial) && serial > 20000 && serial < 90000
            ? excelSerialToIsoDate(serial)
            : rawV;
        } else {
          value = rawV;
        }
      }

      while (rowCells.length <= colIdx) rowCells.push('');
      rowCells[colIdx] = value.trim();
    }

    if (rowCells.some((c) => c !== '')) {
      rows.push(rowCells);
    }
  }

  return rows;
}

/**
 * Reads an .xlsx binary buffer completely offline (Vyapar / Excel / Google Sheets OpenXML exports)
 * and extracts the primary populated worksheet as normalized 2D string rows.
 */
export function readXlsxBufferRows(buffer: Buffer): XlsxSheetData {
  if (!buffer || buffer.length < 22) {
    throw new Error('Uploaded .xlsx file is empty or too small.');
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error(
      'File is not a valid .xlsx workbook. If exported as legacy .xls, please open in Excel and Save As .xlsx or .csv.'
    );
  }

  const entries = readZipCentralDirectory(buffer);
  const sharedStringsXml = entries.has('xl/sharedStrings.xml')
    ? extractZipEntryText(buffer, entries.get('xl/sharedStrings.xml')!)
    : null;
  const stylesXml = entries.has('xl/styles.xml')
    ? extractZipEntryText(buffer, entries.get('xl/styles.xml')!)
    : null;

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const dateStyleIndices = parseDateStyleIndices(stylesXml);

  const sheetKeys = Array.from(entries.keys())
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10);
      const nb = parseInt(b.replace(/\D/g, ''), 10);
      return na - nb;
    });

  if (sheetKeys.length === 0) {
    throw new Error('No worksheets found inside uploaded .xlsx file.');
  }

  let bestSheet: XlsxSheetData = { sheetName: sheetKeys[0], rows: [] };
  for (const key of sheetKeys) {
    const sheetXml = extractZipEntryText(buffer, entries.get(key)!);
    const rows = parseWorksheetRows(sheetXml, sharedStrings, dateStyleIndices);
    if (rows.length > bestSheet.rows.length) {
      bestSheet = { sheetName: pathBaseName(key), rows };
    }
    if (rows.length >= 2) break;
  }

  return bestSheet;
}

function pathBaseName(zipPath: string): string {
  const parts = zipPath.split('/');
  return parts[parts.length - 1] || zipPath;
}
