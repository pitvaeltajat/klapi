import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const filePath = path.join(process.cwd(), 'public', 'KLAPI_Kayttoohjeet_lainaajalle.pdf');
  if (!fs.existsSync(filePath)) {
    res.status(404).send('PDF not found');
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="KLAPI_Kayttoohjeet_lainaajalle.pdf"');
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}
