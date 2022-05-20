import prisma from "/utils/prisma";
import { useSelector, useDispatch } from "react-redux";

export default async function handler(req, res) {

    const {startDate, endDate, item} = req.body

    try{
        function getReservedAmount(item){

            if (item.reservations != undefined) {
                const effectiveReservations = item.reservations.filter(
                    (reservation) =>
                        !(
                            reservation.loan.startTime > endDate ||
                            reservation.loan.endTime < startDate
                        )
                );
                var reservedAmount = 0;
                effectiveReservations.map(
                    (reservation) => (reservedAmount += reservation.amount)
                );
            }
            return(reservedAmount)
        }

        const availabilities = {
            name: item.name,
            id: item.id,
            reservedAmount: getReservedAmount(item),
            availableAmount: item.amount - getReservedAmount(item),
            
        }
          
        res.status(200).json(availabilities)
    } catch(err){
        console.log(err)
        res.json({
            err: err.message
        })
    }
}