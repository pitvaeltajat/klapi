import { sendEmail } from './client';

async function sendApproveEmail(recipientEmail, id) {
    const html = `
    <h1>Varaushakemuksesi tunnuksella ${id} on hyväksytty.</h1>
    <p>
        Voit tarkastella hakemuksen tietoja osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${id}.<br />
        Muista noutaa varaus ilmoittamaasi aikaan.<br /><br />

        Varaukseen liittyvissä kysymyksissä voit ottaa yhteyttä kalustonhoitajaan:<br /><br />

        <b>Justus Jutila<br />
        <a href="mailto:justus.jutila@pitkajarvenvaeltajat.fi"> justus.jutila@pitkajarvenvaeltajat.fi </a><br />
        +358 44 9714003</b>
        <br /><br />

        Tämä on automaattinen viesti. Älä vastaa tähän viestiin.
    </p>
    `;

    const subject = `Varaushakemuksesi on hyväksytty`;
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
