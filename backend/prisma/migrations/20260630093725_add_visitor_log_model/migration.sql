-- CreateTable
CREATE TABLE "visitor_logs" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_logs_date_idx" ON "visitor_logs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_logs_visitorId_date_key" ON "visitor_logs"("visitorId", "date");
