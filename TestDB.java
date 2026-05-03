import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class TestDB {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/ArenaHub";
        String user = "root";
        String password = "liomessi10";
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT ImageURL FROM TurfImages");
            while (rs.next()) {
                System.out.println("TurfImage: " + rs.getString("ImageURL"));
            }
            rs = stmt.executeQuery("SELECT ImageURL FROM ReviewImages");
            while (rs.next()) {
                System.out.println("ReviewImage: " + rs.getString("ImageURL"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
