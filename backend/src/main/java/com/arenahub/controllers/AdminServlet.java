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

@WebServlet("/api/admin/*")
public class AdminServlet extends HttpServlet {

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

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String path = req.getPathInfo();
        try (Connection conn = DatabaseConnection.getConnection()) {
            
            // GET /api/admin/users
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
            }
            // GET /api/admin/disputes (Fetching CANCELLED bookings for refund)
            else if ("/disputes".equals(path)) {
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
                        b.addProperty("price", rs.getDouble("PricePerHour")); // Simplified refund logic
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
                String action = json.get("action").getAsString(); // BAN or PROMOTE_OWNER

                try (Connection conn = DatabaseConnection.getConnection()) {
                    if ("BAN".equals(action)) {
                        String sql = "UPDATE Users SET Status = 'BANNED' WHERE UserID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                            stmt.setInt(1, targetUserId);
                            stmt.executeUpdate();
                        }
                    } else if ("PROMOTE_OWNER".equals(action)) {
                        String sql = "UPDATE Users SET UserRole = 'Owner' WHERE UserID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                            stmt.setInt(1, targetUserId);
                            stmt.executeUpdate();
                        }
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
                    conn.setAutoCommit(false); // Start transaction
                    try {
                        // 1. Mark booking as REFUNDED
                        String markSql = "UPDATE Bookings SET PaymentStatus = 'REFUNDED' WHERE BookingID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(markSql)) {
                            stmt.setInt(1, bookingId);
                            stmt.executeUpdate();
                        }

                        // 2. Add to Wallet
                        String walletSql = "UPDATE Wallets SET Balance = Balance + ? WHERE UserID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(walletSql)) {
                            stmt.setDouble(1, amount);
                            stmt.setInt(2, targetUserId);
                            int rows = stmt.executeUpdate();
                            if (rows == 0) { // If wallet doesn't exist, create it
                                String createWallet = "INSERT INTO Wallets (UserID, Balance) VALUES (?, ?)";
                                try (PreparedStatement cStmt = conn.prepareStatement(createWallet)) {
                                    cStmt.setInt(1, targetUserId);
                                    cStmt.setDouble(2, amount);
                                    cStmt.executeUpdate();
                                }
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
}
