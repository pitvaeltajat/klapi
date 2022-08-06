import { sendEmail } from './client';

async function sendApproveEmail(recipientEmail, id) {
    const html = `
    <h1>Uusi varaus ${id} luotu</h1>
    <p>
      Varaushakemuksesi on luotu. 
      
      Voit tarkastella hakemuksen tietoja osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${id}
      
      Saat sähköpostitse tiedon, kun hakemus on käsitelty.
    </p>
    `;

    const subject = `Laina hyväksytty ${id}`;
    await sendEmail(recipientEmail, subject, html);
}

export default async function handler(req, res) {
    const { email, id } = req.body;
    try {
        await sendApproveEmail(email, id);
        res.status(200).json({ message: 'Email sent' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
