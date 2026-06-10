# 手術器械管理系統（CSSD Instrument Management）

醫院供應中心後台管理系統 — 讓每一支手術器械從「進貨」到「報廢」的完整生命週期都有跡可查。

**MVP 核心**：器械建檔、增加 / 減損、盤包配包、交易序號追蹤、全文查詢、角色權限、append-only 稽核日誌。

技術棧：**Next.js 15 (App Router) + TypeScript + Supabase (PostgreSQL) + Prisma**

---

## 快速開始

### 1. 建立 Supabase 專案並取得連線字串

到 Supabase Dashboard → **Project Settings → Database → Connection string**，取得兩組字串：

- **Connection pooling**（port `6543`，`pgbouncer=true`）→ 給 app 執行期用 (`DATABASE_URL`)
- **Direct connection**（port `5432`）→ 給 Prisma migrate / db push 用 (`DIRECT_URL`)

### 2. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env，填入上面兩組字串，並設定一組隨機 SESSION_SECRET
```

`.env` 範例：

```env
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:5432/postgres"
SESSION_SECRET="請改成一段隨機字串"
```

### 3. 安裝、建表、塞入種子資料

```bash
npm install
npm run db:push      # 依 schema 建立資料表
npm run db:seed      # 建立預設管理員與範例資料
```

### 4. （建議）開啟稽核日誌不可竄改保護

到 Supabase Dashboard → SQL Editor 執行 [`docs/append-only-audit.sql`](docs/append-only-audit.sql)。

### 5. 啟動

```bash
npm run dev          # http://localhost:3000
```

預設登入：**`admin` / `admin123`**（請於正式環境立即修改）。

---

## 指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 開發模式 |
| `npm run build` | production build |
| `npm run start` | 啟動 production server |
| `npm run db:push` | 將 schema 套用到資料庫 |
| `npm run db:seed` | 塞入預設帳號與範例資料 |
| `npm run db:studio` | 開啟 Prisma Studio 檢視資料 |

---

## 功能總覽（MVP）

| 區塊 | 功能 | 路由 |
| --- | --- | --- |
| 作業類 | 器械建檔 / 增加 / 減損 / 封存 / 編輯 | `/instruments`、`/instruments/[code]` |
| 作業類 | 盤包維護 / 配包 | `/packs`、`/packs/[id]` |
| 查詢類 | 器械全文查詢、交易查詢、盤包內容 | `/instruments`、`/transactions` |
| 查詢類 | 自助操作紀錄 | `/audit` |
| 維護類 | 用戶與權限管理（管理員） | `/users` |

詳細的資料庫 Schema、API 清單、角色權限矩陣、6 大痛點優化規格與優先順序，見
[`docs/DESIGN.md`](docs/DESIGN.md)。

---

## 已落地的設計重點

- **器械編號為主鍵**，命名規則（首字母=科別、次字母=類別）建立後不可更改，建檔時即時驗證。
- **每次異動產生交易序號** `TX-YYYYMMDD-NNNN`，原子遞增、稽核唯一依據。
- **封存取代刪除**（痛點 1）：一鍵歸零庫存 + 標記 ARCHIVED，歷史紀錄保留可查。
- **編輯免查序號**（痛點 2）：查詢結果直接點「編輯」，系統自動產生 EDIT 交易序號。
- **即時驗證 + Audit Log + 自助查閱**（痛點 3）。
- **全文模糊搜尋**（痛點 6）：品名 / 廠牌 / 編號 / 財產編號 / 共同碼多維度。

> 痛點 4（子代碼明細追蹤）、痛點 5（Excel/CSV 批次匯入）已預留資料結構
> （`Instrument.parentCode` / `commonCode`），規格見 `docs/DESIGN.md`，列為後續迭代。
