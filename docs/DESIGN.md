# 系統設計文件

> 對應原始需求 Prompt 1（架構設計）與 Prompt 2（痛點優化）。
> 標註 ✅ 為 MVP 已實作、🔜 為已預留資料結構待迭代。

---

## 1. 資料庫 Schema（ERD 文字描述）

完整定義見 [`prisma/schema.prisma`](../prisma/schema.prisma)。

| 資料表 | 主要欄位 | 關聯 |
| --- | --- | --- |
| **users** | id, username⊙, displayName, passwordHash, role(ADMIN/OPERATOR/READONLY), active | 1—N transactions、audit_logs |
| **departments** | code(PK, 科別首字母), name | 1—N instruments |
| **categories** | code(PK, 類別首字母), name | 1—N instruments |
| **instruments** | code(PK 器械編號), name, brand, departmentCode→, categoryCode→, commonCode, parentCode→self, propertyNo, unit, quantity, status, archivedAt | N—1 department/category、自參照 parent/children、1—N pack_items/transactions |
| **packs** | id, code⊙, name, description, active | 1—N pack_items/transactions |
| **pack_items** | id, packId→, instrumentCode→, standardQty | N—1 pack/instrument，(packId,instrumentCode) 唯一 |
| **transactions** | id, serial⊙(交易序號), type, instrumentCode→, packId→, quantityChange, reason, beforeQty, afterQty, operatorId→ | N—1 instrument/pack/user |
| **audit_logs** | id, action, entity, entityId, before(Json), after(Json), operatorId→, operatorName | append-only |
| **serial_counters** | key(PK, 如 TX-20260610), value | 每日交易序號流水號 |

⊙ = unique、→ = 外鍵。

**關鍵規則**
- `instruments.code` 為主鍵，前兩碼對應 department/category，建檔後不可更改。
- 任何庫存異動都在同一個 DB transaction 內：更新 `quantity` → `serial_counters` 原子遞增取序號 → 寫 `transactions` → 寫 `audit_logs`。
- 刪除採封存（`status=ARCHIVED` + `quantity=0`），不實刪。

---

## 2. API 端點清單（RESTful）

| Method | Path | 功能 | 權限 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 登入 | 公開 |
| POST | `/api/auth/logout` | 登出 | 登入 |
| GET | `/api/auth/me` | 目前使用者 | 登入 |
| GET | `/api/meta` | 科別 / 類別清單 | 登入 |
| GET | `/api/instruments` | 全文查詢 / 列表 | instrument:read |
| POST | `/api/instruments` | 器械建檔 | instrument:write |
| GET | `/api/instruments/[code]` | 單筆 + 交易紀錄 | instrument:read |
| PATCH | `/api/instruments/[code]` | 編輯（自動產生 EDIT 序號） | instrument:write |
| POST | `/api/instruments/[code]/add` | 器械增加 | instrument:write |
| POST | `/api/instruments/[code]/reduce` | 器械減損（報廢/遺失/移轉） | instrument:write |
| POST | `/api/instruments/[code]/archive` | 封存器械 | instrument:write |
| GET | `/api/packs` | 盤包清單 | pack:read |
| POST | `/api/packs` | 建立盤包 | pack:write |
| GET | `/api/packs/[id]` | 盤包內容查詢 | pack:read |
| PATCH | `/api/packs/[id]` | 維護標準清單 | pack:write |
| POST | `/api/packs/[id]/assemble` | 配包作業 | pack:write |
| GET | `/api/transactions` | 交易 / 明細查詢 | transaction:read |
| GET | `/api/audit` | 稽核日誌（自己 / `?scope=all` 管理員） | audit:read |
| GET | `/api/users` | 用戶清單 | user:manage |
| POST | `/api/users` | 新增帳號 + 設權限 | user:manage |

🔜 後續：`POST /api/instruments/import`（批次匯入）、`POST /api/packs/[id]/unpack`（缺料解包跨盤包移轉）。

---

## 3. 前端頁面結構

```
/login                       登入
/(app)                       已登入外殼（側邊欄 + 權限導覽）
  /dashboard                 總覽：統計卡、低庫存、近期交易
  /instruments               器械清單 + 全文搜尋 + 建檔 Modal
  /instruments/[code]        器械詳情：增加/減損/編輯/封存 + 交易紀錄
  /packs                     盤包清單 + 建立 Modal
  /packs/[id]                盤包標準清單編輯 + 執行配包
  /transactions              交易查詢（編號/序號/類型/日期）
  /audit                     我的操作紀錄（前後值比對）
  /users                     用戶管理（管理員限定）
```

主要共用元件：`Sidebar`（權限導覽 + 登出）、各頁 Modal（建檔 / 增減 / 編輯 / 新增帳號）。

---

## 4. 角色權限矩陣

| 能力 | 管理員 ADMIN | 作業人員 OPERATOR | 唯讀人員 READONLY |
| --- | :--: | :--: | :--: |
| 查詢器械 / 盤包 / 交易 | ✅ | ✅ | ✅ |
| 器械建檔 / 增減 / 封存 / 編輯 | ✅ | ✅ | — |
| 盤包維護 / 配包 / 解包 | ✅ | ✅ | — |
| 查閱自己的操作紀錄 | ✅ | ✅ | ✅ |
| 查閱全部稽核日誌 | ✅ | — | — |
| 交易資料維護 | ✅ | — | — |
| 用戶與權限管理 | ✅ | — | — |

實作於 [`src/lib/permissions.ts`](../src/lib/permissions.ts)，API 以 `requireCapability()` 強制、前端 `Sidebar` 以 `can()` 隱藏選單。

---

## 5. 六大痛點優化規格與優先順序

| # | 痛點 | 狀態 | 複雜度 | 建議優先 |
| --- | --- | --- | :--: | :--: |
| 1 | 刪除流程繁瑣 → 一鍵封存 | ✅ 已實作 | 低 | P0 |
| 2 | 改資料需先查序號 → 直接編輯自動帶序號 | ✅ 已實作 | 低 | P0 |
| 3 | 出錯找人工 → 即時驗證 + Audit Log + 自助查閱 | ✅ 已實作 | 中 | P0 |
| 6 | 財產編號雙重前提 → 全文模糊搜尋 | ✅ 已實作 | 低 | P1 |
| 4 | 共同碼無法細分 → 主代碼 + 子代碼 / 明細模式 | 🔜 資料結構已備 | 中 | P1 |
| 5 | 逐筆手打 → Excel/CSV 批次匯入 | 🔜 規格如下 | 高 | P2 |

### 痛點 1 — 封存器械 ✅
- (a) 一鍵完成「歸零庫存 + 標記 ARCHIVED + 產生 ARCHIVE 交易序號」，歷史紀錄保留可查。
- (b) 器械詳情頁 → 點「封存器械」→ 確認對話框 → 完成後標記為已封存、停用所有異動按鈕。
- (c) `POST /api/instruments/[code]/archive`；`Instrument.status`、`archivedAt` 欄位。
- (d) 已封存再次封存 → 409；仍在盤包標準清單中 → 擋下並提示先移除。

### 痛點 2 — 直接編輯 ✅
- (a) 查詢結果點「編輯」即進編輯模式，系統自動於存檔時產生 EDIT 交易序號並記前後值。
- (b) 詳情頁「編輯」→ 表單帶入現值（編號唯讀）→ 存檔。
- (c) `PATCH /api/instruments/[code]`。
- (d) 編號不可改；已封存不可編輯（409）；子代碼不可指向自己 / 不存在（422）。

### 痛點 3 — 自助化 ✅
- (a) 前端即時驗證（編號 regex、數量範圍）；後端 Zod 二次驗證；全操作寫 append-only Audit Log；操作人可在 `/audit` 自助查閱。
- (c) `audit_logs` 表 + `docs/append-only-audit.sql` trigger 阻擋 UPDATE/DELETE。
- (d) 驗證失敗回 422 + 欄位級錯誤訊息。

### 痛點 6 — 全文模糊搜尋 ✅
- (a) 單一搜尋框跨 編號 / 品名 / 廠牌 / 財產編號 / 共同碼。
- (c) `GET /api/instruments?q=` 以 `OR + contains(insensitive)`；欄位已建索引。
- (d) 空字串回預設列表；預設排除已封存（可切換）。

### 痛點 4 — 子代碼明細追蹤 🔜
- 主代碼下以 `parentCode` 掛子代碼；查詢提供「總數模式」(聚合 parent+children) 與「明細模式」(逐筆)。
- 待補：`GET /api/instruments?mode=total|detail` 聚合邏輯與盤包配包選子代碼。複雜度中。

### 痛點 5 — Excel/CSV 批次匯入 🔜
- (a) 上傳進貨單 → 批次驗證 → 人工確認 → 正式建立。
- (b) 上傳 → 預覽表格（逐行標示 OK / 錯誤）→ 確認送出 → 回報成功 N 筆 / 失敗清單。
- (c) `POST /api/instruments/import`（multipart），以 `papaparse`/`xlsx` 解析；兩階段（dry-run 驗證 + commit）。
- (d) 逐行錯誤回報（行號 + 原因）；重複編號 / 科別類別未建檔 / 數量格式錯；整批 transaction，全有或全無或可選逐筆。複雜度高。
