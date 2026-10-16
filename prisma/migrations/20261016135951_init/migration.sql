-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "origin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'frio',
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visited" JSONB NOT NULL DEFAULT '[]',
    "outcomeId" TEXT,
    "qualified" BOOLEAN,
    "currentStep" TEXT NOT NULL DEFAULT 'intro',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "steps" JSONB NOT NULL,
    "draft" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_completed_idx" ON "Lead"("completed");
