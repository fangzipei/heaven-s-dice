-- Heaven's Dice analytics schema. Uses the existing `wanjie` database,
-- with hd_ prefixes so it never collides with the other application's tables.
CREATE TABLE IF NOT EXISTS hd_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(24) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hd_users_public_id (public_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hd_sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  PRIMARY KEY (token_hash),
  KEY idx_hd_sessions_user (user_id),
  CONSTRAINT fk_hd_sessions_user FOREIGN KEY (user_id) REFERENCES hd_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hd_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  client_run_id VARCHAR(64) NOT NULL,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NOT NULL,
  duration_ms INT UNSIGNED NOT NULL,
  result ENUM('win','loss','forfeit','abandoned') NOT NULL,
  level_reached SMALLINT UNSIGNED NOT NULL,
  final_score INT UNSIGNED NOT NULL DEFAULT 0,
  coins INT UNSIGNED NOT NULL DEFAULT 0,
  luck_index DECIMAL(10,2) NOT NULL DEFAULT 0,
  summary JSON NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_hd_runs_client (user_id, client_run_id),
  KEY idx_hd_runs_time (result, duration_ms),
  KEY idx_hd_runs_luck (luck_index),
  CONSTRAINT fk_hd_runs_user FOREIGN KEY (user_id) REFERENCES hd_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hd_run_levels (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  level SMALLINT UNSIGNED NOT NULL,
  opponent VARCHAR(64) NULL,
  table_name VARCHAR(64) NULL,
  target INT UNSIGNED NOT NULL DEFAULT 0,
  score INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  loadout JSON NULL,
  throws JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hd_levels_run_level (run_id, level),
  KEY idx_hd_levels_run (run_id),
  CONSTRAINT fk_hd_levels_run FOREIGN KEY (run_id) REFERENCES hd_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hd_shop_choices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  level SMALLINT UNSIGNED NOT NULL,
  action VARCHAR(24) NOT NULL,
  kind VARCHAR(16) NULL,
  item_id VARCHAR(48) NULL,
  item_name VARCHAR(64) NULL,
  price INT NULL,
  coins_after INT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_hd_shop_run (run_id),
  CONSTRAINT fk_hd_shop_run FOREIGN KEY (run_id) REFERENCES hd_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
