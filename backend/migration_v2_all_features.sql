-- ═══════════════════════════════════════════════════════════════
-- ArenaHub — Complete Schema Migration for 15 Use Cases
-- Run against MySQL database: ArenaHub
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. ALTER EXISTING TABLES
-- ─────────────────────────────────────────────────────────────

-- Users: Add account status + wallet link + avatar
ALTER TABLE Users
  ADD COLUMN Status VARCHAR(20) DEFAULT 'ACTIVE' COMMENT 'ACTIVE | BANNED | SUSPENDED',
  ADD COLUMN AvatarURL VARCHAR(500) DEFAULT NULL,
  ADD COLUMN CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Turfs: Add description, image, location, and maintenance/dynamic pricing fields
ALTER TABLE Turfs
  ADD COLUMN Description TEXT DEFAULT NULL,
  ADD COLUMN ImageURL VARCHAR(500) DEFAULT NULL,
  ADD COLUMN Location VARCHAR(255) DEFAULT NULL,
  ADD COLUMN WeekendPriceMultiplier DECIMAL(3,2) DEFAULT 1.00 COMMENT 'e.g., 1.20 = +20% on weekends',
  ADD COLUMN MaintenanceLockStart DATE DEFAULT NULL,
  ADD COLUMN MaintenanceLockEnd DATE DEFAULT NULL,
  ADD COLUMN OwnerID INT DEFAULT NULL,
  ADD COLUMN CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Bookings: Add visibility, game slots, payment, and dispute fields
ALTER TABLE Bookings
  ADD COLUMN Visibility ENUM('PRIVATE','PUBLIC') DEFAULT 'PRIVATE' COMMENT 'Public games visible to all players',
  ADD COLUMN MaxPlayers INT DEFAULT 10 COMMENT 'Max players for public game',
  ADD COLUMN CurrentPlayers INT DEFAULT 1 COMMENT 'Current joined player count',
  ADD COLUMN IsRecurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN RecurrenceGroupID VARCHAR(50) DEFAULT NULL COMMENT 'Groups recurring weekly bookings together',
  ADD COLUMN DisputeStatus ENUM('NONE','OPEN','RESOLVED') DEFAULT 'NONE',
  ADD COLUMN DisputeReason TEXT DEFAULT NULL,
  ADD COLUMN DisputeResolution TEXT DEFAULT NULL;

-- (PaymentStatus may already exist from previous migration — safe to skip if it does)
-- ALTER TABLE Bookings ADD COLUMN PaymentStatus VARCHAR(20) DEFAULT 'PENDING';


-- ─────────────────────────────────────────────────────────────
-- 2. NEW TABLES
-- ─────────────────────────────────────────────────────────────

-- ═══ WALLETS (UC-07: Digital Wallet) ═══
CREATE TABLE IF NOT EXISTS Wallets (
  WalletID INT AUTO_INCREMENT PRIMARY KEY,
  UserID INT NOT NULL UNIQUE,
  Balance DECIMAL(10,2) DEFAULT 0.00,
  Currency VARCHAR(10) DEFAULT 'PKR',
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- ═══ WALLET TRANSACTIONS (UC-07: Top-up + Payment History) ═══
CREATE TABLE IF NOT EXISTS WalletTransactions (
  TransactionID INT AUTO_INCREMENT PRIMARY KEY,
  WalletID INT NOT NULL,
  Amount DECIMAL(10,2) NOT NULL,
  TransactionType ENUM('TOP_UP','BOOKING_PAYMENT','REFUND','EQUIPMENT_RENTAL') NOT NULL,
  Description VARCHAR(255) DEFAULT NULL,
  ReferenceID INT DEFAULT NULL COMMENT 'BookingID or EquipmentRentalID',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (WalletID) REFERENCES Wallets(WalletID) ON DELETE CASCADE
);

-- ═══ GAME PARTICIPANTS (UC-06: Join Public Game) ═══
CREATE TABLE IF NOT EXISTS GameParticipants (
  ParticipantID INT AUTO_INCREMENT PRIMARY KEY,
  BookingID INT NOT NULL COMMENT 'The public game booking',
  UserID INT NOT NULL COMMENT 'The player joining',
  JoinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Status ENUM('JOINED','LEFT','KICKED') DEFAULT 'JOINED',
  UNIQUE KEY unique_player_game (BookingID, UserID),
  FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE,
  FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- ═══ REVIEWS (UC-12: Rate a Venue) ═══
CREATE TABLE IF NOT EXISTS Reviews (
  ReviewID INT AUTO_INCREMENT PRIMARY KEY,
  UserID INT NOT NULL,
  TurfID INT NOT NULL,
  BookingID INT DEFAULT NULL COMMENT 'Optional: link to specific booking',
  Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
  ReviewText TEXT DEFAULT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_turf_review (UserID, TurfID),
  FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
  FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE
);

-- ═══ EQUIPMENT CATALOG (UC-09: Rent Equipment) ═══
CREATE TABLE IF NOT EXISTS Equipment (
  EquipmentID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(100) NOT NULL COMMENT 'e.g., Bibs, Footballs, Cones',
  Description VARCHAR(255) DEFAULT NULL,
  PricePerHour DECIMAL(10,2) NOT NULL,
  AvailableStock INT DEFAULT 10,
  ImageURL VARCHAR(500) DEFAULT NULL,
  Status ENUM('AVAILABLE','OUT_OF_STOCK') DEFAULT 'AVAILABLE'
);

-- ═══ EQUIPMENT RENTALS (UC-09: Rental during Booking) ═══
CREATE TABLE IF NOT EXISTS EquipmentRentals (
  RentalID INT AUTO_INCREMENT PRIMARY KEY,
  BookingID INT NOT NULL,
  EquipmentID INT NOT NULL,
  Quantity INT DEFAULT 1,
  TotalPrice DECIMAL(10,2) NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE,
  FOREIGN KEY (EquipmentID) REFERENCES Equipment(EquipmentID) ON DELETE CASCADE
);

-- ═══ SUBSCRIPTIONS (UC-08: Weekly Recurring Slots) ═══
CREATE TABLE IF NOT EXISTS Subscriptions (
  SubscriptionID INT AUTO_INCREMENT PRIMARY KEY,
  UserID INT NOT NULL,
  TurfID INT NOT NULL,
  DayOfWeek ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
  StartTime TIME NOT NULL,
  EndTime TIME NOT NULL,
  StartDate DATE NOT NULL COMMENT 'When the subscription begins',
  EndDate DATE DEFAULT NULL COMMENT 'NULL = indefinite',
  Status ENUM('ACTIVE','PAUSED','CANCELLED') DEFAULT 'ACTIVE',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
  FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE
);

-- ═══ PRICING RULES (UC-03: Dynamic Pricing) ═══
CREATE TABLE IF NOT EXISTS PricingRules (
  RuleID INT AUTO_INCREMENT PRIMARY KEY,
  TurfID INT NOT NULL,
  RuleName VARCHAR(100) NOT NULL COMMENT 'e.g., Weekend Surge, Holiday Premium',
  RuleType ENUM('WEEKEND','HOLIDAY','PEAK_HOUR','CUSTOM') NOT NULL,
  Multiplier DECIMAL(3,2) NOT NULL COMMENT 'e.g., 1.20 = +20%',
  StartTime TIME DEFAULT NULL COMMENT 'For peak hour rules',
  EndTime TIME DEFAULT NULL,
  SpecificDate DATE DEFAULT NULL COMMENT 'For holiday-specific pricing',
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE
);

-- ═══ DISPUTES (UC-15: Admin Dispute Resolution) ═══
CREATE TABLE IF NOT EXISTS Disputes (
  DisputeID INT AUTO_INCREMENT PRIMARY KEY,
  BookingID INT NOT NULL,
  RaisedByUserID INT NOT NULL,
  Reason TEXT NOT NULL,
  Status ENUM('OPEN','UNDER_REVIEW','RESOLVED','REJECTED') DEFAULT 'OPEN',
  Resolution TEXT DEFAULT NULL,
  ResolvedByAdminID INT DEFAULT NULL,
  RefundAmount DECIMAL(10,2) DEFAULT 0.00,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ResolvedAt TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE,
  FOREIGN KEY (RaisedByUserID) REFERENCES Users(UserID) ON DELETE CASCADE,
  FOREIGN KEY (ResolvedByAdminID) REFERENCES Users(UserID) ON DELETE SET NULL
);


-- ─────────────────────────────────────────────────────────────
-- 3. SEED DATA — Default Equipment Catalog
-- ─────────────────────────────────────────────────────────────

INSERT INTO Equipment (Name, Description, PricePerHour, AvailableStock) VALUES
  ('Football', 'Standard match-quality football', 200.00, 15),
  ('Training Bibs (Set of 10)', 'Colored mesh bibs for team identification', 300.00, 10),
  ('Cones (Set of 20)', 'Boundary and drill marker cones', 150.00, 20),
  ('Goalkeeper Gloves', 'Professional grade GK gloves', 250.00, 8),
  ('First Aid Kit', 'Basic sports first aid kit', 100.00, 5);


-- ─────────────────────────────────────────────────────────────
-- 4. AUTO-CREATE WALLETS FOR EXISTING USERS
-- ─────────────────────────────────────────────────────────────

INSERT INTO Wallets (UserID, Balance)
SELECT UserID, 0.00 FROM Users
WHERE UserID NOT IN (SELECT UserID FROM Wallets);
