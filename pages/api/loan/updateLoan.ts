import prisma from "../../../utils/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id, reservations, startTime, endTime, description } = req.body;

    const result = await prisma.loan.update({
      where: {
        id: id,
      },
      data: {
        reservations: {
          deleteMany: {},
          create: reservations,
        },
        startTime: startTime,
        endTime: endTime,
        description: description,
      },
    });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Unknown error" });
    }
    return;
  }
}
