// scripts/generate-pdf.js
// Luo PDF-tiedoston käyttöohjeista buildin yhteydessä md-to-pdf:llä
import path from 'path';
import fs from 'fs';
import { mdToPdf } from 'md-to-pdf';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mdPath = path.join(__dirname, '../KLAPI_Kayttoohjeet_lainaajalle.md');
const pdfPath = path.join(__dirname, '../public/KLAPI_Kayttoohjeet_lainaajalle.pdf');
const cssPath = path.join(__dirname, '../public/md-pdf-github.css');

if (!fs.existsSync(mdPath)) {
  console.error('Markdown-ohje puuttuu:', mdPath);
  process.exit(1);
}

mdToPdf(
  { path: mdPath },
  {
    dest: pdfPath,
    stylesheet: cssPath,
    document_title: 'KLAPI Käyttöohjeet',
    body_class: 'markdown-body',
    launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
  },
)
  .then(() => {
    console.log('PDF luotu:', pdfPath);
  })
  .catch((e) => {
    console.error('PDF:n luonti epäonnistui:', e);
    process.exit(1);
  });
