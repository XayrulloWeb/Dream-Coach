-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PRE_MATCH', 'PAUSED_FOR_COACH', 'FINISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realPosition" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "pac" INTEGER NOT NULL,
    "sho" INTEGER NOT NULL,
    "pas" INTEGER NOT NULL,
    "dri" INTEGER NOT NULL,
    "def" INTEGER NOT NULL,
    "phy" INTEGER NOT NULL,
    "stamina" INTEGER NOT NULL DEFAULT 100,
    "attackWorkRate" TEXT NOT NULL,
    "defenseWorkRate" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Dream Team',
    "formation" TEXT NOT NULL,
    "tacticalStyle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadPlayer" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rolePosition" TEXT NOT NULL,
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SquadPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'PRE_MATCH',
    "seed" TEXT NOT NULL,
    "venue" TEXT NOT NULL DEFAULT 'HOME',
    "opponentName" TEXT NOT NULL,
    "userScore" INTEGER NOT NULL DEFAULT 0,
    "opponentScore" INTEGER NOT NULL DEFAULT 0,
    "matchStats" JSONB,
    "lineups" JSONB,
    "teamVectors" JSONB,
    "stamina" JSONB,
    "morale" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchStateSnapshot" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "zone" TEXT,
    "playerName" TEXT,
    "message" TEXT NOT NULL,
    "chanceQuality" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Substitution" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerOutId" TEXT NOT NULL,
    "playerInId" TEXT NOT NULL,
    "oldPosition" TEXT,
    "newPosition" TEXT,
    "formationBefore" TEXT NOT NULL,
    "formationAfter" TEXT NOT NULL,
    "impactPreview" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Substitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMatchRating" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMatchRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "SquadPlayer_squadId_idx" ON "SquadPlayer"("squadId");

-- CreateIndex
CREATE INDEX "SquadPlayer_playerId_idx" ON "SquadPlayer"("playerId");

-- CreateIndex
CREATE INDEX "Match_userId_idx" ON "Match"("userId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "MatchStateSnapshot_matchId_minute_idx" ON "MatchStateSnapshot"("matchId", "minute");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_minute_idx" ON "MatchEvent"("matchId", "minute");

-- CreateIndex
CREATE INDEX "Substitution_matchId_minute_idx" ON "Substitution"("matchId", "minute");

-- CreateIndex
CREATE INDEX "PlayerMatchRating_matchId_idx" ON "PlayerMatchRating"("matchId");

-- CreateIndex
CREATE INDEX "PlayerMatchRating_playerId_idx" ON "PlayerMatchRating"("playerId");

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStateSnapshot" ADD CONSTRAINT "MatchStateSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchRating" ADD CONSTRAINT "PlayerMatchRating_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
