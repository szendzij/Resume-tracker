-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "portal" TEXT,
    "url" TEXT,
    "appliedDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Wysłana',
    "location" TEXT,
    "salary" TEXT,
    "skills" TEXT,
    "timeline" TEXT,
    "notes" TEXT,
    "lastUpdated" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
