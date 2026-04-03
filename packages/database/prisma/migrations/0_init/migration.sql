-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONSUMER', 'CREATOR', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('DECLARATION', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVED', 'REJECTED', 'ESCALATED', 'CSAM_REPORTED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'AGE_VERIFICATION', 'CONTENT_CREATION', 'DATA_PROCESSING');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SUBSCRIPTION', 'PPV', 'TIP', 'SUPERCHAT', 'DIGITAL_ITEM', 'WITHDRAWAL', 'REFUND');

-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ToySessionStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'SUBSCRIBERS', 'PPV');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FLAGGED', 'DELETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_SUBSCRIBER', 'NEW_MESSAGE', 'NEW_PPV_PURCHASE', 'NEW_TIP', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'WITHDRAWAL_SCHEDULED', 'WITHDRAWAL_COMPLETED', 'CONTENT_APPROVED', 'CONTENT_REJECTED', 'STORY_VIEW', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DigitalItemType" AS ENUM ('PHOTO_PACK', 'VIDEO_PACK', 'CUSTOM_REQUEST', 'VOICE_MESSAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'TWITTER_X', 'TIKTOK');

-- CreateEnum
CREATE TYPE "ScheduledPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerifiedTierStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CollabStatus" AS ENUM ('PENDING', 'INVITED', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentMetric" AS ENUM ('NEW_SUBSCRIBERS', 'REVENUE', 'CONTENT_VIEWS');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED', 'PAID');

-- CreateEnum
CREATE TYPE "CryptoTxStatus" AS ENUM ('PENDING', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "AvatarStatus" AS ENUM ('PENDING_UPLOAD', 'QUEUED', 'TRAINING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentGenStatus" AS ENUM ('QUEUED', 'PROCESSING', 'PENDING_MODERATION', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EditSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VrFormat" AS ENUM ('VR180', 'VR360', 'AR_MARKER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONSUMER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_EMAIL',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "cpfHash" TEXT,
    "cpfEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artisticName" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'BR',
    "showLocation" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB DEFAULT '[]',
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isCreator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "declarationAt" TIMESTAMP(3),
    "documentType" TEXT,
    "documentUrl" TEXT,
    "selfieUrl" TEXT,
    "kycProvider" TEXT,
    "kycExternalId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgeVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPlan" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "priceQuarterly" DECIMAL(10,2),
    "priceYearly" DECIMAL(10,2),
    "maxSlots" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "gatewaySubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PpvContent" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "contentUrl" TEXT,
    "previewUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PpvContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PpvPurchase" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PpvPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "grossAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "description" TEXT,
    "subscriptionId" TEXT,
    "ppvPurchaseId" TEXT,
    "withdrawalId" TEXT,
    "gatewayProvider" TEXT,
    "gatewayTxId" TEXT,
    "gatewayPayload" JSONB,
    "failureReason" TEXT,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorBalance" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "availableAmount" INTEGER NOT NULL DEFAULT 0,
    "pendingAmount" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "pixKey" TEXT NOT NULL,
    "pixKeyType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "gatewayTxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "moderatorId" TEXT,
    "reason" TEXT,
    "csamHash" TEXT,
    "reportedToAuthority" BOOLEAN NOT NULL DEFAULT false,
    "reportReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'SUBSCRIBERS',
    "title" TEXT,
    "description" TEXT,
    "originalUrl" TEXT,
    "processedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "previewUrl" TEXT,
    "durationSec" INTEGER,
    "fileSizeBytes" BIGINT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "pricePerMsg" INTEGER,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "MediaType",
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "pricePaid" INTEGER,
    "isAutoReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxPerDay" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "sentEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentPush" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "message" VARCHAR(280),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "mediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalItem" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "type" "DigitalItemType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "deliveryDays" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sampleUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalOrder" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "price" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "buyerNote" VARCHAR(500),
    "deliveryUrl" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionSlotConfig" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "maxSlots" INTEGER,
    "promoPrice" DECIMAL(10,2),
    "promoEndsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionSlotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeType" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discountPct" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StreakBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "creditBRL" DECIMAL(10,2) NOT NULL DEFAULT 15.00,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "creditGranted" BOOLEAN NOT NULL DEFAULT false,
    "creditAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "status" "LiveStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "livekitRoomName" TEXT,
    "livekitToken" TEXT,
    "requiresSubscription" BOOLEAN NOT NULL DEFAULT true,
    "maxViewers" INTEGER,
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recordingConsentAt" TIMESTAMP(3),
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperChat" (
    "id" TEXT NOT NULL,
    "liveId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "message" VARCHAR(200) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#9333ea',
    "pinnedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "mediaId" TEXT,
    "startingBid" INTEGER NOT NULL,
    "currentBid" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "status" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "endsAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "deliveryUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionBid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToySession" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "liveId" TEXT,
    "status" "ToySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentText" TEXT NOT NULL,
    "minIntensity" INTEGER NOT NULL DEFAULT 0,
    "maxIntensity" INTEGER NOT NULL DEFAULT 50,
    "pricePerMin" INTEGER NOT NULL,
    "minPayBRL" INTEGER NOT NULL DEFAULT 500,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToyControl" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "intensity" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
    "referredByCode" TEXT,
    "l1Rate" DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
    "l2Rate" DECIMAL(5,4) NOT NULL DEFAULT 0.0500,
    "capMonthlyBRL" DECIMAL(10,2) NOT NULL DEFAULT 5000,
    "pendingBRL" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidBRL" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalEarnedBRL" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateCommission" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "transactionId" TEXT,
    "level" INTEGER NOT NULL,
    "grossBRL" DECIMAL(10,2) NOT NULL,
    "commissionBRL" DECIMAL(10,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "caption" VARCHAR(2200) NOT NULL,
    "mediaUrl" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "errorMsg" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedTierAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VerifiedTierStatus" NOT NULL DEFAULT 'INACTIVE',
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "kycVerifId" TEXT,

    CONSTRAINT "VerifiedTierAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPersona" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "displayName" VARCHAR(60) NOT NULL,
    "voiceTone" VARCHAR(500) NOT NULL,
    "systemPrompt" VARCHAR(4000) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "faqEntries" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPersonaMessage" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userMsg" VARCHAR(2000) NOT NULL,
    "aiReply" VARCHAR(4000) NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPersonaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabMatch" (
    "id" TEXT NOT NULL,
    "creatorAId" TEXT NOT NULL,
    "creatorBId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" "CollabStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollabMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabContract" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "creatorAId" TEXT NOT NULL,
    "creatorBId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "terms" JSONB NOT NULL,
    "fullText" TEXT NOT NULL,
    "summary" VARCHAR(2000) NOT NULL,
    "tokenA" TEXT,
    "tokenAExpiresAt" TIMESTAMP(3),
    "signedByAAt" TIMESTAMP(3),
    "tokenB" TEXT,
    "tokenBExpiresAt" TIMESTAMP(3),
    "signedByBAt" TIMESTAMP(3),
    "s3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollabContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "metric" "TournamentMetric" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "prizePoolBRL" DECIMAL(10,2) NOT NULL,
    "rulesJson" JSONB NOT NULL,
    "prizeDistrib" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "score" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "prizeBRL" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "amountCrypto" DECIMAL(20,8) NOT NULL,
    "amountBRL" DECIMAL(10,2) NOT NULL,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "status" "CryptoTxStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "walletAddress" VARCHAR(200) NOT NULL,
    "kycTier" TEXT NOT NULL DEFAULT 'LOW',
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'BR',
    "optedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAvatar" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "AvatarStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "photoKeys" JSONB NOT NULL DEFAULT '[]',
    "audioKey" TEXT,
    "consentText" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3),
    "modelRef" TEXT,
    "errorMsg" TEXT,
    "allowFanGeneration" BOOLEAN NOT NULL DEFAULT false,
    "maxGenPerDay" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAvatarGeneration" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "prompt" VARCHAR(500) NOT NULL,
    "resultKey" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMsg" TEXT,
    "moderationPassed" BOOLEAN,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAvatarGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGenJob" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "prompt" VARCHAR(1000) NOT NULL,
    "jobType" VARCHAR(50) NOT NULL,
    "status" "ContentGenStatus" NOT NULL DEFAULT 'QUEUED',
    "inputKey" TEXT,
    "outputKey" TEXT,
    "errorMsg" TEXT,
    "moderationPassed" BOOLEAN,
    "moderatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGenJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditSuggestion" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "note" VARCHAR(500),
    "status" "EditSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "revenueSharePct" INTEGER,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VrContent" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "format" "VrFormat" NOT NULL,
    "resolution" VARCHAR(20) NOT NULL,
    "key2K" TEXT,
    "key4K" TEXT,
    "key8K" TEXT,
    "stereoMode" TEXT NOT NULL DEFAULT 'top-bottom',
    "fovDegrees" INTEGER NOT NULL DEFAULT 180,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VrContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpfHash_key" ON "User"("cpfHash");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_cpfHash_idx" ON "User"("cpfHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_artisticName_key" ON "UserProfile"("artisticName");

-- CreateIndex
CREATE INDEX "UserProfile_artisticName_idx" ON "UserProfile"("artisticName");

-- CreateIndex
CREATE INDEX "UserProfile_category_idx" ON "UserProfile"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_refreshToken_idx" ON "Session"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgeVerification_userId_key" ON "AgeVerification"("userId");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_type_idx" ON "ConsentRecord"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "DataDeletionRequest_userId_key" ON "DataDeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "CreatorPlan_creatorId_idx" ON "CreatorPlan"("creatorId");

-- CreateIndex
CREATE INDEX "Subscription_subscriberId_idx" ON "Subscription"("subscriberId");

-- CreateIndex
CREATE INDEX "Subscription_creatorId_idx" ON "Subscription"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriberId_creatorId_planId_key" ON "Subscription"("subscriberId", "creatorId", "planId");

-- CreateIndex
CREATE INDEX "PpvContent_creatorId_idx" ON "PpvContent"("creatorId");

-- CreateIndex
CREATE INDEX "PpvPurchase_buyerId_idx" ON "PpvPurchase"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "PpvPurchase_buyerId_contentId_key" ON "PpvPurchase"("buyerId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_ppvPurchaseId_key" ON "Transaction"("ppvPurchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_gatewayTxId_key" ON "Transaction"("gatewayTxId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_creatorId_idx" ON "Transaction"("creatorId");

-- CreateIndex
CREATE INDEX "Transaction_gatewayTxId_idx" ON "Transaction"("gatewayTxId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorBalance_creatorId_key" ON "CreatorBalance"("creatorId");

-- CreateIndex
CREATE INDEX "Withdrawal_creatorId_idx" ON "Withdrawal"("creatorId");

-- CreateIndex
CREATE INDEX "ModerationLog_contentId_contentType_idx" ON "ModerationLog"("contentId", "contentType");

-- CreateIndex
CREATE INDEX "Media_creatorId_status_idx" ON "Media"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Media_creatorId_visibility_idx" ON "Media"("creatorId", "visibility");

-- CreateIndex
CREATE INDEX "Story_creatorId_idx" ON "Story"("creatorId");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryView_storyId_viewerId_key" ON "StoryView"("storyId", "viewerId");

-- CreateIndex
CREATE INDEX "Conversation_creatorId_idx" ON "Conversation"("creatorId");

-- CreateIndex
CREATE INDEX "Conversation_fanId_idx" ON "Conversation"("fanId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_creatorId_fanId_key" ON "Conversation"("creatorId", "fanId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Tip_creatorId_createdAt_idx" ON "Tip"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "Tip_senderId_idx" ON "Tip"("senderId");

-- CreateIndex
CREATE INDEX "DigitalItem_creatorId_isActive_idx" ON "DigitalItem"("creatorId", "isActive");

-- CreateIndex
CREATE INDEX "DigitalOrder_buyerId_idx" ON "DigitalOrder"("buyerId");

-- CreateIndex
CREATE INDEX "DigitalOrder_itemId_idx" ON "DigitalOrder"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionSlotConfig_creatorId_key" ON "SubscriptionSlotConfig"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak"("userId");

-- CreateIndex
CREATE INDEX "StreakBadge_userId_idx" ON "StreakBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StreakBadge_userId_badgeType_key" ON "StreakBadge"("userId", "badgeType");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_userId_key" ON "ReferralCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_livekitRoomName_key" ON "LiveSession"("livekitRoomName");

-- CreateIndex
CREATE INDEX "LiveSession_creatorId_status_idx" ON "LiveSession"("creatorId", "status");

-- CreateIndex
CREATE INDEX "LiveSession_scheduledAt_idx" ON "LiveSession"("scheduledAt");

-- CreateIndex
CREATE INDEX "SuperChat_liveId_createdAt_idx" ON "SuperChat"("liveId", "createdAt");

-- CreateIndex
CREATE INDEX "Auction_creatorId_status_idx" ON "Auction"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Auction_endsAt_idx" ON "Auction"("endsAt");

-- CreateIndex
CREATE INDEX "AuctionBid_auctionId_amount_idx" ON "AuctionBid"("auctionId", "amount");

-- CreateIndex
CREATE INDEX "AuctionBid_bidderId_idx" ON "AuctionBid"("bidderId");

-- CreateIndex
CREATE INDEX "ToySession_creatorId_status_idx" ON "ToySession"("creatorId", "status");

-- CreateIndex
CREATE INDEX "ToyControl_sessionId_endsAt_idx" ON "ToyControl"("sessionId", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_userId_key" ON "Affiliate"("userId");

-- CreateIndex
CREATE INDEX "Affiliate_userId_idx" ON "Affiliate"("userId");

-- CreateIndex
CREATE INDEX "AffiliateCommission_affiliateId_paid_idx" ON "AffiliateCommission"("affiliateId", "paid");

-- CreateIndex
CREATE INDEX "AffiliateCommission_sourceUserId_idx" ON "AffiliateCommission"("sourceUserId");

-- CreateIndex
CREATE INDEX "ScheduledPost_creatorId_scheduledAt_idx" ON "ScheduledPost"("creatorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_scheduledAt_idx" ON "ScheduledPost"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedTierAccess_userId_key" ON "VerifiedTierAccess"("userId");

-- CreateIndex
CREATE INDEX "VerifiedTierAccess_userId_status_idx" ON "VerifiedTierAccess"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiPersona_creatorId_key" ON "AiPersona"("creatorId");

-- CreateIndex
CREATE INDEX "AiPersonaMessage_personaId_createdAt_idx" ON "AiPersonaMessage"("personaId", "createdAt");

-- CreateIndex
CREATE INDEX "CollabMatch_creatorAId_status_idx" ON "CollabMatch"("creatorAId", "status");

-- CreateIndex
CREATE INDEX "CollabMatch_creatorBId_status_idx" ON "CollabMatch"("creatorBId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CollabMatch_creatorAId_creatorBId_key" ON "CollabMatch"("creatorAId", "creatorBId");

-- CreateIndex
CREATE INDEX "CollabContract_creatorAId_idx" ON "CollabContract"("creatorAId");

-- CreateIndex
CREATE INDEX "CollabContract_creatorBId_idx" ON "CollabContract"("creatorBId");

-- CreateIndex
CREATE INDEX "Tournament_status_endsAt_idx" ON "Tournament"("status", "endsAt");

-- CreateIndex
CREATE INDEX "TournamentEntry_tournamentId_score_idx" ON "TournamentEntry"("tournamentId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_creatorId_key" ON "TournamentEntry"("tournamentId", "creatorId");

-- CreateIndex
CREATE INDEX "CryptoTransaction_userId_idx" ON "CryptoTransaction"("userId");

-- CreateIndex
CREATE INDEX "CryptoTransaction_providerRef_idx" ON "CryptoTransaction"("providerRef");

-- CreateIndex
CREATE INDEX "CryptoTransaction_status_expiresAt_idx" ON "CryptoTransaction"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocation_userId_key" ON "UserLocation"("userId");

-- CreateIndex
CREATE INDEX "UserLocation_state_idx" ON "UserLocation"("state");

-- CreateIndex
CREATE INDEX "UserLocation_expiresAt_idx" ON "UserLocation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiAvatar_creatorId_key" ON "AiAvatar"("creatorId");

-- CreateIndex
CREATE INDEX "AiAvatar_status_idx" ON "AiAvatar"("status");

-- CreateIndex
CREATE INDEX "AiAvatarGeneration_avatarId_requestedBy_idx" ON "AiAvatarGeneration"("avatarId", "requestedBy");

-- CreateIndex
CREATE INDEX "AiAvatarGeneration_status_idx" ON "AiAvatarGeneration"("status");

-- CreateIndex
CREATE INDEX "ContentGenJob_creatorId_status_idx" ON "ContentGenJob"("creatorId", "status");

-- CreateIndex
CREATE INDEX "EditSuggestion_mediaId_status_idx" ON "EditSuggestion"("mediaId", "status");

-- CreateIndex
CREATE INDEX "EditSuggestion_fanId_idx" ON "EditSuggestion"("fanId");

-- CreateIndex
CREATE UNIQUE INDEX "VrContent_mediaId_key" ON "VrContent"("mediaId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgeVerification" ADD CONSTRAINT "AgeVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPlan" ADD CONSTRAINT "CreatorPlan_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CreatorPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PpvPurchase" ADD CONSTRAINT "PpvPurchase_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "PpvContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ppvPurchaseId_fkey" FOREIGN KEY ("ppvPurchaseId") REFERENCES "PpvPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalOrder" ADD CONSTRAINT "DigitalOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "DigitalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralCode_fkey" FOREIGN KEY ("referralCode") REFERENCES "ReferralCode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperChat" ADD CONSTRAINT "SuperChat_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "LiveSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToyControl" ADD CONSTRAINT "ToyControl_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ToySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoTransaction" ADD CONSTRAINT "CryptoTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAvatar" ADD CONSTRAINT "AiAvatar_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAvatarGeneration" ADD CONSTRAINT "AiAvatarGeneration_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "AiAvatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGenJob" ADD CONSTRAINT "ContentGenJob_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditSuggestion" ADD CONSTRAINT "EditSuggestion_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditSuggestion" ADD CONSTRAINT "EditSuggestion_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VrContent" ADD CONSTRAINT "VrContent_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
