-- Add Performance Indexes on Match and User tables
-- Idempotent non-blocking index creation

CREATE INDEX IF NOT EXISTS "Match_whiteId_idx" ON "Match"("whiteId");
CREATE INDEX IF NOT EXISTS "Match_blackId_idx" ON "Match"("blackId");
CREATE INDEX IF NOT EXISTS "Match_createdAt_idx" ON "Match"("createdAt");
CREATE INDEX IF NOT EXISTS "Match_gameId_idx" ON "Match"("gameId");
CREATE INDEX IF NOT EXISTS "Match_whiteId_blackId_idx" ON "Match"("whiteId", "blackId");

CREATE INDEX IF NOT EXISTS "User_blitzRating_idx" ON "User"("blitzRating");
CREATE INDEX IF NOT EXISTS "User_rapidRating_idx" ON "User"("rapidRating");
CREATE INDEX IF NOT EXISTS "User_bulletRating_idx" ON "User"("bulletRating");
CREATE INDEX IF NOT EXISTS "User_checkersRating_idx" ON "User"("checkersRating");
CREATE INDEX IF NOT EXISTS "User_morabarabaRating_idx" ON "User"("morabarabaRating");
CREATE INDEX IF NOT EXISTS "User_xp_idx" ON "User"("xp");
