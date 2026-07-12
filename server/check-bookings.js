const prisma = require('./src/config/prisma');

async function main() {
  const assets = await prisma.asset.findMany();
  console.log('Assets in database:', assets.map(a => ({ id: a.id, name: a.name, tag: a.assetTag })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
