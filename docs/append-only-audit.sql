-- 稽核日誌不可竄改（append-only）
-- 在 Supabase Dashboard → SQL Editor 執行一次。
-- 阻擋對 audit_logs 的 UPDATE / DELETE，僅允許 INSERT。

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs 為 append-only，不允許 % 操作', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_no_update ON audit_logs;
CREATE TRIGGER audit_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- （選用）同樣保護 transactions 交易序號不被竄改／刪除
DROP TRIGGER IF EXISTS tx_no_delete ON transactions;
CREATE TRIGGER tx_no_delete
  BEFORE DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
