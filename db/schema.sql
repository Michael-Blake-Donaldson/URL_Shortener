CREATE DATABASE IF NOT EXISTS url_shortener;
USE url_shortener;

CREATE TABLE IF NOT EXISTS urls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  original_url TEXT NOT NULL,
  short_code VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  click_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_urls_short_code (short_code),
  KEY idx_urls_created_at (created_at)
);
