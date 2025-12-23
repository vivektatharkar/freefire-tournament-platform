-- backend/migrations/2025_add_payment_columns.sql
-- MySQL / MariaDB idempotent migration
-- Run this once (e.g. from mysql client or a migration runner)

SET @db := DATABASE();

-- add gateway column
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'gateway';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN gateway VARCHAR(64) NULL AFTER status;
END IF;

-- add gateway_order_id
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'gateway_order_id';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN gateway_order_id VARCHAR(128) NULL AFTER gateway;
END IF;

-- add gateway_payment_id
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'gateway_payment_id';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN gateway_payment_id VARCHAR(128) NULL AFTER gateway_order_id;
END IF;

-- add gateway_signature
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'gateway_signature';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN gateway_signature VARCHAR(255) NULL AFTER gateway_payment_id;
END IF;

-- add type column (credit/debit)
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'type';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN type ENUM('credit','debit') NOT NULL DEFAULT 'credit' AFTER amount;
END IF;

-- add description column
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'description';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN description TEXT NULL AFTER gateway_signature;
END IF;

-- ensure created_at/updated_at columns exist (if you use timestamps)
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'created_at';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
END IF;
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
 WHERE table_schema = @db AND table_name = 'payments' AND column_name = 'updated_at';
IF @exists = 0 THEN
  ALTER TABLE payments ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
END IF;

-- you may optionally add an index on gateway_payment_id to speed duplicate checks:
ALTER TABLE payments ADD INDEX idx_payments_gateway_payment (gateway, gateway_payment_id);