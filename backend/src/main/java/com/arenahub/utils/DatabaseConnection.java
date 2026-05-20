package com.arenahub.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import io.github.cdimascio.dotenv.Dotenv;

/**
 * DATABASE CONNECTION UTILITY - Design Patterns Used:
 * 
 * ✅ FACTORY PATTERN (GOF): 
 *    - Static factory method getConnection() creates Connection objects
 *    - Centralizes all connection creation logic
 *    - Future: Can be enhanced with HikariCP for connection pooling
 * 
 * ✅ INDIRECTION PATTERN (GRASP):
 *    - Acts as indirection layer between servlets and JDBC driver
 *    - Servlets don't directly interact with DriverManager
 *    - Reduces coupling: If we change database, only this class changes
 * 
 * ✅ CREATOR PATTERN (GRASP):
 *    - Responsible for creating Connection objects
 *    - Knows how to properly initialize connections
 * 
 * ✅ LOW COUPLING (GRASP):
 *    - Servlets depend on this abstraction, not on MySQL driver directly
 *    - Easy to switch databases: MySQL → PostgreSQL → Oracle
 *    - Change happens in ONE place
 */
public class DatabaseConnection {
    
    private static Dotenv loadDotenv() {
        String[] paths = {
            "../arenahub",          // When running from backend folder
            "../../arenahub",       // When running from target/tomcat
            "../../../arenahub",
            "arenahub"
        };
        
        for (String path : paths) {
            try {
                return Dotenv.configure()
                    .directory(path)
                    .filename(".env.development.local")
                    .load();
            } catch (Exception e) {
                // Ignore and try next path
            }
        }
        return Dotenv.configure().ignoreIfMissing().load();
    }

    private static final Dotenv dotenv = loadDotenv();
    
    private static final String DATABASE_URL = dotenv.get("DATABASE_URL") != null ? 
            dotenv.get("DATABASE_URL") : System.getenv("DATABASE_URL");

    /**
     * FACTORY METHOD - Creates Connection objects
     */
    public static Connection getConnection() throws SQLException {
        try {
            // Load PostgreSQL JDBC Driver instead of MySQL
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("PostgreSQL JDBC Driver not found", e);
        }
        
        if (DATABASE_URL == null || DATABASE_URL.isEmpty()) {
            throw new SQLException("DATABASE_URL environment variable is missing.");
        }
        
        try {
            java.net.URI dbUri = new java.net.URI(DATABASE_URL);
            
            String username = dbUri.getUserInfo().split(":")[0];
            String password = dbUri.getUserInfo().split(":")[1];
            
            String dbUrl = "jdbc:postgresql://" + dbUri.getHost() + ':' + 
                    (dbUri.getPort() != -1 ? dbUri.getPort() : 5432) + 
                    dbUri.getPath() + 
                    (dbUri.getQuery() != null ? "?" + dbUri.getQuery() : "");

            return DriverManager.getConnection(dbUrl, username, password);
        } catch (java.net.URISyntaxException e) {
            throw new SQLException("Unable to parse DATABASE_URL", e);
        }
    }
}