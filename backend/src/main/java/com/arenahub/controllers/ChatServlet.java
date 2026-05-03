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

@WebServlet("/api/chat/*")
public class ChatServlet extends HttpServlet {

    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private int getAuthenticatedUserId(HttpServletRequest req) {
        Object uid = req.getAttribute("validatedUserId");
        if (uid == null) return -1;
        return Integer.parseInt(uid.toString());
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

        int userId = getAuthenticatedUserId(req);
        if (userId == -1) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"error\":\"Not authenticated\"}");
            return;
        }

        String path = req.getPathInfo();

        try (Connection conn = DatabaseConnection.getConnection()) {
            if (path == null) {
                path = "";
            }
            switch (path) {
                case "/contacts" -> handleGetContacts(conn, userId, resp);
                case "/messages" -> {
                    String contactIdStr = req.getParameter("contactId");
                    if (contactIdStr == null) {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        resp.getWriter().write("{\"error\":\"contactId is required\"}");
                        return;
                    }
                    handleGetMessages(conn, userId, contactIdStr, resp);
                }
                default -> {
                    resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    resp.getWriter().write("{\"error\":\"Unknown endpoint\"}");
                }
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // GET /api/chat/contacts — Unique conversations with last message + unread count
    private void handleGetContacts(Connection conn, int userId, HttpServletResponse resp) throws SQLException, IOException {
        String sql = 
            // 1. Direct Messages
            "SELECT CONCAT('U_', u.UserID) AS Id, u.FullName AS Name, u.UserRole AS Role, " +
            "  latest.Content AS LastMessage, latest.CreatedAt AS LastMessageTime, " +
            "  COALESCE(unread.cnt, 0) AS UnreadCount " +
            "FROM Users u " +
            "JOIN ( " +
            "  SELECT " +
            "    CASE WHEN SenderID = ? THEN ReceiverID ELSE SenderID END AS ContactID, " +
            "    MAX(MessageID) AS MaxMsgID " +
            "  FROM Messages " +
            "  WHERE (SenderID = ? OR ReceiverID = ?) AND BookingID IS NULL AND ReceiverID IS NOT NULL " +
            "  GROUP BY ContactID " +
            ") contacts ON u.UserID = contacts.ContactID " +
            "JOIN Messages latest ON latest.MessageID = contacts.MaxMsgID " +
            "LEFT JOIN ( " +
            "  SELECT SenderID, COUNT(*) AS cnt FROM Messages " +
            "  WHERE ReceiverID = ? AND IsRead = FALSE AND BookingID IS NULL " +
            "  GROUP BY SenderID " +
            ") unread ON unread.SenderID = u.UserID " +
            "UNION ALL " +
            // 2. Squad Chats
            "SELECT CONCAT('B_', b.BookingID) AS Id, CONCAT(t.Name, ' Squad') AS Name, 'SQUAD' AS Role, " +
            "  latest.Content AS LastMessage, latest.CreatedAt AS LastMessageTime, " +
            "  COALESCE(unread.cnt, 0) AS UnreadCount " +
            "FROM Bookings b " +
            "JOIN Turfs t ON b.TurfID = t.TurfID " +
            // Check if user is captain or a joined participant
            "JOIN ( " +
            "  SELECT BookingID FROM Bookings WHERE UserID = ? " +
            "  UNION " +
            "  SELECT BookingID FROM GameParticipants WHERE UserID = ? AND Status = 'JOINED' " +
            ") myGames ON b.BookingID = myGames.BookingID " +
            "JOIN ( " +
            "  SELECT BookingID, MAX(MessageID) AS MaxMsgID " +
            "  FROM Messages " +
            "  WHERE BookingID IS NOT NULL " +
            "  GROUP BY BookingID " +
            ") contacts ON b.BookingID = contacts.BookingID " +
            "JOIN Messages latest ON latest.MessageID = contacts.MaxMsgID " +
            "LEFT JOIN ( " +
            "  SELECT BookingID, COUNT(*) AS cnt FROM Messages " +
            "  WHERE BookingID IS NOT NULL AND IsRead = FALSE AND SenderID != ? " +
            "  GROUP BY BookingID " +
            ") unread ON unread.BookingID = b.BookingID " +
            "ORDER BY LastMessageTime DESC";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            // Direct messages parameters
            stmt.setInt(1, userId);
            stmt.setInt(2, userId);
            stmt.setInt(3, userId);
            stmt.setInt(4, userId);
            // Squad chats parameters
            stmt.setInt(5, userId);
            stmt.setInt(6, userId);
            stmt.setInt(7, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                JsonArray arr = new JsonArray();
                while (rs.next()) {
                    JsonObject contact = new JsonObject();
                    contact.addProperty("id", rs.getString("Id"));
                    contact.addProperty("name", rs.getString("Name"));
                    contact.addProperty("role", rs.getString("Role"));
                    contact.addProperty("lastMessage", rs.getString("LastMessage"));
                    contact.addProperty("lastMessageTime", rs.getTimestamp("LastMessageTime").toString());
                    contact.addProperty("unreadCount", rs.getInt("UnreadCount"));
                    arr.add(contact);
                }
                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write(arr.toString());
            }
        }
    }

    // GET /api/chat/messages?contactId=X — Full conversation history
    private void handleGetMessages(Connection conn, int userId, String contactIdStr, HttpServletResponse resp) throws SQLException, IOException {
        String sql;
        boolean isSquad = contactIdStr.startsWith("B_");
        int targetId = Integer.parseInt(contactIdStr.substring(2));

        if (isSquad) {
            sql = "SELECT m.MessageID, m.SenderID, m.ReceiverID, m.Content, m.CreatedAt, m.IsRead, " +
                  "  u.FullName AS SenderName, u.UserRole AS SenderRole " +
                  "FROM Messages m " +
                  "JOIN Users u ON m.SenderID = u.UserID " +
                  "WHERE m.BookingID = ? " +
                  "ORDER BY m.CreatedAt ASC";
        } else {
            sql = "SELECT m.MessageID, m.SenderID, m.ReceiverID, m.Content, m.CreatedAt, m.IsRead, " +
                  "  u.FullName AS SenderName, u.UserRole AS SenderRole " +
                  "FROM Messages m " +
                  "JOIN Users u ON m.SenderID = u.UserID " +
                  "WHERE ((m.SenderID = ? AND m.ReceiverID = ?) OR (m.SenderID = ? AND m.ReceiverID = ?)) " +
                  "  AND m.BookingID IS NULL " +
                  "ORDER BY m.CreatedAt ASC";
        }

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            if (isSquad) {
                stmt.setInt(1, targetId);
            } else {
                stmt.setInt(1, userId);
                stmt.setInt(2, targetId);
                stmt.setInt(3, targetId);
                stmt.setInt(4, userId);
            }
            try (ResultSet rs = stmt.executeQuery()) {
                JsonArray arr = new JsonArray();
                while (rs.next()) {
                    JsonObject msg = new JsonObject();
                    msg.addProperty("messageId", rs.getInt("MessageID"));
                    msg.addProperty("senderId", rs.getInt("SenderID"));
                    msg.addProperty("receiverId", rs.getInt("ReceiverID"));
                    msg.addProperty("content", rs.getString("Content"));
                    msg.addProperty("createdAt", rs.getTimestamp("CreatedAt").toString());
                    msg.addProperty("isRead", rs.getBoolean("IsRead"));
                    msg.addProperty("senderName", rs.getString("SenderName"));
                    msg.addProperty("senderRole", rs.getString("SenderRole"));
                    arr.add(msg);
                }
                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write(arr.toString());
            }
        }
    }

    // POST /api/chat/send — Send a message (Direct or Squad)
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        int userId = getAuthenticatedUserId(req);
        if (userId == -1) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"error\":\"Not authenticated\"}");
            return;
        }

        String path = req.getPathInfo();
        if (!"/send".equals(path)) {
            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        try {
            BufferedReader reader = req.getReader();
            JsonObject json = new Gson().fromJson(reader, JsonObject.class);
            String contactIdStr = json.get("contactId").getAsString();
            String content = json.get("content").getAsString();

            boolean isSquad = contactIdStr.startsWith("B_");
            int targetId = Integer.parseInt(contactIdStr.substring(2));

            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql;
                if (isSquad) {
                    sql = "INSERT INTO Messages (SenderID, BookingID, Content, IsRead) VALUES (?, ?, ?, FALSE)";
                } else {
                    sql = "INSERT INTO Messages (SenderID, ReceiverID, Content, IsRead) VALUES (?, ?, ?, FALSE)";
                }
                
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, userId);
                    stmt.setInt(2, targetId);
                    stmt.setString(3, content);
                    stmt.executeUpdate();

                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write("{\"message\":\"Message sent\"}");
                }
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // PUT /api/chat/read?contactId=X — Mark messages from contact as read
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        int userId = getAuthenticatedUserId(req);
        if (userId == -1) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"error\":\"Not authenticated\"}");
            return;
        }

        String path = req.getPathInfo();
        if (!"/read".equals(path)) {
            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        String contactIdStr = req.getParameter("contactId");
        if (contactIdStr == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"error\":\"contactId is required\"}");
            return;
        }

        boolean isSquad = contactIdStr.startsWith("B_");
        int targetId = Integer.parseInt(contactIdStr.substring(2));

        try (Connection conn = DatabaseConnection.getConnection()) {
            String sql;
            if (isSquad) {
                sql = "UPDATE Messages SET IsRead = TRUE WHERE BookingID = ? AND IsRead = FALSE AND SenderID != ?";
            } else {
                sql = "UPDATE Messages SET IsRead = TRUE WHERE SenderID = ? AND ReceiverID = ? AND IsRead = FALSE AND BookingID IS NULL";
            }
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                if (isSquad) {
                    stmt.setInt(1, targetId);
                    stmt.setInt(2, userId);
                } else {
                    stmt.setInt(1, targetId);
                    stmt.setInt(2, userId);
                }
                stmt.executeUpdate();
                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write("{\"message\":\"Messages marked as read\"}");
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
