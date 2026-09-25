ALTER TABLE storefronts ADD COLUMN phone VARCHAR(30);

COMMENT ON COLUMN storefronts.phone IS 'Optional contact phone number, shown to customers.';
