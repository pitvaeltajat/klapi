// scripts/generate-pdf.js
// Luo PDF-tiedoston käyttöohjeista buildin yhteydessä md-to-pdf:llä
import path from 'path';
import fs from 'fs';
import { mdToPdf } from 'md-to-pdf';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, '../public/md-pdf-github.css');

const guides = [
  {
    md: path.join(__dirname, '../KLAPI_Kayttoohjeet_lainaajalle.md'),
    pdf: path.join(__dirname, '../public/KLAPI_Kayttoohjeet_lainaajalle.pdf'),
    title: 'KLAPI Käyttöohjeet (Lainaajalle)',
  },
  {
    md: path.join(__dirname, '../KLAPI_Kayttoohjeet_adminille.md'),
    pdf: path.join(__dirname, '../public/KLAPI_Kayttoohjeet_adminille.pdf'),
    title: 'KLAPI Käyttöohjeet (Adminille)',
  },
];

async function generateAll() {
  for (const guide of guides) {
    if (!fs.existsSync(guide.md)) {
      console.error('Markdown-ohje puuttuu:', guide.md);
      process.exit(1);
    }
    try {
      await mdToPdf(
        { path: guide.md },
        {
          dest: guide.pdf,
          stylesheet: cssPath,
          document_title: guide.title,
          body_class: 'markdown-body',
          launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
        },
      );
      console.log('PDF luotu:', guide.pdf);
    } catch (e) {
      console.error('PDF:n luonti epäonnistui:', e);
      process.exit(1);
    }
  }
}

generateAll();
