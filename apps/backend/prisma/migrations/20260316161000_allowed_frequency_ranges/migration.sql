ALTER TABLE "AllowedFrequencyRange"
ADD CONSTRAINT check_high_gte_low CHECK ("high" >= "low");

INSERT INTO "AllowedFrequencyRange" ("low", "high") VALUES
(2025, 2110),
(2200, 2290),
(2360, 2395);
