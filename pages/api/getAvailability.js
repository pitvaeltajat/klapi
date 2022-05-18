import prisma from "/utils/prisma";

export default async function handler(req, res){
    const item = req.body

    const dates = useSelector((state) => state.dates);

    if (item.reservations != undefined) {
        const effectiveReservations = item.reservations.filter(
            (reservation) =>
                !(
                    reservation.loan.startTime > dates.endDate ||
                    reservation.loan.endTime < dates.startDate
                )
        );
        var reservedAmount = 0;
        effectiveReservations.map(
            (reservation) => (reservedAmount += reservation.amount)
        );
    }
    const availableAmount = item.amount - reservedAmount
    results = {availableAmount}

    res.json(results)
}