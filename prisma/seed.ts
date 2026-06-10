import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  // ── 預設管理員 ──
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      displayName: "系統管理員",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
    },
  });

  // ── 科別（編號首字母）──
  const departments = [
    { code: "G", name: "一般外科" },
    { code: "O", name: "骨科" },
    { code: "N", name: "神經外科" },
    { code: "E", name: "眼科" },
  ];
  for (const d of departments) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
  }

  // ── 類別（編號次字母）──
  const categories = [
    { code: "A", name: "剪刀類" },
    { code: "B", name: "鑷子類" },
    { code: "C", name: "持針器" },
    { code: "D", name: "拉鉤類" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: c,
    });
  }

  // ── 範例器械 ──
  const instruments = [
    { code: "GA001", name: "梅氏彎剪 14cm", brand: "Aesculap", departmentCode: "G", categoryCode: "A", quantity: 12 },
    { code: "GA002", name: "梅氏直剪 16cm", brand: "Aesculap", departmentCode: "G", categoryCode: "A", quantity: 8 },
    { code: "GB001", name: "Adson 鑷子", brand: "B.Braun", departmentCode: "G", categoryCode: "B", quantity: 20 },
    { code: "GC001", name: "Mayo-Hegar 持針器", brand: "Aesculap", departmentCode: "G", categoryCode: "C", quantity: 6 },
    { code: "OD001", name: "Hohmann 拉鉤", brand: "Synthes", departmentCode: "O", categoryCode: "D", quantity: 2 },
  ];
  for (const i of instruments) {
    await prisma.instrument.upsert({
      where: { code: i.code },
      update: {},
      create: i,
    });
  }

  // ── 範例盤包 ──
  const existing = await prisma.pack.findUnique({ where: { code: "PKG-LAP" } });
  if (!existing) {
    await prisma.pack.create({
      data: {
        code: "PKG-LAP",
        name: "一般外科基本包",
        description: "一般外科常規手術基本器械包",
        items: {
          create: [
            { instrumentCode: "GA001", standardQty: 2 },
            { instrumentCode: "GB001", standardQty: 4 },
            { instrumentCode: "GC001", standardQty: 1 },
          ],
        },
      },
    });
  }

  console.log("✅ Seed 完成。預設登入帳號：admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
