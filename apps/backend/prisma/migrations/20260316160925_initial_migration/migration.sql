-- CreateEnum
CREATE TYPE "LocationEnum" AS ENUM ('first_stage', 'second_stage', 'ground');

-- CreateEnum
CREATE TYPE "EirpUnit" AS ENUM ('Watts', 'dBW', 'milliWatts', 'dBm');

-- CreateEnum
CREATE TYPE "SignalFilterStatus" AS ENUM ('filtered', 'not_filtered');

-- CreateEnum
CREATE TYPE "BeforeOrAfterFiltering" AS ENUM ('before_filtering', 'after_filtering');

-- CreateEnum
CREATE TYPE "AltitudeUnit" AS ENUM ('ft', 'm', 'km');

-- CreateEnum
CREATE TYPE "StatusEnum" AS ENUM ('SUBMITTED', 'UNDER_NTIA_INITIAL_REVIEW', 'UNDER_INITIAL_REVISION_PER_NTIA', 'UNDER_FEDERAL_AGENCIES_REVIEW', 'UNDER_NTIA_FINAL_REVIEW', 'UNDER_FINAL_REVISION_PER_NTIA', 'DENIED', 'APPROVED', 'APPROVED_WITH_CONDITIONS');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('COMMERCIAL', 'FEDERAL_AGENCY', 'NTIA');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('approve', 'finalize_denial', 'approve_with_conditions', 'concur', 'concur_with_conditions', 'not_concur', 'request_revisions', 'resubmit', 'auto_approve');

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "fcc_filing_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "mission_name" VARCHAR(50) NOT NULL,
    "name_of_licensee" VARCHAR(50) NOT NULL,
    "call_sign" VARCHAR(8) NOT NULL,
    "name_of_launch_vehicle" VARCHAR(50) NOT NULL,
    "city" VARCHAR(25) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "latitude" DECIMAL(7,4) NOT NULL,
    "longitude" DECIMAL(7,4) NOT NULL,
    "launch_datetime_primary" TIMESTAMPTZ NOT NULL,
    "launch_datetime_backup" TIMESTAMPTZ NOT NULL,
    "orbital_location" TEXT,
    "number_of_frequencies" SMALLINT NOT NULL,
    "ground_track_from_liftoff_until_payload_separation" TEXT NOT NULL,
    "ecf_cartesian_vectors_format_file_desc" TEXT NOT NULL,
    "ecf_cartesian_vectors_format_file_path" TEXT NOT NULL,
    "ground_track_of_launch_vehicle_2d_img_file_desc" TEXT NOT NULL,
    "ground_track_of_launch_vehicle_2d_img_file_path" TEXT NOT NULL,
    "primary_poc_name" VARCHAR(50) NOT NULL,
    "primary_poc_email" VARCHAR(50) NOT NULL,
    "primary_poc_phone" VARCHAR(12) NOT NULL,
    "alternate_poc_name" VARCHAR(50) NOT NULL,
    "alternate_poc_email" VARCHAR(50) NOT NULL,
    "alternate_poc_phone" VARCHAR(12) NOT NULL,
    "status" "StatusEnum" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "current_revision" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "root_request_id" INTEGER,
    "user_id" INTEGER,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frequency" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "frequency" DECIMAL(8,4) NOT NULL,
    "location_of_transmitter_on_vehicle_or_platform" "LocationEnum" NOT NULL,
    "eirp" DECIMAL(5,2) NOT NULL,
    "eirp_unit" "EirpUnit" NOT NULL,
    "transmitted_bandwidth" DECIMAL(4,2) NOT NULL,
    "transmitted_bandwidth_is_signal_filtered" "SignalFilterStatus" NOT NULL,
    "transmitted_bandwidth_justification" TEXT NOT NULL,
    "minus_3db_bandwidth" DECIMAL(4,2) NOT NULL,
    "minus_3db_bandwidth_before_or_after_filtering" "BeforeOrAfterFiltering" NOT NULL,
    "minus_20db_bandwidth" DECIMAL(4,2) NOT NULL,
    "minus_20db_bandwidth_before_or_after_filtering" "BeforeOrAfterFiltering" NOT NULL,
    "minus_60db_bandwidth" DECIMAL(4,2) NOT NULL,
    "minus_60db_bandwidth_before_or_after_filtering" "BeforeOrAfterFiltering" NOT NULL,
    "nature_of_modulating_signals" VARCHAR(50) NOT NULL,
    "emission_designator" VARCHAR(50) NOT NULL,
    "tx_transmission_start" TIMESTAMPTZ NOT NULL,
    "tx_transmission_end" TIMESTAMPTZ NOT NULL,
    "tx_antenna_type" VARCHAR(100) NOT NULL,
    "tx_antenna_gain" SMALLINT NOT NULL,
    "tx_antenna_beamwidth" SMALLINT NOT NULL,
    "tx_antenna_altitude" INTEGER NOT NULL,
    "tx_antenna_altitude_unit" "AltitudeUnit" NOT NULL,
    "receivers" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Frequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowedFrequencyRange" (
    "id" SERIAL NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AllowedFrequencyRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "date_approved" TIMESTAMPTZ NOT NULL,
    "condition" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denial" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "date_denied" TIMESTAMPTZ NOT NULL,
    "reason" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Denial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concurrence" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "concurred" BOOLEAN NOT NULL DEFAULT false,
    "conditions" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Concurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "comment" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" "ActionType" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestedRevision" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "requested_changes" TEXT[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "RequestedRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" SERIAL NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "UserType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "distribution_list_email" VARCHAR(100),

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "can_concur" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "entityA_id" INTEGER NOT NULL,
    "entityB_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "closedBy_id" INTEGER,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "inquiry_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReadStatus" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDraft" (
    "id" SERIAL NOT NULL,
    "fcc_filing_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "mission_name" VARCHAR(50),
    "name_of_licensee" VARCHAR(50),
    "call_sign" VARCHAR(8),
    "name_of_launch_vehicle" VARCHAR(50),
    "city" VARCHAR(25),
    "state" CHAR(2),
    "latitude" DECIMAL(7,4),
    "longitude" DECIMAL(7,4),
    "launch_datetime_primary" TIMESTAMPTZ,
    "launch_datetime_backup" TIMESTAMPTZ,
    "orbital_location" TEXT,
    "number_of_frequencies" SMALLINT,
    "ground_track_from_liftoff_until_payload_separation" TEXT,
    "ecf_cartesian_vectors_format_file_desc" TEXT,
    "ecf_cartesian_vectors_format_file_path" TEXT,
    "ground_track_of_launch_vehicle_2d_img_file_desc" TEXT,
    "ground_track_of_launch_vehicle_2d_img_file_path" TEXT,
    "primary_poc_name" VARCHAR(50),
    "primary_poc_email" VARCHAR(50),
    "primary_poc_phone" VARCHAR(12),
    "alternate_poc_name" VARCHAR(50),
    "alternate_poc_email" VARCHAR(50),
    "alternate_poc_phone" VARCHAR(12),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "RequestDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrequencyDraft" (
    "id" SERIAL NOT NULL,
    "request_draft_id" INTEGER NOT NULL,
    "frequency" DECIMAL(8,4),
    "location_of_transmitter_on_vehicle_or_platform" "LocationEnum",
    "eirp" DECIMAL(5,2),
    "eirp_unit" "EirpUnit",
    "transmitted_bandwidth" DECIMAL(4,2),
    "transmitted_bandwidth_is_signal_filtered" "SignalFilterStatus",
    "transmitted_bandwidth_justification" TEXT,
    "minus_3db_bandwidth" DECIMAL(4,2),
    "minus_3db_bandwidth_before_or_after_filtering" "BeforeOrAfterFiltering",
    "minus_20db_bandwidth" DECIMAL(4,2),
    "minus_20db_bandwidth_before_or_after_filtering" "BeforeOrAfterFiltering",
    "minus_60db_bandwidth" DECIMAL(4,2),
    "minus_60db_bandwidth_before_or_after_filtering" "BeforeOrAfterFiltering",
    "nature_of_modulating_signals" VARCHAR(50),
    "emission_designator" VARCHAR(50),
    "tx_transmission_start" TIMESTAMPTZ,
    "tx_transmission_end" TIMESTAMPTZ,
    "tx_antenna_type" VARCHAR(100),
    "tx_antenna_gain" SMALLINT,
    "tx_antenna_beamwidth" SMALLINT,
    "tx_antenna_altitude" INTEGER,
    "tx_antenna_altitude_unit" "AltitudeUnit",
    "receivers" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FrequencyDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityDomain" (
    "id" SERIAL NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,

    CONSTRAINT "EntityDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "user_external_id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonCondition" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CommonCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedFrequencyRange_low_high_key" ON "AllowedFrequencyRange"("low", "high");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_abbreviation_key" ON "Entity"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "User_external_id_key" ON "User"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_request_id_entityA_id_entityB_id_key" ON "Inquiry"("request_id", "entityA_id", "entityB_id");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReadStatus_message_id_user_id_key" ON "MessageReadStatus"("message_id", "user_id");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequency" ADD CONSTRAINT "Frequency_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denial" ADD CONSTRAINT "Denial_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denial" ADD CONSTRAINT "Denial_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concurrence" ADD CONSTRAINT "Concurrence_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concurrence" ADD CONSTRAINT "Concurrence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestedRevision" ADD CONSTRAINT "RequestedRevision_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestedRevision" ADD CONSTRAINT "RequestedRevision_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_entityA_id_fkey" FOREIGN KEY ("entityA_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_entityB_id_fkey" FOREIGN KEY ("entityB_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_closedBy_id_fkey" FOREIGN KEY ("closedBy_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReadStatus" ADD CONSTRAINT "MessageReadStatus_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReadStatus" ADD CONSTRAINT "MessageReadStatus_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDraft" ADD CONSTRAINT "RequestDraft_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrequencyDraft" ADD CONSTRAINT "FrequencyDraft_request_draft_id_fkey" FOREIGN KEY ("request_draft_id") REFERENCES "RequestDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityDomain" ADD CONSTRAINT "EntityDomain_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_external_id_fkey" FOREIGN KEY ("user_external_id") REFERENCES "User"("external_id") ON DELETE RESTRICT ON UPDATE CASCADE;
