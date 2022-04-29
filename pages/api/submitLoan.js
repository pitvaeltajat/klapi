import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default async(req, res) => {
    const {reservations, startTime, endTime, userName} = req.body
    try{
        const user_id = await prisma.user.findMany({
            where: {name: {contains: userName}},
            select: {id: true},
        })

        const userId = user_id[0]['id']

        const result = await prisma.Loan.create({
            data:{
                reservations: {create: reservations},
                startTime: startTime,
                endTime: endTime,
                user: {connect: {id: userId}}
            }
        })
        res.status(200).json(result)
    } catch (err){
        console.log(err)
        res.status(403).json({err: "An error occured while submitting a loan"})
    }
}