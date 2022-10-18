import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const { StartDate, EndDate } = req.body;
    const items = await prisma.item.findMany({});
    const reservations = await prisma.reservation.findMany({
        include: {
            item: true,
            loan: true,
        },
    });

    var availabilities = {};
    items.map(async (item) => {
        const amount = item.amount;
        const itemReservations = reservations.filter((reservation) => {
            return reservation.item.id == item.id;
        });

        if (EndDate != null) {
            var min = amount;

            availabilities[item.id] = {};
            availabilities[item.id].byDate = {};

            const date1 = new Date(StartDate);
            const date2 = new Date(StartDate);
            const endDate = new Date(EndDate);

            date1.setHours(0, 0, 0, 0);
            date2.setHours(23, 59, 59, 999);
            endDate.setHours(23, 59, 59, 999);
            while (date1 <= endDate) {
                var sum = 0;
                var modReservations = itemReservations.filter((reservation) => {
                    reservation.loan.startTime = new Date(reservation.loan.startTime);
                    reservation.loan.endTime = new Date(reservation.loan.endTime);
                    return reservation.loan.startTime <= date2 && reservation.loan.endTime >= date1;
                });
                modReservations.map((reservation) => {
                    sum += reservation.amount;
                });
                availabilities[item.id].byDate[date1] = amount - sum;

                if (amount - sum < min) {
                    min = amount - sum;
                }

                date1.setDate(date1.getDate() + 1);
                date2.setDate(date2.getDate() + 1);
            }
            availabilities[item.id].available = min;
        } else {
            availabilities[item.id] = {};
            var sum = 0;
            var date = new Date(StartDate);
            var modReservations = itemReservations.filter((reservation) => {
                reservation.loan.startTime = new Date(reservation.loan.startTime);
                reservation.loan.endTime = new Date(reservation.loan.endTime);
                return reservation.loan.startTime <= date && reservation.loan.endTime >= date;
            });
            modReservations.map((reservation) => {
                sum += reservation.amount;
            });
            availabilities[item.id].available = amount - sum;
        }
    });

    res.status(200).json({ availabilities });
}
