CREATE TABLE IF NOT EXISTS urls (
    id            BIGSERIAL PRIMARY KEY,
    short_code    VARCHAR(12) UNIQUE NOT NULL,
    long_url      TEXT NOT NULL,
    custom_alias  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    creator_ip    INET,
    click_count   BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls (short_code);

CREATE TABLE IF NOT EXISTS clicks (
    id          BIGSERIAL PRIMARY KEY,
    url_id      BIGINT NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    clicked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    referrer    TEXT,
    user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks (url_id);
