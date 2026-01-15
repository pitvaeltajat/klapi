import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import 'dotenv/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const session = await getServerSession(req, res, authOptions);
        if (!session?.user?.id) {
            res.status(401).json({ message: 'Ei kirjautunut' });
            return;
        }

        const { reservations, startTime, endTime, userId, description, loaner } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, group: true },
        });
        if (!user) {
            res.status(404).json({ message: 'Käyttäjää ei löytynyt' });
            return;
        }

        // If made by kiosk, set status to INUSE immediately. The loan starts from the moment it is made.
        // Check the session user's group (who is creating the loan), not the target user's group
        const status = session.user.group === 'KIOSK' ? 'INUSE' : 'ACCEPTED';

        // Ensure referenced items exist; for custom items (client-generated ids)
        // create temporary Item records and replace itemId accordingly.
        const processedReservations: { itemId: string; amount: number }[] = [];
        for (const r of reservations) {
            let itemId = r.itemId as string;
            const existing = await prisma.item.findUnique({ where: { id: itemId } });
            if (!existing) {
                // If client provided a name for the custom item, create it as temporary.
                if (!r.name) {
                    res.status(400).json({ message: `Missing name for custom item ${itemId}` });
                    return;
                }
                const created = await prisma.item.create({
                    data: {
                        name: r.name,
                        description: 'Automaattisesti luotu väliaikainen item',
                        amount: r.amount ?? 1,
                        type: 'temporary',
                    },
                });
                itemId = created.id;
            }
            processedReservations.push({ itemId, amount: r.amount });
        }

        const createReservations = processedReservations.map((r) => ({
            amount: r.amount,
            item: { connect: { id: r.itemId } },
        }));

        const result = await prisma.loan.create({
            data: {
                reservations: { create: createReservations },
                startTime: startTime,
                endTime: endTime,
                user: { connect: { id: userId } },
                description,
                loaner,
                status,
            },
        });

        // Only send emails for non-kiosk loans (ACCEPTED status)
        // Kiosk loans (INUSE) are immediate and don't need approval notifications
        if (status === 'ACCEPTED') {
            const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith('http')
                ? process.env.NEXT_PUBLIC_VERCEL_URL
                : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;

            try {
                await fetch(`${baseUrl}/api/email/sendNewLoanToUser`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: result.id,
                        email: user.email,
                    }),
                });
            } catch (error) {
                console.error('Failed to send user email:', error);
                // Continue execution even if email fails
            }

            try {
                await fetch(`${baseUrl}/api/email/sendNewLoanToAdmin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: result.id,
                        loanCreator: user.name,
                    }),
                });
            } catch (error) {
                console.error('Failed to send admin email:', error);
                // Continue execution even if email fails
            }
        }

        res.status(200).json(result);
    } catch (err) {
        if (err instanceof Error) {
            res.status(500).json({ message: err.message });
        } else {
            res.status(500).json({ message: 'Unknown error' });
        }
        return;
    }
}
