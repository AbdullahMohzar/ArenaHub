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
import com.google.gson.JsonObject;

@WebServlet("/api/squad/join")
public class SquadJoinServlet extends HttpServlet {

    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
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

            if (jsonRequest == null || !jsonRequest.has("bookingId") || !jsonRequest.has("userId")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Missing bookingId or userId\"}");
                return;
            }

            int bookingId = jsonRequest.get("bookingId").getAsInt();
            int userId = jsonRequest.get("userId").getAsInt();

            try (Connection conn = DatabaseConnection.getConnection()) {
                conn.setAutoCommit(false); // Atomic SQL updates

                // 1. Verify booking exists and is CONFIRMED & PAID
                String bookingSql = "SELECT Status, PaymentStatus, Visibility, MaxPlayers, CurrentPlayers FROM Bookings WHERE BookingID = ?";
                String bookingStatus = "";
                String paymentStatus = "";
                String visibility = "";
                int maxPlayers = 0;
                int currentPlayers = 0;
                
                try (PreparedStatement bookingStmt = conn.prepareStatement(bookingSql)) {
                    bookingStmt.setInt(1, bookingId);
                    try (ResultSet rs = bookingStmt.executeQuery()) {
                        if (!rs.next()) {
                            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                            resp.getWriter().write("{\"error\":\"Booking not found\"}");
                            conn.rollback();
                            return;
                        }
                        bookingStatus = rs.getString("Status");
                        paymentStatus = rs.getString("PaymentStatus");
                        visibility = rs.getString("Visibility");
                        maxPlayers = rs.getInt("MaxPlayers");
                        currentPlayers = rs.getInt("CurrentPlayers");
                    }
                }

                // 2. Verify booking is PUBLIC and CONFIRMED & PAID
                if (!"PUBLIC".equals(visibility)) {
                    resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    resp.getWriter().write("{\"error\":\"This booking is private. Only the captain can join\"}");
                    conn.rollback();
                    return;
                }
                
                if (!"CONFIRMED".equals(bookingStatus)) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    resp.getWriter().write("{\"error\":\"Booking is not confirmed\"}");
                    conn.rollback();
                    return;
                }
                
                if (!"PAID".equals(paymentStatus)) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    resp.getWriter().write("{\"error\":\"Booking payment is not completed\"}");
                    conn.rollback();
                    return;
                }

                // 3. Check if user is already in squad
                String checkParticipantSql = "SELECT ParticipantID, Status FROM GameParticipants WHERE BookingID = ? AND UserID = ?";
                try (PreparedStatement checkStmt = conn.prepareStatement(checkParticipantSql)) {
                    checkStmt.setInt(1, bookingId);
                    checkStmt.setInt(2, userId);
                    try (ResultSet rs = checkStmt.executeQuery()) {
                        if (rs.next()) {
                            String status = rs.getString("Status");
                            if ("JOINED".equals(status)) {
                                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                                resp.getWriter().write("{\"error\":\"You are already in this squad\"}");
                                conn.rollback();
                                return;
                            } else if ("LEFT".equals(status)) {
                                // User previously left, allow re-join
                                String rejoinSql = "UPDATE GameParticipants SET Status = 'JOINED' WHERE BookingID = ? AND UserID = ?";
                                try (PreparedStatement rejoinStmt = conn.prepareStatement(rejoinSql)) {
                                    rejoinStmt.setInt(1, bookingId);
                                    rejoinStmt.setInt(2, userId);
                                    rejoinStmt.executeUpdate();
                                }
                            }
                        } else {
                            // New participant
                            // 4. Verify squad has available slots
                            if (currentPlayers >= maxPlayers) {
                                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                                resp.getWriter().write("{\"error\":\"Squad is full\"}");
                                conn.rollback();
                                return;
                            }

                            // 5. Add user to GameParticipants
                            String joinSql = "INSERT INTO GameParticipants (BookingID, UserID, Status) VALUES (?, ?, 'JOINED')";
                            try (PreparedStatement joinStmt = conn.prepareStatement(joinSql)) {
                                joinStmt.setInt(1, bookingId);
                                joinStmt.setInt(2, userId);
                                joinStmt.executeUpdate();
                            }
                        }
                    }
                }

                // 6. Increment CurrentPlayers in Bookings
                String incrementSql = "UPDATE Bookings SET CurrentPlayers = CurrentPlayers + 1 WHERE BookingID = ? AND CurrentPlayers < MaxPlayers";
                try (PreparedStatement incrementStmt = conn.prepareStatement(incrementSql)) {
                    incrementStmt.setInt(1, bookingId);
                    int rowsAffected = incrementStmt.executeUpdate();
                    if (rowsAffected == 0) {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        resp.getWriter().write("{\"error\":\"Squad is now full. Could not join\"}");
                        conn.rollback();
                        return;
                    }
                }

                conn.commit();
                conn.setAutoCommit(true);

                resp.setStatus(HttpServletResponse.SC_OK);
                JsonObject response = new JsonObject();
                response.addProperty("message", "Successfully joined the squad!");
                response.addProperty("bookingId", bookingId);
                response.addProperty("newCurrentPlayers", currentPlayers + 1);
                resp.getWriter().write(response.toString());

            } catch (SQLException e) {
                try {
                    Connection conn = DatabaseConnection.getConnection();
                    conn.rollback();
                } catch (SQLException ignored) {}
                System.err.println("Squad join error: " + e.getMessage());
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resp.getWriter().write("{\"error\":\"Database Error: " + e.getMessage() + "\"}");
            }
        } catch (IOException e) {
            System.err.println("Squad join IO error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"IO Error: " + e.getMessage() + "\"}");
        }
    }
}
