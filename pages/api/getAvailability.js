import prisma from "/utils/prisma";
import { useSelector, useDispatch } from "react-redux";
import React from "react"

export default async function handler(req, res) {
       
    try{
        const items = await prisma.item.findMany({
            include: {
                categories: true,
                reservations: { include: { loan: true } },
            }
        });

        function getReservedAmount(item){

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
            return(reservedAmount)
        }

        
        const availabilities = items.map((item) => ({
            name: item.name,
            id: item.id,
            reservedAmount: getReservedAmount(item),
            availableAmount: item.amount - getReservedAmount(item),
            
        }))
        
        res.status(200).json(availabilities)
    } catch(err){
        console.log(err)
        res.json({
            err: err.message
        })
    }
}