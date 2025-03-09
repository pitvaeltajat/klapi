import prisma from "/utils/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== "ADMIN") {
    res.status(401).json({
      message: "Sinulla ei ole oikeutta tähän toimintoon",
    });
    return;
  }

  // edit the item in the database
  await prisma.item.update({
    where: {
      id: req.body.id,
    },
    data: {
      name: req.body.name,
      description: req.body.description,
      amount: req.body.amount,
      image: req.body.image ? req.body.image : undefined,
      categories: {
        connectOrCreate: req.body.categories.map((category) => ({
          create: { name: category.name },
          where: { id: category.id ? category.id : "" },
        })),
      },
    },
  });
  res.status(200).json({
    message: "Item edited",
  });
}
