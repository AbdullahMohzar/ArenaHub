-- ═══════════════════════════════════════════════════
-- ArenaHub — PaymentStatus Column Migration
-- Run this ONLY if the PaymentStatus column does not
-- already exist in your Bookings table.
-- ═══════════════════════════════════════════════════

-- Step 1: Add the PaymentStatus column with default 'PENDING'
ALTER TABLE Bookings 
ADD COLUMN PaymentStatus VARCHAR(20) DEFAULT 'PENDING';

-- Step 2: Backfill — mark all existing CONFIRMED bookings as PAID
UPDATE Bookings 
SET PaymentStatus = 'PAID' 
WHERE Status = 'CONFIRMED';

-- Step 3: Verify the migration
SELECT BookingID, Status, PaymentStatus FROM Bookings LIMIT 10;
