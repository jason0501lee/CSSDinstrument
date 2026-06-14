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
    { code: "GA001", name: "梅氏彎剪 14cm", englishName: "Metzenbaum Scissors Curved", brand: "Aesculap", model: "BC234R", origin: "德國", departmentCode: "G", categoryCode: "A", quantity: 12 },
    { code: "GA002", name: "梅氏直剪 16cm", englishName: "Metzenbaum Scissors Straight", brand: "Aesculap", model: "BC236R", origin: "德國", departmentCode: "G", categoryCode: "A", quantity: 8 },
    { code: "GB001", name: "Adson 鑷子", englishName: "Adson Tissue Forceps", brand: "B.Braun", model: "BD512R", origin: "德國", departmentCode: "G", categoryCode: "B", quantity: 20 },
    { code: "GC001", name: "Mayo-Hegar 持針器", englishName: "Mayo-Hegar Needle Holder", brand: "Aesculap", model: "BM024R", origin: "德國", departmentCode: "G", categoryCode: "C", quantity: 6 },
    { code: "OD001", name: "Hohmann 拉鉤", englishName: "Hohmann Retractor", brand: "Synthes", model: "1815-3218", origin: "瑞士", departmentCode: "O", categoryCode: "D", quantity: 2 },
  ];
  for (const i of instruments) {
    await prisma.instrument.upsert({
      where: { code: i.code },
      update: {},
      create: i,
    });
  }

  // ── 範例進貨批次 ──
  const hasBatch = await prisma.purchaseBatch.count();
  if (hasBatch === 0) {
    await prisma.purchaseBatch.createMany({
      data: [
        {
          instrumentCode: "GA001",
          orderNo: "LPF412251",
          vendor: "怡品實業有限公司",
          partNo: "14800000",
          quantity: 12,
          unitPrice: 480,
          amount: 5760,
          lotNo: "K06D510",
          receivedDate: new Date("2025-03-12"),
        },
        {
          instrumentCode: "OD001",
          orderNo: "LPF418800",
          vendor: "立蕘醫材",
          partNo: "19909001",
          quantity: 2,
          unitPrice: 5200,
          amount: 10400,
          lotNo: "S21A097",
          receivedDate: new Date("2026-01-08"),
        },
      ],
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
