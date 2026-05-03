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

@WebServlet("/api/squad/leave")
public class SquadServlet extends HttpServlet {

    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
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

                // Verify user is actually a participant in this game
                String checkParticipantSql = "SELECT ParticipantID FROM GameParticipants WHERE BookingID = ? AND UserID = ? AND Status = 'JOINED'";
                try (PreparedStatement checkParticipantStmt = conn.prepareStatement(checkParticipantSql)) {
                    checkParticipantStmt.setInt(1, bookingId);
                    checkParticipantStmt.setInt(2, userId);
                    try (ResultSet rs = checkParticipantStmt.executeQuery()) {
                        if (!rs.next()) {
                            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                            resp.getWriter().write("{\"error\":\"You are not a participant in this game\"}");
                            conn.rollback();
                            return;
                        }
                    }
                }

                // Remove Player UserID from the squad (or update to LEFT)
                String updateParticipantSql = "DELETE FROM GameParticipants WHERE BookingID = ? AND UserID = ?";
                try (PreparedStatement updateParticipantStmt = conn.prepareStatement(updateParticipantSql)) {
                    updateParticipantStmt.setInt(1, bookingId);
                    updateParticipantStmt.setInt(2, userId);
                    updateParticipantStmt.executeUpdate();
                }

                // Increment PublicSlots equivalent: CurrentPlayers needs to decrement so available slots increase.
                // The prompt says: "Increment the 'PublicSlots' count back up in the Bookings table."
                // In our schema, we have CurrentPlayers and MaxPlayers. Available slots = MaxPlayers - CurrentPlayers.
                // To "increment slots", we decrement CurrentPlayers.
                String decSql = "UPDATE Bookings SET CurrentPlayers = CurrentPlayers - 1 WHERE BookingID = ?";
                try (PreparedStatement decStmt = conn.prepareStatement(decSql)) {
                    decStmt.setInt(1, bookingId);
                    decStmt.executeUpdate();
                }

                conn.commit();
                conn.setAutoCommit(true);

                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write("{\"message\":\"Successfully left the squad!\"}");
            }
        } catch (SQLException | IOException e) {
            System.err.println("Squad leave error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Database Error: " + e.getMessage() + "\"}");
        }
    }
}