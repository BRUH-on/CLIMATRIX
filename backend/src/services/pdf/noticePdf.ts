/**
 * Pure renderer for the official Compliance Notice PDF (the "role-specific PDF
 * notices" feature from the ClimaCore plan). No Prisma / env dependencies.
 */
import { createHash } from 'node:crypto';
import {
  C, MARGIN, brandBar, contentWidth, createDoc, dashedRule, drawTable, ensureSpace,
  fmtDate, fmtDateTime, fmtNum, pdfSafe, renderToFile, sectionTitle, type Doc,
} from './pdfKit';

export interface NoticeBreach {
  pollutant: 'CO2' | 'NOX' | 'SOX';
  unit: 'kg';
  measured: number;
  warningLimit: number | null;
  violationLimit: number | null;
  status: 'WARNING' | 'VIOLATION';
}

export interface NoticePdfData {
  noticeNumber: string;
  industryId: string;
  emissionLogId: string;
  severity: 'WARNING' | 'CRITICAL';
  issuedAt: Date;
  dueBy: Date | null;
  periodStart: Date;
  periodEnd: Date;
  industry: {
    name: string;
    registrationNo: string;
    sector: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    contactEmail: string;
  };
  breaches: NoticeBreach[];
  summary: string;
  legalReference: string | null;
  issuedByName: string | null; // null => system generated
}

const POLLUTANT_LABEL: Record<NoticeBreach['pollutant'], string> = {
  CO2: 'CO2 (carbon dioxide)',
  NOX: 'NOx (nitrogen oxides)',
  SOX: 'SOx (sulphur oxides)',
};

/**
 * Short fingerprint over the facts printed in the notice. It lets a reader
 * confirm the PDF matches the record ClimaCore holds. It is an integrity aid,
 * NOT a digital signature.
 */
export function noticeFingerprint(d: NoticePdfData): string {
  const canonical = JSON.stringify([
    d.noticeNumber, d.industryId, d.emissionLogId, d.severity,
    d.periodStart.toISOString(), d.periodEnd.toISOString(),
    d.breaches.map((b) => [b.pollutant, b.measured, b.warningLimit, b.violationLimit, b.status]),
  ]);
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16).toUpperCase();
}

export function renderNoticePdf(data: NoticePdfData, filepath: string): Promise<number> {
  const title = `Compliance Notice ${data.noticeNumber}`;
  const doc = createDoc(title, 'Environmental compliance notice');
  const footer = `CLIMACORE  |  ${data.noticeNumber}  |  System-generated compliance notice`;
  return renderToFile(doc, filepath, footer, (d) => {
    header(d, data);
    addressee(d, data);
    findings(d, data);
    actions(d, data);
    issuer(d, data);
  });
}

function header(doc: Doc, data: NoticePdfData): void {
  brandBar(doc);
  const critical = data.severity === 'CRITICAL';
  const accent = critical ? C.red : C.amber;

  doc.x = MARGIN.left;
  doc.y = MARGIN.top - 10;
  const top = doc.y;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.ink).text('CLIMACORE', MARGIN.left, top);
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    .text('ENVIRONMENTAL COMPLIANCE NOTICE', MARGIN.left, doc.y);

  // Notice number + severity box (right aligned)
  const boxW = 190;
  const boxX = doc.page.width - MARGIN.right - boxW;
  doc.save().rect(boxX, top, boxW, 52).lineWidth(1.5).strokeColor(accent).stroke().restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(accent)
    .text(critical ? 'CRITICAL - VIOLATION' : 'WARNING', boxX + 8, top + 6, {
      width: boxW - 16, lineBreak: false,
    });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink)
    .text(data.noticeNumber, boxX + 8, top + 20, { width: boxW - 16, lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    .text(`Issued: ${fmtDate(data.issuedAt)}`, boxX + 8, top + 38, {
      width: boxW - 16, lineBreak: false,
    });

  doc.x = MARGIN.left;
  doc.y = top + 62;
  dashedRule(doc, doc.y, 1.2);
  doc.y += 14;
}

function addressee(doc: Doc, data: NoticePdfData): void {
  const i = data.industry;
  doc.x = MARGIN.left;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text('TO', { characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink).text(pdfSafe(i.name));
  doc.font('Helvetica').fontSize(9).fillColor(C.ink);
  doc.text(`Registration No.: ${pdfSafe(i.registrationNo)}   |   Sector: ${pdfSafe(i.sector)}`);
  const addr = [i.addressLine1, i.addressLine2, `${i.city}, ${i.state} ${i.postalCode}`]
    .filter((x): x is string => Boolean(x)).join(', ');
  doc.text(pdfSafe(addr), { width: contentWidth(doc) });
  doc.text(`Contact: ${pdfSafe(i.contactEmail)}`);
  doc.moveDown(0.9);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text('SUBJECT', { characterSpacing: 1.5 });
  const kind = data.severity === 'CRITICAL' ? 'Notice of violation' : 'Warning notice';
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink).text(
    `${kind}: emission limits exceeded for ${fmtDate(data.periodStart)} to ${fmtDate(data.periodEnd)}`,
    { width: contentWidth(doc) },
  );
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(10).fillColor(C.ink).text(pdfSafe(data.summary), {
    width: contentWidth(doc), align: 'justify',
  });
  doc.moveDown(0.9);
}

function findings(doc: Doc, data: NoticePdfData): void {
  sectionTitle(doc, 'FINDINGS');
  const lim = (v: number | null) => (v === null ? 'n/a' : `${fmtNum(v)} kg`);
  drawTable(
    doc,
    [
      { header: 'Pollutant', width: 140 },
      { header: 'Measured', width: 90, align: 'right' },
      { header: 'Warning limit', width: 95, align: 'right' },
      { header: 'Violation limit', width: 100, align: 'right' },
      { header: 'Status', width: 75 },
    ],
    data.breaches.map((b) => [
      POLLUTANT_LABEL[b.pollutant], `${fmtNum(b.measured)} kg`,
      lim(b.warningLimit), lim(b.violationLimit), b.status,
    ]),
  );
  doc.moveDown(0.5);
  if (data.legalReference) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.muted)
      .text('Legal reference:  ', { continued: true });
    doc.font('Helvetica').fillColor(C.ink).text(pdfSafe(data.legalReference));
  }
  doc.moveDown(0.8);
}

function actions(doc: Doc, data: NoticePdfData): void {
  ensureSpace(doc, 150);
  sectionTitle(doc, 'REQUIRED ACTION');
  const critical = data.severity === 'CRITICAL';
  const steps = critical
    ? [
        'Begin corrective measures immediately to bring emissions below the violation limits.',
        'Submit a written root-cause analysis and corrective action plan to the issuing authority.',
        'Provide supporting evidence (fuel records, control-equipment logs, calibration certificates).',
        'Continued non-compliance may be escalated for regulatory enforcement action.',
      ]
    : [
        'Review the process and emission-control equipment that contributed to the exceedance.',
        'Submit a written corrective action plan to the issuing authority.',
        'Keep emissions below the warning limits in subsequent reporting periods.',
      ];
  doc.font('Helvetica').fontSize(10).fillColor(C.ink);
  steps.forEach((s, idx) => {
    doc.x = MARGIN.left;
    doc.text(`${idx + 1}.  ${s}`, { width: contentWidth(doc), indent: 0 });
    doc.moveDown(0.25);
  });
  doc.moveDown(0.4);
  if (data.dueBy) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(critical ? C.red : C.amber)
      .text(`Response due by: ${fmtDate(data.dueBy)}`);
  }
  doc.moveDown(1);
}

function issuer(doc: Doc, data: NoticePdfData): void {
  ensureSpace(doc, 110);
  doc.x = MARGIN.left;
  dashedRule(doc, doc.y);
  doc.y += 10;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text('ISSUED BY', { characterSpacing: 1.5 });
  doc.font('Helvetica').fontSize(10).fillColor(C.ink).text(
    data.issuedByName ? pdfSafe(data.issuedByName) : 'ClimaCore Automated Compliance System',
  );
  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(`Issued on ${fmtDateTime(data.issuedAt)}`);
  doc.moveDown(1.6);

  const y = doc.y;
  doc.save().strokeColor(C.ink).lineWidth(0.7)
    .moveTo(MARGIN.left, y).lineTo(MARGIN.left + 180, y).stroke().restore();
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    .text('Authorised signatory', MARGIN.left, y + 3, { lineBreak: false });

  doc.font('Helvetica').fontSize(7.5).fillColor(C.muted).text(
    `Document fingerprint: ${noticeFingerprint(data)}  (integrity check only; not a digital signature)`,
    MARGIN.left, y + 26, { width: contentWidth(doc), lineBreak: false },
  );
}