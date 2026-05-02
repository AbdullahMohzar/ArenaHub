package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.DatabaseConnection;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

@WebServlet("/api/messages")
public class MessageServlet extends HttpServlet {

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

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String bookingIdStr = req.getParameter("bookingId");
        String userId1Str = req.getParameter("userId1");
        String userId2Str = req.getParameter("userId2");

        try (Connection conn = DatabaseConnection.getConnection()) {
            JsonArray messages = new JsonArray();
            if (bookingIdStr != null) {
                // Squad Chat
                int bookingId = Integer.parseInt(bookingIdStr);
                String sql = "SELECT m.*, u.FullName as SenderName, u.UserRole as SenderRole FROM Messages m " +
                             "JOIN Users u ON m.SenderID = u.UserID " +
                             "WHERE m.BookingID = ? ORDER BY m.CreatedAt ASC";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, bookingId);
                    try (ResultSet rs = stmt.executeQuery()) {
                        while (rs.next()) {
                            JsonObject msg = new JsonObject();
                            msg.addProperty("MessageID", rs.getInt("MessageID"));
                            msg.addProperty("SenderID", rs.getInt("SenderID"));
                            msg.addProperty("SenderName", rs.getString("SenderName"));
                            msg.addProperty("SenderRole", rs.getString("SenderRole"));
                            msg.addProperty("Content", rs.getString("Content"));
                            msg.addProperty("CreatedAt", rs.getTimestamp("CreatedAt").toString());
                            messages.add(msg);
                        }
                    }
                }
            } else if (userId1Str != null && userId2Str != null) {
                // Direct Chat
                int u1 = Integer.parseInt(userId1Str);
                int u2 = Integer.parseInt(userId2Str);
                String sql = "SELECT m.*, u.FullName as SenderName, u.UserRole as SenderRole FROM Messages m " +
                             "JOIN Users u ON m.SenderID = u.UserID " +
                             "WHERE (m.SenderID = ? AND m.ReceiverID = ?) OR (m.SenderID = ? AND m.ReceiverID = ?) " +
                             "ORDER BY m.CreatedAt ASC";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, u1); stmt.setInt(2, u2);
                    stmt.setInt(3, u2); stmt.setInt(4, u1);
                    try (ResultSet rs = stmt.executeQuery()) {
                        while (rs.next()) {
                            JsonObject msg = new JsonObject();
                            msg.addProperty("MessageID", rs.getInt("MessageID"));
                            msg.addProperty("SenderID", rs.getInt("SenderID"));
                            msg.addProperty("ReceiverID", rs.getInt("ReceiverID"));
                            msg.addProperty("SenderName", rs.getString("SenderName"));
                            msg.addProperty("SenderRole", rs.getString("SenderRole"));
                            msg.addProperty("Content", rs.getString("Content"));
                            msg.addProperty("CreatedAt", rs.getTimestamp("CreatedAt").toString());
                            messages.add(msg);
                        }
                    }
                }
            } else if (req.getParameter("inboxUser") != null) {
                int uId = Integer.parseInt(req.getParameter("inboxUser"));
                String sql = "SELECT DISTINCT u.UserID, u.FullName AS Name, u.UserRole AS Role FROM Users u " +
                             "JOIN Messages m ON u.UserID = m.SenderID OR u.UserID = m.ReceiverID " +
                             "WHERE (m.SenderID = ? OR m.ReceiverID = ?) AND u.UserID != ?";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, uId); stmt.setInt(2, uId); stmt.setInt(3, uId);
                    try (ResultSet rs = stmt.executeQuery()) {
                        while (rs.next()) {
                            JsonObject user = new JsonObject();
                            user.addProperty("UserID", rs.getInt("UserID"));
                            user.addProperty("Name", rs.getString("Name"));
                            user.addProperty("Role", rs.getString("Role"));
                            messages.add(user);
                        }
                    }
                }
            } else {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Missing required parameters\"}");
                return;
            }

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(messages.toString());
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            BufferedReader reader = req.getReader();
            JsonObject json = new Gson().fromJson(reader, JsonObject.class);

            int senderId = json.get("senderId").getAsInt();
            String content = json.get("content").getAsString();
            
            Integer receiverId = json.has("receiverId") && !json.get("receiverId").isJsonNull() ? json.get("receiverId").getAsInt() : null;
            Integer bookingId = json.has("bookingId") && !json.get("bookingId").isJsonNull() ? json.get("bookingId").getAsInt() : null;

            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql = "INSERT INTO Messages (SenderID, ReceiverID, BookingID, Content) VALUES (?, ?, ?, ?)";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, senderId);
                    if (receiverId != null) stmt.setInt(2, receiverId); else stmt.setNull(2, java.sql.Types.INTEGER);
                    if (bookingId != null) stmt.setInt(3, bookingId); else stmt.setNull(3, java.sql.Types.INTEGER);
                    stmt.setString(4, content);
                    stmt.executeUpdate();

                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write("{\"message\":\"Message sent successfully!\"}");
                }
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
