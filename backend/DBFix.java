import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

public class DBFix {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/ArenaHub";
        String user = "root";
        String password = "";

        String[] statements = {
                "ALTER TABLE Users ADD COLUMN Status VARCHAR(20) DEFAULT 'ACTIVE'",
                "ALTER TABLE Users ADD COLUMN AvatarURL VARCHAR(500) DEFAULT NULL",
                "ALTER TABLE Users ADD COLUMN CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP",

                "ALTER TABLE Turfs ADD COLUMN Description TEXT DEFAULT NULL",
                "ALTER TABLE Turfs ADD COLUMN ImageURL VARCHAR(500) DEFAULT NULL",
                "ALTER TABLE Turfs ADD COLUMN Location VARCHAR(255) DEFAULT NULL",
                "ALTER TABLE Turfs ADD COLUMN WeekendPriceMultiplier DECIMAL(3,2) DEFAULT 1.00",
                "ALTER TABLE Turfs ADD COLUMN MaintenanceLockStart DATE DEFAULT NULL",
                "ALTER TABLE Turfs ADD COLUMN MaintenanceLockEnd DATE DEFAULT NULL",
                "ALTER TABLE Turfs ADD COLUMN OwnerID INT DEFAULT NULL",
                "ALTER TABLE Turfs ADD COLUMN CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP",

                "ALTER TABLE Bookings ADD COLUMN Visibility ENUM('PRIVATE','PUBLIC') DEFAULT 'PRIVATE'",
                "ALTER TABLE Bookings ADD COLUMN MaxPlayers INT DEFAULT 10",
                "ALTER TABLE Bookings ADD COLUMN CurrentPlayers INT DEFAULT 1",
                "ALTER TABLE Bookings ADD COLUMN IsRecurring BOOLEAN DEFAULT FALSE",
                "ALTER TABLE Bookings ADD COLUMN RecurrenceGroupID VARCHAR(50) DEFAULT NULL",
                "ALTER TABLE Bookings ADD COLUMN DisputeStatus ENUM('NONE','OPEN','RESOLVED') DEFAULT 'NONE'",
                "ALTER TABLE Bookings ADD COLUMN DisputeReason TEXT DEFAULT NULL",
                "ALTER TABLE Bookings ADD COLUMN DisputeResolution TEXT DEFAULT NULL",

                "CREATE TABLE IF NOT EXISTS Wallets (WalletID INT AUTO_INCREMENT PRIMARY KEY, UserID INT NOT NULL UNIQUE, Balance DECIMAL(10,2) DEFAULT 0.00, Currency VARCHAR(10) DEFAULT 'PKR', UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS WalletTransactions (TransactionID INT AUTO_INCREMENT PRIMARY KEY, WalletID INT NOT NULL, Amount DECIMAL(10,2) NOT NULL, TransactionType ENUM('TOP_UP','BOOKING_PAYMENT','REFUND','EQUIPMENT_RENTAL') NOT NULL, Description VARCHAR(255) DEFAULT NULL, ReferenceID INT DEFAULT NULL, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (WalletID) REFERENCES Wallets(WalletID) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS GameParticipants (ParticipantID INT AUTO_INCREMENT PRIMARY KEY, BookingID INT NOT NULL, UserID INT NOT NULL, JoinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, Status ENUM('JOINED','LEFT','KICKED') DEFAULT 'JOINED', UNIQUE KEY unique_player_game (BookingID, UserID), FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE, FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS Reviews (ReviewID INT AUTO_INCREMENT PRIMARY KEY, UserID INT NOT NULL, TurfID INT NOT NULL, BookingID INT DEFAULT NULL, Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5), ReviewText TEXT DEFAULT NULL, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_user_turf_review (UserID, TurfID), FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE, FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS Equipment (EquipmentID INT AUTO_INCREMENT PRIMARY KEY, Name VARCHAR(100) NOT NULL, Description VARCHAR(255) DEFAULT NULL, PricePerHour DECIMAL(10,2) NOT NULL, AvailableStock INT DEFAULT 10, ImageURL VARCHAR(500) DEFAULT NULL, Status ENUM('AVAILABLE','OUT_OF_STOCK') DEFAULT 'AVAILABLE')",
                "CREATE TABLE IF NOT EXISTS EquipmentRentals (RentalID INT AUTO_INCREMENT PRIMARY KEY, BookingID INT NOT NULL, EquipmentID INT NOT NULL, Quantity INT DEFAULT 1, TotalPrice DECIMAL(10,2) NOT NULL, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE, FOREIGN KEY (EquipmentID) REFERENCES Equipment(EquipmentID) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS Subscriptions (SubscriptionID INT AUTO_INCREMENT PRIMARY KEY, UserID INT NOT NULL, TurfID INT NOT NULL, DayOfWeek ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL, StartTime TIME NOT NULL, EndTime TIME NOT NULL, StartDate DATE NOT NULL, EndDate DATE DEFAULT NULL, Status ENUM('ACTIVE','PAUSED','CANCELLED') DEFAULT 'ACTIVE', CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE, FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS PricingRules (RuleID INT AUTO_INCREMENT PRIMARY KEY, TurfID INT NOT NULL, RuleName VARCHAR(100) NOT NULL, RuleType ENUM('WEEKEND','HOLIDAY','PEAK_HOUR','CUSTOM') NOT NULL, Multiplier DECIMAL(3,2) NOT NULL, StartTime TIME DEFAULT NULL, EndTime TIME DEFAULT NULL, SpecificDate DATE DEFAULT NULL, IsActive BOOLEAN DEFAULT TRUE, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS Disputes (DisputeID INT AUTO_INCREMENT PRIMARY KEY, BookingID INT NOT NULL, RaisedByUserID INT NOT NULL, Reason TEXT NOT NULL, Status ENUM('OPEN','UNDER_REVIEW','RESOLVED','REJECTED') DEFAULT 'OPEN', Resolution TEXT DEFAULT NULL, ResolvedByAdminID INT DEFAULT NULL, RefundAmount DECIMAL(10,2) DEFAULT 0.00, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ResolvedAt TIMESTAMP NULL DEFAULT NULL, FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE, FOREIGN KEY (RaisedByUserID) REFERENCES Users(UserID) ON DELETE CASCADE, FOREIGN KEY (ResolvedByAdminID) REFERENCES Users(UserID) ON DELETE SET NULL)",

                "INSERT INTO Equipment (Name, Description, PricePerHour, AvailableStock) SELECT 'Football', 'Standard match-quality football', 200.00, 15 WHERE NOT EXISTS (SELECT 1 FROM Equipment WHERE Name='Football')",
                "INSERT INTO Equipment (Name, Description, PricePerHour, AvailableStock) SELECT 'Training Bibs', 'Colored mesh bibs', 300.00, 10 WHERE NOT EXISTS (SELECT 1 FROM Equipment WHERE Name='Training Bibs')",

                "INSERT INTO Wallets (UserID, Balance) SELECT UserID, 0.00 FROM Users WHERE UserID NOT IN (SELECT UserID FROM Wallets)"
        };

        try (Connection conn = DriverManager.getConnection(url, user, password);
                Statement stmt = conn.createStatement()) {

            for (String sql : statements) {
                try {
                    stmt.execute(sql);
                    System.out.println("Success: " + sql.substring(0, Math.min(sql.length(), 50)) + "...");
                } catch (SQLException e) {
                    System.out.println("Skipped (already exists or error): " + e.getMessage());
                }
            }
            System.out.println("Migration fix complete!");

        } catch (Exception e) {
            System.err.println("Migration fix failed: " + e.getMessage());
        }
    }
}
