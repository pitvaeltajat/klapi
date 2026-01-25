const items = [
  { name: 'Avotulimajoite', amount: 14, categories: ['Majoitteet'] },
  { name: 'Bensakanisteri', amount: 2, categories: ['Nesteensäilytysvarusteet'] },
  { name: 'Dremel', amount: 1, categories: ['Työkalut'] },
  { name: 'Eristevaahtomuovi 1m', amount: 60, categories: [] },
  { name: 'Hilleberg Nallo 3gt', amount: 1, categories: ['Majoitteet'] },
  { name: 'Hilleberg Nallo 4gt', amount: 1, categories: ['Majoitteet'] },
  { name: 'Husse', amount: 1, categories: ['Työkalut'] },
  { name: 'Japaninsaha', amount: 1, categories: ['Työkalut'] },
  { name: 'Jatkojohto Pieni valkoinen', amount: 2, categories: [] },
  { name: 'Jatkojohtoja (iso)', amount: 4, categories: [] },
  { name: 'Jatkokela', amount: 1, categories: [] },
  { name: 'Juomakanisteri', amount: 7, categories: ['Nesteensäilytysvarusteet'] },
  { name: 'Järeä kyltti', amount: 1, categories: ['Edustusvälineet'] },
  { name: 'Kaarisaha', amount: 8, categories: ['Työkalut'] },
  { name: 'Kahvinkeitin ideale', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Kalusto pj', amount: 1, categories: ['Majoitteet'] },
  { name: 'Kalusto pj:n salkosarja', amount: 1, categories: ['Majoitetarvikkeet'] },
  { name: 'Kamina Hawu', amount: 1, categories: ['Majoitetarvikkeet'] },
  { name: 'Kamina iso pyöreä', amount: 1, categories: ['Majoitetarvikkeet'] },
  { name: 'Kamina neliö', amount: 1, categories: ['Majoitetarvikkeet'] },
  { name: 'Kamina pieni pyöreä', amount: 1, categories: ['Majoitetarvikkeet'] },
  { name: 'Kattila iso', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Kattila keskikokoinen', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Kattila normaali', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Kattila tosi iso', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Kattila valtava', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Katuharja', amount: 1, categories: ['Työkalut'] },
  { name: 'Kiilabox', amount: 1, categories: ['Majoitetarvikkeet'] },
  { name: 'Kiintoavainsarja', amount: 1, categories: ['Työkalut'] },
  { name: 'Kiipeilyköysi', amount: 4, categories: ['Kiipeilyvarusteet'] },
  { name: 'Kiipeilyvaljaat', amount: 5, categories: ['Kiipeilyvarusteet'] },
  { name: 'Kirves', amount: 12, categories: ['Työkalut'] },
  { name: 'Kuulosuojaimet', amount: 8, categories: [] },
  { name: 'Kuumailmapuhallin', amount: 1, categories: ['Työkalut'] },
  { name: 'Kympin salkosarja', amount: 1, categories: ['Majoitetarvikkeet'] },
  { name: 'Kymppi', amount: 1, categories: ['Majoitteet'] },
  { name: 'Kärkisarja', amount: 1, categories: ['Työkalut'] },
  { name: 'Käsisaha', amount: 10, categories: ['Työkalut'] },
  { name: 'Köysiä ja naruja', amount: 666, categories: [] },
  { name: 'Laavun kepit', amount: 2, categories: ['Majoitetarvikkeet'] },
  { name: 'Lapio', amount: 10, categories: ['Työkalut'] },
  { name: 'Laskeutumisvaljaat', amount: 2, categories: ['Kiipeilyvarusteet'] },
  { name: 'Leimaisin', amount: 13, categories: ['Suunnistustarvikkeet'] },
  { name: 'Leka', amount: 2, categories: ['Työkalut'] },
  { name: 'Leka pieni', amount: 1, categories: ['Työkalut'] },
  { name: 'Lumilapio', amount: 2, categories: ['Työkalut'] },
  { name: 'Mankka', amount: 1, categories: [] },
  { name: 'Marssitanko', amount: 1, categories: ['Edustusvälineet'] },
  { name: 'Metsurikypärä', amount: 2, categories: [] },
  { name: 'Metsäsuksien varasiteet (pari)', amount: 1, categories: ['Vaellusvarusteet'] },
  { name: 'Mitta', amount: 5, categories: ['Työkalut'] },
  { name: 'Myrskylyhty', amount: 5, categories: ['Valaisimet'] },
  { name: 'Naiger keppi', amount: 666, categories: ['Majoitetarvikkeet'] },
  { name: 'Naiger maavaate', amount: 4, categories: ['Majoitetarvikkeet'] },
  { name: 'Naiger teltta', amount: 8, categories: ['Majoitteet'] },
  { name: 'Naulalaatikko', amount: 1, categories: ['Kiinnikkeet'] },
  { name: 'Nokipannu', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Nuotiopannu', amount: 20, categories: ['Ruuanlaittovälineet'] },
  { name: 'Nuuskateltta', amount: 1, categories: ['Majoitteet'] },
  { name: 'Onki', amount: 1, categories: [] },
  { name: 'Partio Scout banneri', amount: 1, categories: ['Edustusvälineet'] },
  { name: 'Pelastusliivit', amount: 4, categories: [] },
  { name: 'Pelipaidat', amount: 25, categories: [] },
  { name: 'Piippurassi', amount: 1, categories: ['Työkalut'] },
  { name: 'Pistosaha', amount: 3, categories: ['Työkalut'] },
  { name: 'Pitva banneri iso', amount: 1, categories: ['Edustusvälineet'] },
  { name: 'Pitva banneri jalalla', amount: 1, categories: ['Edustusvälineet'] },
  { name: 'Pitva kyltti', amount: 2, categories: ['Edustusvälineet'] },
  { name: 'Pitva lippu', amount: 1, categories: ['Edustusvälineet'] },
  { name: 'Pj', amount: 4, categories: ['Majoitteet'] },
  { name: 'Pj salkosarja', amount: 4, categories: ['Majoitetarvikkeet'] },
  { name: 'Pj:n maavaate', amount: 2, categories: ['Majoitetarvikkeet'] },
  { name: 'Pocket rocket', amount: 2, categories: ['Keittimet'] },
  { name: 'Porakone Bosch', amount: 1, categories: ['Työkalut'] },
  { name: 'Porakone Makita', amount: 1, categories: ['Työkalut'] },
  { name: 'Primus', amount: 1, categories: ['Keittimet'] },
  { name: 'Pukkiasuja', amount: 5, categories: [] },
  { name: 'Pumppu', amount: 2, categories: ['Työkalut'] },
  { name: 'Radiopuhelimet', amount: 1, categories: [] },
  { name: 'Rastilippu', amount: 46, categories: ['Suunnistustarvikkeet'] },
  { name: 'Rautakanki', amount: 4, categories: ['Työkalut'] },
  { name: 'Rautasaha', amount: 4, categories: ['Työkalut'] },
  { name: 'Rengaspoltin', amount: 3, categories: ['Keittimet', 'Ruuanlaittovälineet'] },
  { name: 'Retkisaha', amount: 4, categories: ['Työkalut'] },
  { name: 'Retkituoli halpa', amount: 15, categories: ['Huonekalut'] },
  { name: 'Retkituoli laatu', amount: 2, categories: ['Huonekalut'] },
  { name: 'Ruuvilaatikko', amount: 1, categories: ['Kiinnikkeet'] },
  { name: 'Siivilä', amount: 1, categories: ['Ruuanlaittovälineet'] },
  { name: 'Silja Line lippu', amount: 1, categories: ['Edustusvälineet'] },
  { name: 'Sirkkeli', amount: 1, categories: ['Työkalut'] },
  { name: 'Sorkkarauta', amount: 3, categories: ['Työkalut'] },
  { name: 'Suomen lippu', amount: 2, categories: ['Edustusvälineet'] },
  { name: 'Tavaraverkko', amount: 2, categories: [] },
  { name: 'Termospullo', amount: 1, categories: ['Nesteensäilytysvarusteet'] },
  { name: 'Teroituskivi', amount: 5, categories: ['Työkalut'] },
  { name: 'Teroituskone', amount: 1, categories: ['Työkalut'] },
  { name: 'Tikkataulu', amount: 3, categories: [] },
  { name: 'Tiskivati', amount: 8, categories: ['Nesteensäilytysvarusteet'] },
  { name: 'Tolppakengät', amount: 1, categories: ['Kiipeilyvarusteet'] },
  { name: 'Trangia', amount: 7, categories: ['Keittimet'] },
  { name: 'Trangian multidisc', amount: 4, categories: ['Keitintarvikkeet'] },
  { name: 'Turvasaappaat', amount: 1, categories: [] },
  { name: 'Työkalubox harmaa', amount: 1, categories: ['Työkalut'] },
  { name: 'Työkalubox musta salkku', amount: 1, categories: ['Työkalut'] },
  { name: 'Työkalubox sinininen', amount: 1, categories: ['Työkalut'] },
  { name: 'Töhö', amount: 1, categories: ['Keittimet'] },
  { name: 'Töhöjakkara', amount: 1, categories: ['Keitintarvikkeet'] },
  { name: 'Valaisin', amount: 6, categories: ['Valaisimet'] },
  { name: 'Vasara', amount: 666, categories: ['Työkalut'] },
  { name: 'Viiltosuojahousut', amount: 1, categories: [] },
  { name: 'Vintilä', amount: 5, categories: ['Työkalut'] },
  { name: 'Ämpäri', amount: 15, categories: ['Nesteensäilytysvarusteet'] },
];

// Sample user data
const sampleUsers = [
  { username: 'matti.virtanen', name: 'Matti Virtanen', email: 'matti.virtanen@example.com' },
  { username: 'liisa.korhonen', name: 'Liisa Korhonen', email: 'liisa.korhonen@example.com' },
  { username: 'juhani.nieminen', name: 'Juhani Nieminen', email: 'juhani.nieminen@example.com' },
  { username: 'anna.koskinen', name: 'Anna Koskinen', email: 'anna.koskinen@example.com' },
  { username: 'mikko.lahti', name: 'Mikko Lahti', email: 'mikko.lahti@example.com' },
  { username: 'laura.maki', name: 'Laura Mäki', email: 'laura.maki@example.com' },
  { username: 'pekka.salo', name: 'Pekka Salo', email: 'pekka.salo@example.com' },
  { username: 'maria.laine', name: 'Maria Laine', email: 'maria.laine@example.com' },
];

const newCategories = [
  'Majoitteet',
  'Nesteensäilytysvarusteet',
  'Työkalut',
  'Edustusvälineet',
  'Ruuanlaittovälineet',
  'Majoitetarvikkeet',
  'Kiipeilyvarusteet',
  'Kiipeilyvälineet',
  'Suunnistustarvikkeet',
  'Vaellusvarusteet',
  'Valaisimet',
  'Kiinnikkeet',
  'Keittimet',
  'Huonekalut',
  'Keitintarvikkeet',
];

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({});

// Helper function to get random date within a range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get random items from array
function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  console.log(`Start seeding ...`);

  // Clean up existing data (in order to respect foreign key constraints)
  console.log('Cleaning up existing data...');
  await prisma.reservation.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.box.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Cleanup complete.');

  // Create kiosk user
  const hashedPassword = await bcrypt.hash('pitva', 10);
  const kioskUser = await prisma.user.create({
    data: {
      username: 'pitva',
      password: hashedPassword,
      name: 'Kiosk User',
      group: 'KIOSK',
    },
  });
  console.log(`Created kiosk user with username ${kioskUser.username} and id: ${kioskUser.id}`);

  // Create sample users
  const createdUsers = [];
  for (const user of sampleUsers) {
    const userHashedPassword = await bcrypt.hash('password123', 10);
    const newUser = await prisma.user.create({
      data: {
        username: user.username,
        password: userHashedPassword,
        name: user.name,
        email: user.email,
        group: 'USER',
        emailWeeklyReminder: Math.random() > 0.5,
        emailNewLoanNotification: Math.random() > 0.3,
      },
    });
    createdUsers.push(newUser);
    console.log(`Created user with username ${newUser.username} and id: ${newUser.id}`);
  }

  // Create an admin user
  const adminHashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: adminHashedPassword,
      name: 'Admin User',
      email: 'admin@example.com',
      group: 'ADMIN',
    },
  });
  console.log(`Created admin user with username ${adminUser.username} and id: ${adminUser.id}`);

  // Create categories and store them in a map
  const categoryMap = new Map<string, string>();
  for (const category of newCategories) {
    const newCategory = await prisma.category.create({
      data: {
        name: category,
      },
    });
    categoryMap.set(category, newCategory.id);
    console.log(`Created category with name ${newCategory.name} and id: ${newCategory.id}`);
  }

  // Create a default location for all items
  const defaultLocation = await prisma.location.create({
    data: {
      name: 'Varasto',
      description: 'Oletuslokaalitila',
    },
  });
  console.log(`Created location with name ${defaultLocation.name} and id: ${defaultLocation.id}`);

  // Create additional locations
  const outdoorStorage = await prisma.location.create({
    data: {
      name: 'Ulkovarasto',
      description: 'Ulkona sijaitseva varasto',
    },
  });
  console.log(`Created location with name ${outdoorStorage.name} and id: ${outdoorStorage.id}`);

  // Create all items with their categories
  const createdItems = [];
  for (const item of items) {
    const categoryIds = item.categories
      .map((cat) => categoryMap.get(cat))
      .filter((id): id is string => id !== undefined);

    const newItem = await prisma.item.create({
      data: {
        name: item.name,
        amount: item.amount,
        locationId: Math.random() > 0.8 ? outdoorStorage.id : defaultLocation.id,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
      },
    });
    createdItems.push(newItem);
    console.log(
      `Created item with name ${newItem.name}, amount: ${newItem.amount}, categories: ${item.categories.length}`,
    );
  }

  // Create some boxes
  const boxes = [];
  for (let i = 1; i <= 5; i++) {
    const box = await prisma.box.create({
      data: {
        name: `Laatikko ${i}`,
        description: `Lainauslaatikko numero ${i}`,
      },
    });
    boxes.push(box);
    console.log(`Created box with name ${box.name} and id: ${box.id}`);
  }

  // Create realistic loans with different statuses
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const loanStatuses: Array<{
    status: 'ACCEPTED' | 'REJECTED' | 'INUSE' | 'IN_BOX' | 'RETURNED';
    probability: number;
  }> = [
    { status: 'RETURNED', probability: 0.4 },
    { status: 'INUSE', probability: 0.3 },
    { status: 'IN_BOX', probability: 0.15 },
    { status: 'ACCEPTED', probability: 0.1 },
    { status: 'REJECTED', probability: 0.05 },
  ];

  const descriptions = [
    'Viikonlopun retki',
    'Kesäleirin varusteet',
    'Partiotapahtuma',
    'Korjaustyöt',
    'Talviretki',
    'Ryhmän toiminta',
    'Sisustustyöt',
    'Järjestöviikonloppu',
    'Koulutuspäivä',
    'Vaellusretki',
    null,
    null, // Some loans have no description
  ];

  const loanerNames = [
    'Matti Virtanen',
    'Liisa Korhonen',
    'Partiolippukunta Pitva',
    'Juhani Nieminen',
    'Sudenpentulauma',
    null,
    null, // Some loans have no loaner specified
  ];

  // Create 20-30 loans
  const loanCount = 20 + Math.floor(Math.random() * 11);
  for (let i = 0; i < loanCount; i++) {
    // Pick random status based on probability
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    let selectedStatus: 'ACCEPTED' | 'REJECTED' | 'INUSE' | 'IN_BOX' | 'RETURNED' = 'ACCEPTED';

    for (const { status, probability } of loanStatuses) {
      cumulativeProbability += probability;
      if (randomValue <= cumulativeProbability) {
        selectedStatus = status;
        break;
      }
    }

    // Determine dates based on status
    let startTime: Date;
    let endTime: Date;

    if (selectedStatus === 'RETURNED') {
      startTime = randomDate(threeMonthsAgo, oneWeekAgo);
      endTime = randomDate(startTime, now);
    } else if (selectedStatus === 'INUSE') {
      startTime = randomDate(oneMonthAgo, now);
      endTime = randomDate(now, twoWeeksLater);
    } else if (selectedStatus === 'IN_BOX') {
      startTime = randomDate(oneWeekAgo, now);
      endTime = randomDate(now, oneWeekLater);
    } else if (selectedStatus === 'ACCEPTED') {
      startTime = randomDate(tomorrow, oneWeekLater);
      endTime = randomDate(startTime, oneMonthLater);
    } else {
      // REJECTED
      startTime = randomDate(oneMonthAgo, now);
      endTime = randomDate(startTime, oneMonthLater);
    }

    // Pick random user
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];

    // Pick random items for reservation (1-5 items)
    const reservationCount = 1 + Math.floor(Math.random() * 5);
    const selectedItems = randomItems(createdItems, reservationCount);

    // Create loan with reservations
    const loan = await prisma.loan.create({
      data: {
        status: selectedStatus,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        startTime,
        endTime,
        userId: user.id,
        loaner: loanerNames[Math.floor(Math.random() * loanerNames.length)],
        boxId:
          selectedStatus === 'IN_BOX' ? boxes[Math.floor(Math.random() * boxes.length)].id : null,
        reservations: {
          create: selectedItems.map((item) => ({
            itemId: item.id,
            amount: Math.min(Math.ceil(Math.random() * 3), item.amount),
            status: selectedStatus,
          })),
        },
      },
      include: {
        reservations: true,
      },
    });

    console.log(
      `Created loan ${i + 1}/${loanCount}: status=${loan.status}, items=${loan.reservations.length}, user=${user.name}`,
    );
  }

  console.log(`Seeding finished successfully!`);
  console.log(`Summary:`);
  console.log(
    `- Users: ${createdUsers.length + 2} (${createdUsers.length} regular + 1 admin + 1 kiosk)`,
  );
  console.log(`- Categories: ${newCategories.length}`);
  console.log(`- Items: ${createdItems.length}`);
  console.log(`- Locations: 2`);
  console.log(`- Boxes: ${boxes.length}`);
  console.log(`- Loans: ${loanCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
