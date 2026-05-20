package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.DatabaseConnection;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * GRASP & GOF DESIGN PATTERNS USED:
 * 
 * ✅ CONTROLLER PATTERN (GRASP):
 *    - Handles HTTP requests for admin operations
 *    - Entry point for system administrator actions
 * 
 * ✅ INFORMATION EXPERT (GRASP):
 *    - Domain expert in admin management (users, disputes, refunds)
 *    - Only class handling administrative business logic
 * 
 * ✅ FACADE PATTERN (GOF):
 *    - Simplifies complex admin operations
 *    - Hides: user queries, dispute resolution, refund processing
 * 
 * ✅ STRATEGY PATTERN (GOF):
 *    - GET /users strategy: list all users
 *    - GET /disputes strategy: list booking disputes
 *    - PUT /users strategy: BAN, UNBAN, PROMOTE_OWNER users
 *    - POST /refund strategy: process refunds for disputed bookings
 * 
 * ✅ TEMPLATE METHOD PATTERN (GOF):
 *    - doGet() handles query operations
 *    - doPut() handles user management
 *    - doPost() handles refund transactions
 * 
 * ✅ PROTECTED VARIATIONS (GRASP):\n *    - Central place for all admin operations
 *    - Easy to audit admin actions by checking this servlet
 */

/**
 * INHERITANCE: Extends HttpServlet (parent class from javax.servlet)
 * Inherits HTTP request/response handling and servlet lifecycle management
 */
@WebServlet("/api/admin/*")
public class AdminServlet extends HttpServlet {

    /**
     * ENCAPSULATION: Private method - hides CORS header configuration from outside access
     * Maintains information hiding by restricting header setup implementation details
     */
    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * UC-14: Manage User Accounts - GET /users & UC-15: Resolve Booking Dispute - GET /disputes
     * Allows system administrators to view users and disputed bookings
     * 
     * POLYMORPHISM: Override - doGet() for admin dashboard data retrieval
     * INTERFACE: Connection & PreparedStatement abstract database operations
     * ABSTRACTION: Admin queries hidden behind JDBC interfaces
     */
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String path = req.getPathInfo();
        if (path == null) path = "";

        try (Connection conn = DatabaseConnection.getConnection()) {
            // UC-14: List all users for admin management
            if ("/users".equals(path)) {
                String sql = "SELECT UserID, FullName, Email, UserRole, Status, CreatedAt FROM Users ORDER BY CreatedAt DESC";
                try (PreparedStatement stmt = conn.prepareStatement(sql);
                     ResultSet rs = stmt.executeQuery()) {
                    JsonArray arr = new JsonArray();
                    while (rs.next()) {
                        JsonObject u = new JsonObject();
                        u.addProperty("userId", rs.getInt("UserID"));
                        u.addProperty("name", rs.getString("FullName"));
                        u.addProperty("email", rs.getString("Email"));
                        u.addProperty("role", rs.getString("UserRole"));
                        u.addProperty("status", rs.getString("Status"));
                        u.addProperty("createdAt", rs.getString("CreatedAt"));
                        arr.add(u);
                    }
                    resp.getWriter().write(arr.toString());
                }
            // UC-15: List all disputed bookings (cancelled but payment was paid)
            } else if ("/disputes".equals(path)) {
                String sql = "SELECT b.BookingID, b.UserID, b.BookingDate, b.Status, b.PaymentStatus, t.Name AS TurfName, t.PricePerHour, u.FullName " +
                             "FROM Bookings b " +
                             "JOIN Turfs t ON b.TurfID = t.TurfID " +
                             "JOIN Users u ON b.UserID = u.UserID " +
                             "WHERE b.Status = 'CANCELLED' AND b.PaymentStatus = 'PAID' " +
                             "ORDER BY b.BookingDate DESC";
                try (PreparedStatement stmt = conn.prepareStatement(sql);
                     ResultSet rs = stmt.executeQuery()) {
                    JsonArray arr = new JsonArray();
                    while (rs.next()) {
                        JsonObject b = new JsonObject();
                        b.addProperty("bookingId", rs.getInt("BookingID"));
                        b.addProperty("userId", rs.getInt("UserID"));
                        b.addProperty("userName", rs.getString("FullName"));
                        b.addProperty("turfName", rs.getString("TurfName"));
                        b.addProperty("date", rs.getString("BookingDate"));
                        b.addProperty("price", rs.getDouble("PricePerHour"));
                        arr.add(b);
                    }
                    resp.getWriter().write(arr.toString());
                }
            } else {
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    /**
     * UC-14: Manage User Accounts - PUT /users
     * Allows system administrators to perform BAN, UNBAN, PROMOTE_OWNER actions
     * 
     * POLYMORPHISM: Override - doPut() for admin user management actions
     * INTERFACE: Connection & PreparedStatement provide database abstraction
     * ABSTRACTION: Admin update operations hidden behind SQL interface
     */
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String path = req.getPathInfo();
        if ("/users".equals(path)) {
            try {
                BufferedReader reader = req.getReader();
                JsonObject json = new Gson().fromJson(reader, JsonObject.class);
                int targetUserId = json.get("userId").getAsInt();
                String action = json.get("action").getAsString().trim().toUpperCase();

                try (Connection conn = DatabaseConnection.getConnection()) {
                    int updatedRows = 0;
                    // UC-14: User management actions - BAN, UNBAN, PROMOTE_OWNER
                    if ("BAN".equals(action)) {
                        String sql = "UPDATE Users SET Status = 'BANNED' WHERE UserID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                            stmt.setInt(1, targetUserId);
                            updatedRows = stmt.executeUpdate();
                        }
                    } else if ("UNBAN".equals(action)) {
                        String sql = "UPDATE Users SET Status = 'ACTIVE' WHERE UserID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                            stmt.setInt(1, targetUserId);
                            updatedRows = stmt.executeUpdate();
                        }
                    } else if ("PROMOTE_OWNER".equals(action)) {
                        String sql = "UPDATE Users SET UserRole = 'Owner' WHERE UserID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                            stmt.setInt(1, targetUserId);
                            updatedRows = stmt.executeUpdate();
                        }
                    } else {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        resp.getWriter().write("{\"error\":\"Unsupported admin action\"}");
                        return;
                    }

                    if (updatedRows == 0) {
                        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        resp.getWriter().write("{\"error\":\"User not found\"}");
                        return;
                    }
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write("{\"message\":\"User updated successfully!\"}");
                }
            } catch (SQLException e) {
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    /**
     * UC-15: Resolve Booking Dispute - POST /refund
     * Allows system administrators to process refunds for disputed bookings
     * Updates booking payment status to REFUNDED and credits user wallet
     * 
     * POLYMORPHISM: Override - doPost() for refund transaction processing
     * INTERFACE: Connection interface abstracts database transaction management
     * ABSTRACTION: Transaction logic and refund processing hidden behind interface
     */
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String path = req.getPathInfo();
        if ("/refund".equals(path)) {
            try {
                BufferedReader reader = req.getReader();
                JsonObject json = new Gson().fromJson(reader, JsonObject.class);
                int bookingId = json.get("bookingId").getAsInt();
                int targetUserId = json.get("userId").getAsInt();
                double amount = json.get("amount").getAsDouble();

                try (Connection conn = DatabaseConnection.getConnection()) {
                    conn.setAutoCommit(false);
                    try {
                        ensureWalletTransactionTypes(conn);

                        int ownerId = -1;
                        String ownerSql = "SELECT t.OwnerID FROM Bookings b JOIN Turfs t ON b.TurfID = t.TurfID WHERE b.BookingID = ?";
                        try (PreparedStatement ownerStmt = conn.prepareStatement(ownerSql)) {
                            ownerStmt.setInt(1, bookingId);
                            try (ResultSet rs = ownerStmt.executeQuery()) {
                                if (rs.next()) {
                                    ownerId = rs.getInt("OwnerID");
                                }
                            }
                        }

                        String markSql = "UPDATE Bookings SET PaymentStatus = 'REFUNDED' WHERE BookingID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(markSql)) {
                            stmt.setInt(1, bookingId);
                            stmt.executeUpdate();
                        }

                        String walletSql = "UPDATE Wallets SET Balance = Balance + ? WHERE UserID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(walletSql)) {
                            stmt.setDouble(1, amount);
                            stmt.setInt(2, targetUserId);
                            int rows = stmt.executeUpdate();
                            if (rows == 0) {
                                String createWallet = "INSERT INTO Wallets (UserID, Balance) VALUES (?, ?)";
                                try (PreparedStatement cStmt = conn.prepareStatement(createWallet)) {
                                    cStmt.setInt(1, targetUserId);
                                    cStmt.setDouble(2, amount);
                                    cStmt.executeUpdate();
                                }
                            }
                        }

                        String txnSql = "INSERT INTO WalletTransactions (WalletID, TransactionType, Amount, Description) " +
                                        "SELECT WalletID, 'REFUND', ?, ? FROM Wallets WHERE UserID = ?";
                        try (PreparedStatement txnStmt = conn.prepareStatement(txnSql)) {
                            txnStmt.setDouble(1, amount);
                            txnStmt.setString(2, "Admin refund for booking #" + bookingId);
                            txnStmt.setInt(3, targetUserId);
                            txnStmt.executeUpdate();
                        }

                        if (ownerId > 0) {
                            String ownerWalletSql = "UPDATE Wallets SET Balance = Balance - ? WHERE UserID = ?";
                            try (PreparedStatement ownerStmt = conn.prepareStatement(ownerWalletSql)) {
                                ownerStmt.setDouble(1, amount);
                                ownerStmt.setInt(2, ownerId);
                                ownerStmt.executeUpdate();
                            }

                            String ownerTxnSql = "INSERT INTO WalletTransactions (WalletID, TransactionType, Amount, Description) " +
                                                 "SELECT WalletID, 'REFUND_REVERSAL', ?, ? FROM Wallets WHERE UserID = ?";
                            try (PreparedStatement ownerTxnStmt = conn.prepareStatement(ownerTxnSql)) {
                                ownerTxnStmt.setDouble(1, amount);
                                ownerTxnStmt.setString(2, "Refund reversal for booking #" + bookingId);
                                ownerTxnStmt.setInt(3, ownerId);
                                ownerTxnStmt.executeUpdate();
                            }
                        }

                        conn.commit();
                        resp.setStatus(HttpServletResponse.SC_OK);
                        resp.getWriter().write("{\"message\":\"Refund processed successfully!\"}");
                    } catch (SQLException ex) {
                        conn.rollback();
                        throw ex;
                    } finally {
                        conn.setAutoCommit(true);
                    }
                }
            } catch (SQLException e) {
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    private void ensureWalletTransactionTypes(Connection conn) throws SQLException {
        String alterSql = "ALTER TABLE WalletTransactions MODIFY COLUMN TransactionType ENUM('TOP_UP','BOOKING_PAYMENT','REFUND','EQUIPMENT_RENTAL','BOOKING_EARNING','REFUND_REVERSAL') NOT NULL";
        try (PreparedStatement stmt = conn.prepareStatement(alterSql)) {
            stmt.executeUpdate();
        }
    }
}
