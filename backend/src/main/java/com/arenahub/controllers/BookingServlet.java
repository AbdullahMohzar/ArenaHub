package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.DatabaseConnection;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

@WebServlet("/api/bookings")
public class BookingServlet extends HttpServlet {

    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
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

        // ── BRANCH 1: Conflict Discovery API ──
        String checkConflicts = req.getParameter("checkConflicts");
        String dateStr = req.getParameter("date");
        String turfIdStr = req.getParameter("turfId");

        if ("true".equalsIgnoreCase(checkConflicts) && dateStr != null && !dateStr.isEmpty() && turfIdStr != null && !turfIdStr.isEmpty()) {
            try {
                int turfId = Integer.parseInt(turfIdStr);
                try (Connection conn = DatabaseConnection.getConnection()) {
                    String sql = "SELECT StartTime, EndTime FROM Bookings WHERE TurfID = ? AND BookingDate = ? AND Status = 'CONFIRMED' AND PaymentStatus = 'PAID'";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setInt(1, turfId);
                        stmt.setString(2, dateStr);
                        try (ResultSet rs = stmt.executeQuery()) {
                            JsonArray jsonArray = new JsonArray();
                            while (rs.next()) {
                                JsonObject timeSlot = new JsonObject();
                                timeSlot.addProperty("startTime", rs.getString("StartTime"));
                                timeSlot.addProperty("endTime", rs.getString("EndTime"));
                                jsonArray.add(timeSlot);
                            }
                            resp.setStatus(HttpServletResponse.SC_OK);
                            resp.getWriter().write(jsonArray.toString());
                            return;
                        }
                    }
                } catch (SQLException e) {
                    System.err.println("Database error fetching conflicts: " + e.getMessage());
                    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    resp.getWriter().write("{\"error\":\"Database error occurred\"}");
                    return;
                }
            } catch (NumberFormatException e) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Invalid turfId format\"}");
                return;
            }
        }

        // ── BRANCH 2: Public Games — Fetch all public confirmed bookings ──
        String publicGames = req.getParameter("publicGames");
        if ("true".equalsIgnoreCase(publicGames)) {
            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql = "SELECT b.BookingID, b.UserID, b.TurfID, b.BookingDate, b.StartTime, b.EndTime, " +
                             "b.Visibility, b.MaxPlayers, b.CurrentPlayers, b.Status, " +
                             "t.Name AS TurfName, t.SportType, t.PricePerHour, u.FullName AS HostName " +
                             "FROM Bookings b " +
                             "JOIN Turfs t ON b.TurfID = t.TurfID " +
                             "JOIN Users u ON b.UserID = u.UserID " +
                             "WHERE b.Visibility = 'PUBLIC' AND b.Status = 'CONFIRMED' " +
                             "AND b.BookingDate >= CURDATE() AND b.CurrentPlayers < b.MaxPlayers " +
                             "ORDER BY b.BookingDate, b.StartTime";
                try (PreparedStatement stmt = conn.prepareStatement(sql);
                     ResultSet rs = stmt.executeQuery()) {
                    JsonArray arr = new JsonArray();
                    while (rs.next()) {
                        JsonObject game = new JsonObject();
                        game.addProperty("BookingID", rs.getInt("BookingID"));
                        game.addProperty("HostUserID", rs.getInt("UserID"));
                        game.addProperty("HostName", rs.getString("HostName"));
                        game.addProperty("TurfID", rs.getInt("TurfID"));
                        game.addProperty("TurfName", rs.getString("TurfName"));
                        game.addProperty("SportType", rs.getString("SportType"));
                        game.addProperty("BookingDate", rs.getString("BookingDate"));
                        game.addProperty("StartTime", rs.getString("StartTime"));
                        game.addProperty("EndTime", rs.getString("EndTime"));
                        game.addProperty("MaxPlayers", rs.getInt("MaxPlayers"));
                        game.addProperty("CurrentPlayers", rs.getInt("CurrentPlayers"));
                        game.addProperty("PricePerHour", rs.getDouble("PricePerHour"));
                        arr.add(game);
                    }
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write(arr.toString());
                    return;
                }
            } catch (SQLException e) {
                System.err.println("Error fetching public games: " + e.getMessage());
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resp.getWriter().write("{\"error\":\"Database error\"}");
                return;
            }
        }

        // ── BRANCH 3: Owner's bookings or User's own bookings ──
        String userIdStr = req.getParameter("userId");
        String ownerIdStr = req.getParameter("ownerId");

        if ((userIdStr == null || userIdStr.isEmpty()) && (ownerIdStr == null || ownerIdStr.isEmpty())) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"error\":\"userId or ownerId parameter is required\"}");
            return;
        }

        try (Connection conn = DatabaseConnection.getConnection()) {
            String sql;
            int paramId;

            if (ownerIdStr != null && !ownerIdStr.isEmpty()) {
                paramId = Integer.parseInt(ownerIdStr);
                sql = "SELECT b.BookingID, b.UserID, b.TurfID, b.BookingDate, b.StartTime, b.EndTime, " +
                      "b.Status, b.PaymentStatus, b.Visibility, b.MaxPlayers, b.CurrentPlayers, " +
                      "t.Name AS TurfName, t.PricePerHour " +
                      "FROM Bookings b " +
                      "JOIN Turfs t ON b.TurfID = t.TurfID " +
                      "WHERE t.OwnerID = ? ORDER BY b.BookingDate DESC, b.StartTime";
            } else {
                paramId = Integer.parseInt(userIdStr);
                sql = "SELECT b.BookingID, b.UserID, b.TurfID, b.BookingDate, b.StartTime, b.EndTime, " +
                      "b.Status, b.PaymentStatus, b.Visibility, b.MaxPlayers, b.CurrentPlayers, " +
                      "t.Name AS TurfName, t.PricePerHour " +
                      "FROM Bookings b " +
                      "JOIN Turfs t ON b.TurfID = t.TurfID " +
                      "WHERE b.UserID = ? ORDER BY b.BookingDate DESC, b.StartTime";
            }

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setInt(1, paramId);
                try (ResultSet rs = stmt.executeQuery()) {
                    JsonArray jsonArray = new JsonArray();
                    while (rs.next()) {
                        JsonObject booking = new JsonObject();
                        booking.addProperty("BookingID", rs.getInt("BookingID"));
                        booking.addProperty("UserID", rs.getInt("UserID"));
                        booking.addProperty("TurfID", rs.getInt("TurfID"));
                        booking.addProperty("TurfName", rs.getString("TurfName"));
                        booking.addProperty("BookingDate", rs.getString("BookingDate"));
                        booking.addProperty("StartTime", rs.getString("StartTime"));
                        booking.addProperty("EndTime", rs.getString("EndTime"));
                        booking.addProperty("Status", rs.getString("Status"));
                        booking.addProperty("PaymentStatus", rs.getString("PaymentStatus"));
                        booking.addProperty("PricePerHour", rs.getDouble("PricePerHour"));
                        booking.addProperty("Visibility", rs.getString("Visibility"));
                        booking.addProperty("MaxPlayers", rs.getInt("MaxPlayers"));
                        booking.addProperty("CurrentPlayers", rs.getInt("CurrentPlayers"));
                        jsonArray.add(booking);
                    }
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write(jsonArray.toString());
                }
            }
        } catch (SQLException e) {
            System.err.println("Database error fetching bookings: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Database error occurred\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            BufferedReader reader = req.getReader();
            Gson gson = new Gson();
            JsonObject jsonRequest = gson.fromJson(reader, JsonObject.class);

            if (jsonRequest == null ||
                !jsonRequest.has("userId") ||
                !jsonRequest.has("turfId") ||
                !jsonRequest.has("bookingDate") ||
                !jsonRequest.has("startTime") ||
                !jsonRequest.has("endTime")) {

                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Missing required fields\"}");
                return;
            }

            int userId = jsonRequest.get("userId").getAsInt();
            int turfId = jsonRequest.get("turfId").getAsInt();
            String bookingDate = jsonRequest.get("bookingDate").getAsString();
            String startTime = jsonRequest.get("startTime").getAsString();
            String endTime = jsonRequest.get("endTime").getAsString();

            // Optional fields for Phase 2 (Captain features) & Defaulting Payment Status
            String visibility = jsonRequest.has("visibility") ? jsonRequest.get("visibility").getAsString() : "PRIVATE";
            int maxPlayers = jsonRequest.has("maxPlayers") ? jsonRequest.get("maxPlayers").getAsInt() : 10;
            boolean isRecurring = jsonRequest.has("isRecurring") && jsonRequest.get("isRecurring").getAsBoolean();
            JsonArray equipmentArr = jsonRequest.has("equipment") ? jsonRequest.getAsJsonArray("equipment") : null;
            String paymentStatus = "PAID"; // Assuming default PAID for now or passing it via jsonRequest.has("paymentStatus")

            // Date/Time Validation
            java.time.LocalDate bDate = java.time.LocalDate.parse(bookingDate);
            java.time.LocalTime sTime = java.time.LocalTime.parse(startTime);
            java.time.LocalTime eTime = java.time.LocalTime.parse(endTime);
            if (bDate.isBefore(java.time.LocalDate.now()) || !sTime.isBefore(eTime)) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Invalid booking date or time.\"}");
                return;
            }

            try (Connection conn = DatabaseConnection.getConnection()) {
                int totalWeeks = isRecurring ? 4 : 1;
                String recurrenceGroupId = isRecurring ? UUID.randomUUID().toString() : null;
                int successCount = 0;
                int conflictCount = 0;
                int lastBookingId = -1;

                for (int week = 0; week < totalWeeks; week++) {
                    java.time.LocalDate currentDate = bDate.plusWeeks(week);
                    String currentDateStr = currentDate.toString();

                    // Check for conflicts
                    String checkSql = "SELECT COUNT(*) FROM Bookings WHERE TurfID = ? AND BookingDate = ? AND Status = 'CONFIRMED' AND (StartTime < ? AND EndTime > ?)";
                    try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                        checkStmt.setInt(1, turfId);
                        checkStmt.setString(2, currentDateStr);
                        checkStmt.setString(3, endTime);
                        checkStmt.setString(4, startTime);

                        try (ResultSet rs = checkStmt.executeQuery()) {
                            if (rs.next() && rs.getInt(1) > 0) {
                                conflictCount++;
                                continue; // Skip this week
                            }
                        }
                    }

                    // Insert booking
                    String sql = "INSERT INTO Bookings (UserID, TurfID, BookingDate, StartTime, EndTime, Status, PaymentStatus, Visibility, MaxPlayers, CurrentPlayers, IsRecurring, RecurrenceGroupID) " +
                                 "VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, 1, ?, ?)";
                    try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                        stmt.setInt(1, userId);
                        stmt.setInt(2, turfId);
                        stmt.setString(3, currentDateStr);
                        stmt.setString(4, startTime);
                        stmt.setString(5, endTime);
                        stmt.setString(6, paymentStatus);
                        stmt.setString(7, visibility);
                        stmt.setInt(8, maxPlayers);
                        stmt.setBoolean(9, isRecurring);
                        stmt.setString(10, recurrenceGroupId);

                        int rows = stmt.executeUpdate();
                        if (rows > 0) {
                            successCount++;
                            try (ResultSet keys = stmt.getGeneratedKeys()) {
                                if (keys.next()) lastBookingId = keys.getInt(1);
                            }
                        }
                    }

                    // Insert equipment rentals (only for the first booking, or each recurring)
                    if (lastBookingId > 0 && equipmentArr != null && equipmentArr.size() > 0) {
                        for (JsonElement elem : equipmentArr) {
                            JsonObject eqItem = elem.getAsJsonObject();
                            int equipmentId = eqItem.get("equipmentId").getAsInt();
                            int quantity = eqItem.has("quantity") ? eqItem.get("quantity").getAsInt() : 1;
                            double totalPrice = eqItem.has("totalPrice") ? eqItem.get("totalPrice").getAsDouble() : 0;

                            String eqSql = "INSERT INTO EquipmentRentals (BookingID, EquipmentID, Quantity, TotalPrice) VALUES (?, ?, ?, ?)";
                            try (PreparedStatement eqStmt = conn.prepareStatement(eqSql)) {
                                eqStmt.setInt(1, lastBookingId);
                                eqStmt.setInt(2, equipmentId);
                                eqStmt.setInt(3, quantity);
                                eqStmt.setDouble(4, totalPrice);
                                eqStmt.executeUpdate();
                            }
                        }
                    }
                }

                // Response
                JsonObject jsonResponse = new JsonObject();
                if (successCount > 0) {
                    resp.setStatus(HttpServletResponse.SC_OK);
                    if (isRecurring) {
                        jsonResponse.addProperty("message", successCount + " of " + totalWeeks + " weekly bookings created!" +
                            (conflictCount > 0 ? " (" + conflictCount + " skipped due to conflicts)" : ""));
                    } else {
                        jsonResponse.addProperty("message", "Booking successful!");
                    }
                    jsonResponse.addProperty("bookingId", lastBookingId);
                } else {
                    resp.setStatus(HttpServletResponse.SC_CONFLICT);
                    jsonResponse.addProperty("error", "All time slots are already booked.");
                }
                resp.getWriter().write(jsonResponse.toString());
            }

        } catch (SQLException | IOException e) {
            System.err.println("Booking error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Database Error: " + e.getMessage() + "\"}");
        } catch (RuntimeException e) {
            System.err.println("Server error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Server Error: " + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            BufferedReader reader = req.getReader();
            Gson gson = new Gson();
            JsonObject jsonRequest = gson.fromJson(reader, JsonObject.class);

            if (jsonRequest == null || !jsonRequest.has("bookingId") || !jsonRequest.has("action")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Missing bookingId or action\"}");
                return;
            }

            int bookingId = jsonRequest.get("bookingId").getAsInt();
            String action = jsonRequest.get("action").getAsString();

            try (Connection conn = DatabaseConnection.getConnection()) {

                // ── ACTION: CANCEL ──
                if ("CANCEL".equalsIgnoreCase(action)) {
                    boolean success = false;
                    try {
                        conn.setAutoCommit(false);

                        // 1. Fetch booking details to calculate refund
                        int userId = -1;
                        double refundAmount = 0.0;
                        String status = "";
                        String fetchSql = "SELECT b.UserID, b.Status, TIMESTAMPDIFF(MINUTE, b.StartTime, b.EndTime) / 60.0 AS Duration, t.PricePerHour " +
                                          "FROM Bookings b JOIN Turfs t ON b.TurfID = t.TurfID WHERE b.BookingID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(fetchSql)) {
                            stmt.setInt(1, bookingId);
                            try (ResultSet rs = stmt.executeQuery()) {
                                if (rs.next()) {
                                    userId = rs.getInt("UserID");
                                    status = rs.getString("Status");
                                    double duration = rs.getDouble("Duration");
                                    double pricePerHour = rs.getDouble("PricePerHour");
                                    refundAmount = duration * pricePerHour;
                                }
                            }
                        }

                        if (userId != -1 && !"CANCELLED".equals(status)) {
                            // 2. Update booking status
                            String cancelSql = "UPDATE Bookings SET Status = 'CANCELLED' WHERE BookingID = ?";
                            try (PreparedStatement stmt = conn.prepareStatement(cancelSql)) {
                                stmt.setInt(1, bookingId);
                                stmt.executeUpdate();
                            }

                            // 3. Process Refund
                            String walletSql = "UPDATE Wallets SET Balance = Balance + ? WHERE UserID = ?";
                            try (PreparedStatement stmt = conn.prepareStatement(walletSql)) {
                                stmt.setDouble(1, refundAmount);
                                stmt.setInt(2, userId);
                                stmt.executeUpdate();
                            }

                            // 4. Log Wallet Transaction
                            String logSql = "INSERT INTO WalletTransactions (WalletID, TransactionType, Amount, Description) " +
                                            "SELECT WalletID, 'REFUND', ?, ? FROM Wallets WHERE UserID = ?";
                            try (PreparedStatement stmt = conn.prepareStatement(logSql)) {
                                stmt.setDouble(1, refundAmount);
                                stmt.setString(2, "Refund for cancelled booking #" + bookingId);
                                stmt.setInt(3, userId);
                                stmt.executeUpdate();
                            }

                            conn.commit();
                            success = true;
                        } else {
                            conn.rollback();
                        }
                    } catch (SQLException ex) {
                        conn.rollback();
                        throw ex;
                    } finally {
                        conn.setAutoCommit(true);
                    }

                    if (success) {
                        resp.setStatus(HttpServletResponse.SC_OK);
                        resp.getWriter().write("{\"message\":\"Booking cancelled and refunded successfully\"}");
                    } else {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        resp.getWriter().write("{\"error\":\"Could not cancel booking\"}");
                    }
                }
                
                // ── ACTION: TOGGLE_VISIBILITY ──
                else if ("TOGGLE_VISIBILITY".equalsIgnoreCase(action)) {
                    String checkSql = "SELECT Visibility FROM Bookings WHERE BookingID = ?";
                    String currentVis = null;
                    try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                        checkStmt.setInt(1, bookingId);
                        try (ResultSet rs = checkStmt.executeQuery()) {
                            if (rs.next()) currentVis = rs.getString("Visibility");
                        }
                    }
                    if (currentVis != null) {
                        String newVis = "PUBLIC".equals(currentVis) ? "PRIVATE" : "PUBLIC";
                        String sql = "UPDATE Bookings SET Visibility = ? WHERE BookingID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                            stmt.setString(1, newVis);
                            stmt.setInt(2, bookingId);
                            stmt.executeUpdate();
                            resp.setStatus(HttpServletResponse.SC_OK);
                            resp.getWriter().write("{\"message\":\"Visibility updated to " + newVis + "\"}");
                        }
                    } else {
                        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        resp.getWriter().write("{\"error\":\"Booking not found\"}");
                    }
                }

                // ── ACTION: JOIN (Player joins a public game) ──
                else if ("JOIN".equalsIgnoreCase(action)) {
                    int userId = jsonRequest.has("userId") ? jsonRequest.get("userId").getAsInt() : -1;
                    if (userId == -1) {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        resp.getWriter().write("{\"error\":\"userId required for JOIN\"}");
                        return;
                    }

                    // Verify game is public and has room
                    String checkSql = "SELECT Visibility, MaxPlayers, CurrentPlayers, UserID FROM Bookings WHERE BookingID = ? AND Status = 'CONFIRMED'";
                    try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                        checkStmt.setInt(1, bookingId);
                        try (ResultSet rs = checkStmt.executeQuery()) {
                            if (!rs.next()) {
                                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                                resp.getWriter().write("{\"error\":\"Game not found\"}");
                                return;
                            }
                            if (!"PUBLIC".equals(rs.getString("Visibility"))) {
                                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                                resp.getWriter().write("{\"error\":\"This game is not public\"}");
                                return;
                            }
                            if (rs.getInt("CurrentPlayers") >= rs.getInt("MaxPlayers")) {
                                resp.setStatus(HttpServletResponse.SC_CONFLICT);
                                resp.getWriter().write("{\"error\":\"Game is full\"}");
                                return;
                            }
                            if (rs.getInt("UserID") == userId) {
                                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                                resp.getWriter().write("{\"error\":\"You are the host of this game\"}");
                                return;
                            }
                        }
                    }

                    // Check if already joined
                    String dupSql = "SELECT ParticipantID FROM GameParticipants WHERE BookingID = ? AND UserID = ? AND Status = 'JOINED'";
                    try (PreparedStatement dupStmt = conn.prepareStatement(dupSql)) {
                        dupStmt.setInt(1, bookingId);
                        dupStmt.setInt(2, userId);
                        try (ResultSet rs = dupStmt.executeQuery()) {
                            if (rs.next()) {
                                resp.setStatus(HttpServletResponse.SC_CONFLICT);
                                resp.getWriter().write("{\"error\":\"Already joined this game\"}");
                                return;
                            }
                        }
                    }

                    // Insert participant
                    String joinSql = "INSERT INTO GameParticipants (BookingID, UserID) VALUES (?, ?)";
                    try (PreparedStatement joinStmt = conn.prepareStatement(joinSql)) {
                        joinStmt.setInt(1, bookingId);
                        joinStmt.setInt(2, userId);
                        joinStmt.executeUpdate();
                    }

                    // Increment player count
                    String incSql = "UPDATE Bookings SET CurrentPlayers = CurrentPlayers + 1 WHERE BookingID = ?";
                    try (PreparedStatement incStmt = conn.prepareStatement(incSql)) {
                        incStmt.setInt(1, bookingId);
                        incStmt.executeUpdate();
                    }

                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write("{\"message\":\"Successfully joined the game!\"}");
                }

                else {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    resp.getWriter().write("{\"error\":\"Invalid action. Use CANCEL or JOIN.\"}");
                }
            }
        } catch (SQLException | IOException e) {
            System.err.println("Booking action error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Database Error: " + e.getMessage() + "\"}");
        }
    }
}