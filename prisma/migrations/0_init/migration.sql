-- Baseline Initial Migration
-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "avatar" TEXT,
    "playStyle" TEXT DEFAULT 'Tactical',
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustId" TEXT,
    "bulletRating" INTEGER NOT NULL DEFAULT 1200,
    "blitzRating" INTEGER NOT NULL DEFAULT 1200,
    "rapidRating" INTEGER NOT NULL DEFAULT 1200,
    "checkersRating" INTEGER NOT NULL DEFAULT 1200,
    "morabarabaRating" INTEGER NOT NULL DEFAULT 1200,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Match" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL DEFAULT 'chess',
    "variant" TEXT DEFAULT 'standard',
    "whiteId" TEXT NOT NULL,
    "blackId" TEXT NOT NULL,
    "timeControl" TEXT NOT NULL,
    "winnerId" TEXT,
    "resultType" TEXT NOT NULL,
    "pgn" TEXT NOT NULL,
    "finalFen" TEXT NOT NULL,
    "rated" BOOLEAN NOT NULL DEFAULT true,
    "ratingDelta" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Match_whiteId_fkey'
    ) THEN
        ALTER TABLE "Match" ADD CONSTRAINT "Match_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Match_blackId_fkey'
    ) THEN
        ALTER TABLE "Match" ADD CONSTRAINT "Match_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
