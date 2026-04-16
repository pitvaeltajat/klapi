import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface CategoryInput {
  value: string;
  label: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  const body = await request.json();

  // destruct location and categories from the body to be used in connect queries
  const { ['locationId']: locationObject, ['categories']: categoriesList, ...rest } = body;
  // create new array with connectorcreate query for each category
  const categoryJSON = categoriesList?.map((categoryObject: CategoryInput) => ({
    where: {
      id: categoryObject.value,
    },
    create: {
      name: categoryObject.value,
    },
  }));
  const item = await prisma.item.create({
    data: {
      ...rest,
      // ensure type defaults to 'normal' when not provided by the client
      type: rest.type ?? 'normal',
      location: locationObject && {
        connectOrCreate: {
          where: {
            id: locationObject.value,
          },
          create: {
            name: locationObject.value,
          },
        },
      },
      // for each category, check if it exists and connect, if not, create it
      categories: { connectOrCreate: categoryJSON },
    },
  });
  return NextResponse.json(item);
}
