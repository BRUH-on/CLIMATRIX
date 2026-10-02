/**
 * Shared PDFKit utilities for report and notice generation.
 * Provides consistent styling, layout helpers, and rendering primitives.
 */
import fs from 'node:fs';
import PDFDocument from 'pdfkit';

// Brand color palette (matches frontend)
export const C = {
  ink: '#1a1410',
  ink2: '#2e2618',
  ink3: '#3d3020',
  muted: '#6b6357',
  paper: '#f0ebe0',
  paper2: '#e8e2d4',
  red: '#c0392b',
  amber: '#d35400',
  green: '#1e8449',
};

export const MARGIN = {
  top: 56,
  bottom: 64,
  left: 50,
  right: 50,
};

export type Doc = PDFDocument;

/**
 * Create a new PDF document with standard settings.
 */
export function createDoc(title: string, subject: string): PDFDocument {
  return new PDFDocument({
    size: 'A4',
    margins: MARGIN,
    info: {
      Title: title,
      Author: 'ClimaCore',
      Subject: subject,
      Producer: 'ClimaCore API',
      Creator: 'ClimaCore',
    },
  });
}

/**
 * Render the document to a file with footer on each page.
 * Returns total page count.
 */
export function renderToFile(
  doc: PDFDocument,
  filepath: string,
  footerText: string,
  drawContent: (doc: PDFDocument) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let pageCount = 1;
    doc.on('pageAdded', () => {
      pageCount++;
    });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    drawContent(doc);

    // Add footer to all pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(footerText, MARGIN.left, doc.page.height - 40, {
          align: 'center',
          width: doc.page.width - MARGIN.left - MARGIN.right,
        });
    }

    doc.end();

    stream.on('finish', () => resolve(pageCount));
    stream.on('error', reject);
  });
}

/**
 * Draw brand bar at top of page (8px colored strip).
 */
export function brandBar(doc: Doc): void {
  doc
    .save()
    .rect(0, 0, doc.page.width, 8)
    .fillColor(C.ink3)
    .fill()
    .restore();
}

/**
 * Draw a dashed horizontal rule.
 */
export function dashedRule(doc: Doc, y: number, lineWidth = 1): void {
  doc
    .save()
    .strokeColor(C.ink3)
    .lineWidth(lineWidth)
    .dash(3, { space: 3 })
    .moveTo(MARGIN.left, y)
    .lineTo(doc.page.width - MARGIN.right, y)
    .stroke()
    .undash()
    .restore();
}

/**
 * Draw a section title with underline.
 */
export function sectionTitle(doc: Doc, label: string): void {
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(C.ink)
    .text(label, { characterSpacing: 1.5 });

  const y = doc.y + 1;
  dashedRule(doc, y, 1);
  doc.y = y + 6;
}

/**
 * Key-value pair display.
 */
export function kv(doc: Doc, key: string, value: string): void {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.muted).text(key + ': ', {
    continued: true,
  });
  doc.font('Helvetica').fillColor(C.ink).text(value);
}

/**
 * Draw a grid of KPI cards.
 */
export function kpiGrid(
  doc: Doc,
  cells: Array<{ label: string; value: string; color?: string }>,
): void {
  const cols = 4;
  const cellW = contentWidth(doc) / cols;
  const cellH = 38;
  const startX = MARGIN.left;
  let row = 0;

  cells.forEach((cell, idx) => {
    const col = idx % cols;
    if (col === 0 && idx > 0) row++;
    const x = startX + col * cellW;
    const y = doc.y + row * cellH;

    doc
      .save()
      .rect(x + 2, y, cellW - 4, cellH - 4)
      .fillAndStroke(C.paper2, C.ink3)
      .restore();

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(cell.label.toUpperCase(), x + 8, y + 6, { width: cellW - 16 });

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(cell.color || C.ink)
      .text(cell.value, x + 8, y + 16, { width: cellW - 16 });
  });

  doc.y = doc.y + Math.ceil(cells.length / cols) * cellH;
}

/**
 * Draw a data table with header and rows.
 */
export function drawTable(
  doc: Doc,
  columns: Array<{ header: string; width: number; align?: 'left' | 'right' | 'center' }>,
  rows: string[][],
): void {
  const startX = MARGIN.left;
  const rowH = 18;
  const padX = 5;
  const totalW = columns.reduce((sum, col) => sum + col.width, 0);

  const ensurePageRoom = () => {
    if (doc.y + rowH > doc.page.height - 80) doc.addPage();
  };

  // Header row
  ensurePageRoom();
  let y = doc.y;
  doc.save().rect(startX, y, totalW, rowH).fillColor(C.ink3).fill().restore();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.paper);

  let x = startX;
  columns.forEach((col) => {
    const align = col.align || 'left';
    doc.text(col.header, x + padX, y + 5, {
      width: col.width - padX * 2,
      align,
      ellipsis: true,
      lineBreak: false,
    });
    x += col.width;
  });
  doc.y = y + rowH;

  // Data rows
  rows.forEach((row, r) => {
    ensurePageRoom();
    y = doc.y;

    if (r % 2 === 0) {
      doc
        .save()
        .rect(startX, y, totalW, rowH)
        .fillColor(C.paper2)
        .fillOpacity(0.5)
        .fill()
        .fillOpacity(1)
        .restore();
    }

    doc.font('Helvetica').fontSize(9).fillColor(C.ink);
    x = startX;

    row.forEach((cell, i) => {
      const align = columns[i].align || 'left';
      let color = C.ink;

      // Color-code status cells
      const cellUpper = cell.toUpperCase();
      if (cellUpper === 'VIOLATION') color = C.red;
      else if (cellUpper === 'WARNING') color = C.amber;
      else if (cellUpper === 'COMPLIANT') color = C.green;

      doc.fillColor(color).text(cell, x + padX, y + 5, {
        width: columns[i].width - padX * 2,
        align,
        ellipsis: true,
        lineBreak: false,
      });
      x += columns[i].width;
    });

    doc.fillColor(C.ink);
    doc.y = y + rowH;
  });

  // Border around entire table
  doc
    .save()
    .strokeColor(C.ink3)
    .lineWidth(0.8)
    .rect(startX, doc.y - (rows.length + 1) * rowH, totalW, (rows.length + 1) * rowH)
    .stroke()
    .restore();
}

/**
 * Ensure minimum vertical space on page, adding a new page if needed.
 */
export function ensureSpace(doc: Doc, minHeight: number): void {
  if (doc.y + minHeight > doc.page.height - MARGIN.bottom) {
    doc.addPage();
  }
}

/**
 * Get the content width between margins.
 */
export function contentWidth(doc: Doc): number {
  return doc.page.width - MARGIN.left - MARGIN.right;
}

// -----------------------------------------------------------------------------
// Formatting utilities
// -----------------------------------------------------------------------------

export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fmtDateTime(d: Date): string {
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Sanitize text for PDF output (prevent control characters from breaking layout).
 */
export function pdfSafe(text: string): string {
  return text.replace(/[\x00-\x1F\x7F]/g, '');
}
