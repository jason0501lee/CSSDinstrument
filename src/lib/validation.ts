import { z } from "zod";

// 器械編號規則：首字母=科別、次字母=類別，其後接流水號數字。
// 例：GA001（G=一般外科, A=剪刀類, 001=流水號）
export const INSTRUMENT_CODE_REGEX = /^[A-Z]{2}\d{2,6}$/;

export const instrumentCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(INSTRUMENT_CODE_REGEX, "器械編號格式錯誤（須為兩個英文字母 + 2~6 位數字，如 GA001）");

export const createInstrumentSchema = z.object({
  code: instrumentCodeSchema,
  name: z.string().trim().min(1, "品名不可空白").max(100),
  brand: z.string().trim().max(100).optional().nullable(),
  commonCode: z.string().trim().max(50).optional().nullable(),
  parentCode: instrumentCodeSchema.optional().nullable(),
  propertyNo: z.string().trim().max(50).optional().nullable(),
  unit: z.string().trim().max(10).default("支"),
  initialQty: z.coerce.number().int().min(0).max(100000).default(0),
  note: z.string().trim().max(500).optional().nullable(),
});

export const updateInstrumentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  brand: z.string().trim().max(100).optional().nullable(),
  commonCode: z.string().trim().max(50).optional().nullable(),
  parentCode: instrumentCodeSchema.optional().nullable(),
  propertyNo: z.string().trim().max(50).optional().nullable(),
  unit: z.string().trim().max(10).optional(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const addStockSchema = z.object({
  quantity: z.coerce.number().int().min(1, "增加數量須 ≥ 1").max(100000),
  note: z.string().trim().max(500).optional().nullable(),
});

export const reduceStockSchema = z.object({
  quantity: z.coerce.number().int().min(1, "減損數量須 ≥ 1").max(100000),
  reason: z.enum(["SCRAP", "LOST", "TRANSFER"], {
    errorMap: () => ({ message: "原因須為 報廢 / 遺失 / 移轉" }),
  }),
  note: z.string().trim().max(500).optional().nullable(),
});

export const packSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        instrumentCode: instrumentCodeSchema,
        standardQty: z.coerce.number().int().min(1).max(1000),
      })
    )
    .default([]),
});

export const assembleSchema = z.object({
  packId: z.string().min(1),
  note: z.string().trim().max(500).optional().nullable(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "請輸入帳號"),
  password: z.string().min(1, "請輸入密碼"),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3, "帳號至少 3 碼").max(50),
  displayName: z.string().trim().min(1).max(50),
  password: z.string().min(6, "密碼至少 6 碼").max(100),
  role: z.enum(["ADMIN", "OPERATOR", "READONLY"]),
});
