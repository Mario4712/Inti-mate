-- Add question field to Story
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "question" VARCHAR(200);

-- StoryPoll
CREATE TABLE IF NOT EXISTS "StoryPoll" (
  "id"        TEXT NOT NULL,
  "storyId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryPoll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StoryPoll_storyId_key" ON "StoryPoll"("storyId");
ALTER TABLE "StoryPoll" ADD CONSTRAINT "StoryPoll_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StoryPollOption
CREATE TABLE IF NOT EXISTS "StoryPollOption" (
  "id"      TEXT NOT NULL,
  "pollId"  TEXT NOT NULL,
  "text"    VARCHAR(80) NOT NULL,
  "order"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StoryPollOption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StoryPollOption_pollId_idx" ON "StoryPollOption"("pollId");
ALTER TABLE "StoryPollOption" ADD CONSTRAINT "StoryPollOption_pollId_fkey"
  FOREIGN KEY ("pollId") REFERENCES "StoryPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StoryPollVote
CREATE TABLE IF NOT EXISTS "StoryPollVote" (
  "id"        TEXT NOT NULL,
  "optionId"  TEXT NOT NULL,
  "voterId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryPollVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StoryPollVote_optionId_voterId_key" ON "StoryPollVote"("optionId", "voterId");
CREATE INDEX IF NOT EXISTS "StoryPollVote_voterId_idx" ON "StoryPollVote"("voterId");
ALTER TABLE "StoryPollVote" ADD CONSTRAINT "StoryPollVote_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "StoryPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
