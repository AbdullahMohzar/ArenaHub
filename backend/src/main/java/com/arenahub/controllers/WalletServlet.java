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
 *    - Handles HTTP requests for wallet operations
 *    - Coordinates between HTTP requests and wallet database
 * 
 * ✅ INFORMATION EXPERT (GRASP):
 *    - Domain expert in wallet management
 *    - Knows wallet queries, top-ups, transactions
 * 
 * ✅ FACADE PATTERN (GOF):
 *    - Simplifies wallet operations
 *    - Hides: wallet creation, balance queries, transaction logging
 *    - Clients see simple JSON API, complexity hidden
 * 
 * ✅ STRATEGY PATTERN (GOF):
 *    - GET strategy: retrieve wallet balance and transaction history
 *    - POST strategy: top-up wallet with new funds
 *    - Each request type handled differently
 * 
 * ✅ TEMPLATE METHOD PATTERN (GOF):
 *    - doGet() implements wallet retrieval algorithm
 *    - doPost() implements top-up algorithm
 * 
 * ✅ ADAPTER PATTERN (GOF):
 *    - Adapts JSON request to wallet operations
 *    - Adapts wallet data to JSON response format
 */

/**
 * INHERITANCE: Extends HttpServlet (parent class from javax.servlet)
 * Inherits HTTP request handling capabilities and lifecycle management
 */
@WebServlet("/api/wallet")
public class WalletServlet extends HttpServlet {

    /**
     * ENCAPSULATION: Private method - hides CORS header configuration logic
     * Restricts access to internal header setup, maintaining information hiding principle
     */
    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * UC-07: Top Up Digital Wallet
     * Allows individual players and team captains to view wallet balance and transaction history
     */
    // GET /api/wallet?userId=X — Fetch wallet balance
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String userIdStr = req.getParameter("userId");
        if (userIdStr == null || userIdStr.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            JsonObject err = new JsonObject();
            err.addProperty("error", "userId is required");
            resp.getWriter().write(err.toString());
            return;
        }

        int userId;
        try { userId = Integer.parseInt(userIdStr); }
        catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"error\":\"Invalid userId\"}");
            return;
        }

        try (Connection conn = DatabaseConnection.getConnection()) {
            // Try to fetch existing wallet
            String sql = "SELECT WalletID, Balance, Currency FROM Wallets WHERE UserID = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setInt(1, userId);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        JsonObject wallet = new JsonObject();
                        wallet.addProperty("walletId", rs.getInt("WalletID"));
                        wallet.addProperty("balance", rs.getDouble("Balance"));
                        // Fetch transactions
                        JsonArray transactions = new JsonArray();
                        String txnSql = "SELECT TransactionID, Amount, TransactionType, Description, CreatedAt FROM WalletTransactions WHERE WalletID = ? ORDER BY CreatedAt DESC LIMIT 50";
                        try (PreparedStatement txnStmt = conn.prepareStatement(txnSql)) {
                            txnStmt.setInt(1, rs.getInt("WalletID"));
                            try (ResultSet txnRs = txnStmt.executeQuery()) {
                                while (txnRs.next()) {
                                    JsonObject t = new JsonObject();
                                    t.addProperty("id", txnRs.getInt("TransactionID"));
                                    t.addProperty("amount", txnRs.getDouble("Amount"));
                                    t.addProperty("type", txnRs.getString("TransactionType"));
                                    t.addProperty("description", txnRs.getString("Description"));
                                    t.addProperty("date", txnRs.getString("CreatedAt"));
                                    transactions.add(t);
                                }
                            }
                        }
                        wallet.add("transactions", transactions);

                        resp.setStatus(HttpServletResponse.SC_OK);
                        resp.getWriter().write(wallet.toString());
                    } else {
                        // Auto-create wallet if it doesn't exist
                        String insertSql = "INSERT INTO Wallets (UserID, Balance) VALUES (?, 0.00)";
                        try (PreparedStatement insertStmt = conn.prepareStatement(insertSql, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                            insertStmt.setInt(1, userId);
                            insertStmt.executeUpdate();
                            try (ResultSet keys = insertStmt.getGeneratedKeys()) {
                                JsonObject wallet = new JsonObject();
                                wallet.addProperty("walletId", keys.next() ? keys.getInt(1) : 0);
                                wallet.addProperty("balance", 0.00);
                                wallet.addProperty("currency", "PKR");
                                wallet.add("transactions", new JsonArray());
                                resp.setStatus(HttpServletResponse.SC_OK);
                                resp.getWriter().write(wallet.toString());
                            }
                        }
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("Wallet fetch error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Database error\"}");
        }
    }

    /**
     * UC-07: Top Up Digital Wallet
     * POST endpoint to add funds to user's wallet
     */
    // POST /api/wallet — Top up wallet { userId, amount }
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            BufferedReader reader = req.getReader();
            Gson gson = new Gson();
            JsonObject json = gson.fromJson(reader, JsonObject.class);

            if (json == null || !json.has("userId") || !json.has("amount")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"userId and amount required\"}");
                return;
            }

            int userId = json.get("userId").getAsInt();
            double amount = json.get("amount").getAsDouble();

            if (amount <= 0) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Amount must be positive\"}");
                return;
            }

            try (Connection conn = DatabaseConnection.getConnection()) {
                // Ensure wallet exists
                String checkSql = "SELECT WalletID FROM Wallets WHERE UserID = ?";
                int walletId = -1;
                try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                    checkStmt.setInt(1, userId);
                    try (ResultSet rs = checkStmt.executeQuery()) {
                        if (rs.next()) {
                            walletId = rs.getInt("WalletID");
                        }
                    }
                }

                if (walletId == -1) {
                    // Create wallet
                    String createSql = "INSERT INTO Wallets (UserID, Balance) VALUES (?, ?)";
                    try (PreparedStatement createStmt = conn.prepareStatement(createSql, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                        createStmt.setInt(1, userId);
                        createStmt.setDouble(2, amount);
                        createStmt.executeUpdate();
                        try (ResultSet keys = createStmt.getGeneratedKeys()) {
                            if (keys.next()) walletId = keys.getInt(1);
                        }
                    }
                } else {
                    // Update balance
                    String updateSql = "UPDATE Wallets SET Balance = Balance + ? WHERE WalletID = ?";
                    try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                        updateStmt.setDouble(1, amount);
                        updateStmt.setInt(2, walletId);
                        updateStmt.executeUpdate();
                    }
                }

                // Record transaction
                String txnSql = "INSERT INTO WalletTransactions (WalletID, Amount, TransactionType, Description) VALUES (?, ?, 'TOP_UP', ?)";
                try (PreparedStatement txnStmt = conn.prepareStatement(txnSql)) {
                    txnStmt.setInt(1, walletId);
                    txnStmt.setDouble(2, amount);
                    txnStmt.setString(3, "Wallet top-up of Rs. " + (int) amount);
                    txnStmt.executeUpdate();
                }

                // Fetch new balance
                String balSql = "SELECT Balance FROM Wallets WHERE WalletID = ?";
                try (PreparedStatement balStmt = conn.prepareStatement(balSql)) {
                    balStmt.setInt(1, walletId);
                    try (ResultSet rs = balStmt.executeQuery()) {
                        if (rs.next()) {
                            JsonObject result = new JsonObject();
                            result.addProperty("message", "Top-up successful!");
                            result.addProperty("newBalance", rs.getDouble("Balance"));
                            resp.setStatus(HttpServletResponse.SC_OK);
                            resp.getWriter().write(result.toString());
                        }
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("Wallet top-up error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Database error: " + e.getMessage() + "\"}");
        }
    }
}
