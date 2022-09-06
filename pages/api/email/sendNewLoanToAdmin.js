import { sendEmail } from './client';
import prisma from '/utils/prisma';;

require('dotenv').config();

async function sendNewLoanEmail(loanCreator, id) {


    const adminUsers = await prisma.user.findMany({
        where: { group: 'ADMIN' },
    });
    
    const adminEmails = adminUsers.map((user) => user.email);
    
    const html = `
    <h1>Uusi varaushakemus vastaanotettu.</h1>
    <p>
      Varaushakemus on vastaanotettu ja odottaa hyväksyntää.<br />
      Voit tarkastella hakemuksen tietoja ja hyväksyä hakemuksen osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${id}.
    </p>
    `;

    const subject = `Uusi varaushakemus henkilöltä ${loanCreator}`;
    await sendEmail(adminEmails, subject, html);
}

export default async function handler(req, res) {
    const { loanCreator, id } = req.body;
    try {
        await sendNewLoanEmail(loanCreator, id);
        res.status(200).json({ message: 'Email sent' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


