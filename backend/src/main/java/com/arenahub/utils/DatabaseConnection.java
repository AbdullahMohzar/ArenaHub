package com.arenahub.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

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
    private static final String URL = "jdbc:mysql://localhost:3306/ArenaHub";
    private static final String USER = "root"; // Update as needed
    private static final String PASSWORD = "Nisar20067."; // Update as needed

    /**
     * FACTORY METHOD - Creates Connection objects
     * 
     * Design Patterns:
     * • FACTORY PATTERN: Static factory method for creating connections
     * • ABSTRACTION: Hides MySQL driver initialization from clients
     * • INDIRECTION: Intermediary between servlet layer and driver layer
     * 
     * How it works:
     * 1. Load MySQL JDBC driver
     * 2. Establish connection using credentials
     * 3. Return Connection interface (not driver-specific implementation)
     * 
     * Benefit: Servlets call this method without knowing MySQL driver details
     */
    public static Connection getConnection() throws SQLException {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("MySQL JDBC Driver not found", e);
        }
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}