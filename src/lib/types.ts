// 前端共用型別（與後端 Prisma model 對應，避免在 client 引入 Prisma）

export type Role = "ADMIN" | "OPERATOR" | "READONLY";
export type InstrumentStatus = "ACTIVE" | "ARCHIVED" | "PENDING_DELETE";
export type TxType =
  | "REGISTER"
  | "ADD"
  | "PURCHASE"
  | "REDUCE"
  | "PACK"
  | "UNPACK"
  | "ADJUST"
  | "ARCHIVE"
  | "EDIT";

export type SafeUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
};

export type Instrument = {
  code: string;
  name: string;
  englishName: string | null;
  brand: string | null;
  model: string | null;
  origin: string | null;
  departmentCode: string;
  categoryCode: string;
  commonCode: string | null;
  parentCode: string | null;
  propertyNo: string | null;
  unit: string;
  quantity: number;
  status: InstrumentStatus;
  note: string | null;
  department?: { name: string };
  category?: { name: string };
};

export type PurchaseBatch = {
  id: string;
  instrumentCode: string;
  orderNo: string | null;
  vendor: string | null;
  partNo: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  lotNo: string | null;
  expiryDate: string | null;
  receivedDate: string;
  note: string | null;
};

export type Pack = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  _count?: { items: number };
};

export type PackItem = {
  id: string;
  instrumentCode: string;
  standardQty: number;
  instrument?: { code: string; name: string; quantity: number; status: InstrumentStatus };
};

export type Transaction = {
  id: string;
  serial: string;
  type: TxType;
  instrumentCode: string | null;
  quantityChange: number;
  reason: string | null;
  beforeQty: number | null;
  afterQty: number | null;
  note: string | null;
  createdAt: string;
  operator?: { displayName: string };
  instrument?: { name: string } | null;
  pack?: { code: string; name: string } | null;
};

export type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  operatorName: string | null;
  createdAt: string;
};

export type Department = { code: string; name: string };
export type Category = { code: string; name: string };

export const TX_LABEL: Record<TxType, string> = {
  REGISTER: "建檔",
  ADD: "增加",
  PURCHASE: "進貨",
  REDUCE: "減損",
  PACK: "配包",
  UNPACK: "解包",
  ADJUST: "盤點調整",
  ARCHIVE: "封存",
  EDIT: "編輯",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "管理員",
  OPERATOR: "作業人員",
  READONLY: "唯讀人員",
};
