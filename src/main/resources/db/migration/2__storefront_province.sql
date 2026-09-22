-- Splits the combined "Localidad, Provincia" previously packed into
-- storefronts.city into two columns. city is now the locality alone;
-- province is new. No backfill: no storefronts exist yet.
ALTER TABLE storefronts ADD COLUMN province VARCHAR(120);

COMMENT ON COLUMN storefronts.city IS 'Localidad (censal), derived via georef-ar.';
COMMENT ON COLUMN storefronts.province IS 'Provincia, derived via georef-ar.';

CREATE INDEX IF NOT EXISTS idx_storefronts_province ON storefronts(province) WHERE province IS NOT NULL;
