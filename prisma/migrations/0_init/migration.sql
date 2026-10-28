-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
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
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
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

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL DEFAULT 'chess',
    "variant" TEXT NOT NULL DEFAULT 'standard',
    "timeControlMinutes" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "creatorId" TEXT NOT NULL,
    "whitePlayerId" TEXT,
    "blackPlayerId" TEXT,
    "whitePlayerToken" TEXT,
    "blackPlayerToken" TEXT,
    "whitePlayerHandle" TEXT,
    "blackPlayerHandle" TEXT,
    "whitePlayerRating" INTEGER DEFAULT 1200,
    "blackPlayerRating" INTEGER DEFAULT 1200,
    "whiteTimeRemaining" INTEGER NOT NULL,
    "blackTimeRemaining" INTEGER NOT NULL,
    "lastMoveTimestamp" BIGINT NOT NULL,
    "currentTurn" TEXT NOT NULL DEFAULT 'w',
    "moveSequence" INTEGER NOT NULL DEFAULT 0,
    "currentState" JSONB NOT NULL,
    "lastMove" JSONB,
    "history" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pendingDrawOffer" TEXT,
    "pendingRematchOffer" TEXT,
    "winner" TEXT,
    "finishReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMove" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "commandId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerRole" TEXT NOT NULL,
    "moveData" JSONB NOT NULL,
    "resultingTurn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMove_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_blitzRating_idx" ON "User"("blitzRating");

-- CreateIndex
CREATE INDEX "User_rapidRating_idx" ON "User"("rapidRating");

-- CreateIndex
CREATE INDEX "User_bulletRating_idx" ON "User"("bulletRating");

-- CreateIndex
CREATE INDEX "User_checkersRating_idx" ON "User"("checkersRating");

-- CreateIndex
CREATE INDEX "User_morabarabaRating_idx" ON "User"("morabarabaRating");

-- CreateIndex
CREATE INDEX "User_xp_idx" ON "User"("xp");

-- CreateIndex
CREATE UNIQUE INDEX "Match_roomId_key" ON "Match"("roomId");

-- CreateIndex
CREATE INDEX "Match_whiteId_idx" ON "Match"("whiteId");

-- CreateIndex
CREATE INDEX "Match_blackId_idx" ON "Match"("blackId");

-- CreateIndex
CREATE INDEX "Match_createdAt_idx" ON "Match"("createdAt");

-- CreateIndex
CREATE INDEX "Match_gameId_idx" ON "Match"("gameId");

-- CreateIndex
CREATE INDEX "Match_whiteId_blackId_idx" ON "Match"("whiteId", "blackId");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Room_creatorId_idx" ON "Room"("creatorId");

-- CreateIndex
CREATE INDEX "Room_updatedAt_idx" ON "Room"("updatedAt");

-- CreateIndex
CREATE INDEX "RoomMove_roomId_sequence_idx" ON "RoomMove"("roomId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMove_roomId_sequence_key" ON "RoomMove"("roomId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMove_roomId_commandId_key" ON "RoomMove"("roomId", "commandId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMove" ADD CONSTRAINT "RoomMove_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
