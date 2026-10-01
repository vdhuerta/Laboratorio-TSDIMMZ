import { PDF_MARGIN_MM, PDF_WIDTH_MM } from './pdfConst';
import type { BuiltReport } from './immzReport';

export function downloadHtml(html: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** PDF A4 con márgenes de 10 mm (190 mm útiles), como el PDF del Diario. */
export async function downloadPdf(r: BuiltReport) {
  const mod = await import('html2pdf.js');
  const html2pdf = (mod as unknown as { default: () => { set(o: Record<string, unknown>): { from(el: HTMLElement): { save(): Promise<void> } } } }).default;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PDF_WIDTH_MM}mm;background:#fff;`;
  host.innerHTML = `<style>${r.css}#pdf-root .wrap{padding:0;max-width:none}#pdf-root .sheet{border:none;box-shadow:none;padding:14px 10px 10px 16px}#pdf-root .tiles{grid-template-columns:repeat(5,1fr)}#pdf-root .phases{grid-template-columns:repeat(2,1fr)}#pdf-root .grid2{grid-template-columns:1fr 1fr}#pdf-root .kpis5{grid-template-columns:repeat(3,1fr)}#pdf-root .kpis3{grid-template-columns:repeat(3,1fr)}</style><div id="pdf-root">${r.bodyHtml}</div>`;
  document.body.appendChild(host);
  try {
    await html2pdf().set({ margin: PDF_MARGIN_MM, filename: r.fileName.replace(/\.html$/, '.pdf'), image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: ['.card', '.pc', '.phase'] } }).from(host.querySelector('#pdf-root') as HTMLElement).save();
  } finally { document.body.removeChild(host); }
}
