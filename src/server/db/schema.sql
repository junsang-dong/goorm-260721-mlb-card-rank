CREATE TABLE IF NOT EXISTS cards (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  player           TEXT,
  team             TEXT,
  brand            TEXT,
  year             INTEGER,
  price            REAL NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  shipping         REAL,
  seller           TEXT,
  seller_rating    REAL,
  review_count     INTEGER,
  image            TEXT,
  url              TEXT NOT NULL,
  listing_position INTEGER,
  sold_count       INTEGER,
  watchers         INTEGER,
  is_sponsored     INTEGER NOT NULL DEFAULT 0,
  scraped_at       TEXT NOT NULL,
  analyzed_at      TEXT
);

CREATE TABLE IF NOT EXISTS ai_analysis (
  card_id          TEXT PRIMARY KEY REFERENCES cards(id),
  rookie           INTEGER NOT NULL DEFAULT 0,
  autograph        INTEGER NOT NULL DEFAULT 0,
  patch            INTEGER NOT NULL DEFAULT 0,
  parallel_type    TEXT,
  serial_number    TEXT,
  grading          TEXT,
  investment_score INTEGER NOT NULL,
  summary          TEXT NOT NULL,
  ranking_score    REAL,
  analyzed_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_scraped_at ON cards(scraped_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_ranking_score ON ai_analysis(ranking_score);
