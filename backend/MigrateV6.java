import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class MigrateV6 {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/ArenaHub";
        String user = "root";
        String password = "liomessi10";

        String[] statements = {
            "CREATE TABLE IF NOT EXISTS TurfImages (" +
            "  ImageID INT AUTO_INCREMENT PRIMARY KEY," +
            "  TurfID INT NOT NULL," +
            "  ImageURL VARCHAR(500) NOT NULL," +
            "  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
            "  FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE" +
            ");",

            "INSERT INTO TurfImages (TurfID, ImageURL) " +
            "SELECT TurfID, ImageURL FROM Turfs WHERE ImageURL IS NOT NULL AND ImageURL != '';",

            "CREATE TABLE IF NOT EXISTS ReviewImages (" +
            "  ImageID INT AUTO_INCREMENT PRIMARY KEY," +
            "  ReviewID INT NOT NULL," +
            "  ImageURL VARCHAR(500) NOT NULL," +
            "  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
            "  FOREIGN KEY (ReviewID) REFERENCES Reviews(ReviewID) ON DELETE CASCADE" +
            ");"
        };

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            for (String sql : statements) {
                try {
                    stmt.execute(sql);
                    System.out.println("Success: " + sql.substring(0, Math.min(sql.length(), 50)) + "...");
                } catch (Exception e) {
                    System.out.println("Error executing: " + sql);
                    System.out.println("Reason: " + e.getMessage());
                }
            }
            System.out.println("Migration complete!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
