# Laboratorio TSD (Puente del Castillo) · conectado al IMMZ del Diario de Campo

App `laboratorio_tsd`, **Clase 9** del Diario. React 18 + TS + Tailwind 3 + Vite.

- `npm install && npm run dev` · `npm run build` · `npm run build:single` (un solo HTML).
- Reporte: `Reporte_LabTSD_<Nombre>_<ID>.html` (esquema 4.0, ver CONTRATO-IMMZ.md). Trazas crudas en el segundo bloque JSON.
- Indicadores IM1–IM10 calculados desde la traza (`src/lib/metrics.ts`, umbrales ajustables arriba del archivo). Sin evidencia = null.
- Pruebas: `node scripts/e2e.mjs` (con `npm run preview` activo), `npx tsx scripts/selfcheck.ts <reporte.html>`, y `DIARIO_SRC=/ruta/diario/src npx tsx scripts/verify-immz.ts <reporte.html>` contra el código real del Diario.
- PIN de administrador: ver `src/config.ts`.
