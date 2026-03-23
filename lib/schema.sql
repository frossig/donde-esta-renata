CREATE TABLE IF NOT EXISTS stops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  flag TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius_km REAL NOT NULL DEFAULT 50,
  date_start TEXT NOT NULL,
  date_end TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  postcard_text TEXT,
  -- cover_photo_id is a soft reference (no FK constraint) to avoid a circular
  -- dependency between stops and photos. Referential integrity is enforced
  -- at the application layer.
  cover_photo_id TEXT
);

CREATE TABLE IF NOT EXISTS trip_status (
  -- CHECK (id = 1) enforces that only a single row can ever exist in this table.
  id INTEGER PRIMARY KEY CHECK (id = 1) DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'at_stop' CHECK (state IN ('at_stop', 'in_transit')),
  current_stop_id TEXT,
  from_stop_id TEXT,
  to_stop_id TEXT,
  transport_mode TEXT CHECK (transport_mode IN ('plane', 'train', 'bus')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  stop_id TEXT,
  r2_key TEXT NOT NULL,
  thumbnail_key TEXT,
  taken_at TEXT,
  lat REAL,
  lng REAL,
  media_type TEXT NOT NULL DEFAULT 'photo',
  uploaded_at TEXT NOT NULL,
  assignment TEXT NOT NULL DEFAULT 'manual',
  FOREIGN KEY (stop_id) REFERENCES stops(id)
);

CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  emoji TEXT,
  comment TEXT,
  reactor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (photo_id) REFERENCES photos(id),
  UNIQUE(photo_id, reactor)
);

CREATE INDEX IF NOT EXISTS idx_photos_stop_id ON photos (stop_id);
CREATE INDEX IF NOT EXISTS idx_reactions_photo_id ON reactions (photo_id);
