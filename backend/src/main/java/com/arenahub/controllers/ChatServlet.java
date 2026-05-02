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
            if ("/contacts".equals(path)) {
                handleGetContacts(conn, userId, resp);
            } else if ("/messages".equals(path)) {
                String contactIdStr = req.getParameter("contactId");
                if (contactIdStr == null) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    resp.getWriter().write("{\"error\":\"contactId is required\"}");
                    return;
                }
                int contactId = Integer.parseInt(contactIdStr);
                handleGetMessages(conn, userId, contactId, resp);
            } else {
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resp.getWriter().write("{\"error\":\"Unknown endpoint\"}");
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // GET /api/chat/contacts — Unique conversations with last message + unread count
    private void handleGetContacts(Connection conn, int userId, HttpServletResponse resp) throws SQLException, IOException {
        // Step 1: Find all unique direct-message contacts
        String sql =
            "SELECT u.UserID, u.FullName, u.UserRole, " +
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
            "ORDER BY latest.CreatedAt DESC";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            stmt.setInt(2, userId);
            stmt.setInt(3, userId);
            stmt.setInt(4, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                JsonArray arr = new JsonArray();
                while (rs.next()) {
                    JsonObject contact = new JsonObject();
                    contact.addProperty("userId", rs.getInt("UserID"));
                    contact.addProperty("name", rs.getString("FullName"));
                    contact.addProperty("role", rs.getString("UserRole"));
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
    private void handleGetMessages(Connection conn, int userId, int contactId, HttpServletResponse resp) throws SQLException, IOException {
        String sql =
            "SELECT m.MessageID, m.SenderID, m.ReceiverID, m.Content, m.CreatedAt, m.IsRead, " +
            "  u.FullName AS SenderName, u.UserRole AS SenderRole " +
            "FROM Messages m " +
            "JOIN Users u ON m.SenderID = u.UserID " +
            "WHERE ((m.SenderID = ? AND m.ReceiverID = ?) OR (m.SenderID = ? AND m.ReceiverID = ?)) " +
            "  AND m.BookingID IS NULL " +
            "ORDER BY m.CreatedAt ASC";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            stmt.setInt(2, contactId);
            stmt.setInt(3, contactId);
            stmt.setInt(4, userId);
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

    // POST /api/chat/send — Send a direct message
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
            int receiverId = json.get("receiverId").getAsInt();
            String content = json.get("content").getAsString();

            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql = "INSERT INTO Messages (SenderID, ReceiverID, Content, IsRead) VALUES (?, ?, ?, FALSE)";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, userId);
                    stmt.setInt(2, receiverId);
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

        try (Connection conn = DatabaseConnection.getConnection()) {
            int contactId = Integer.parseInt(contactIdStr);
            String sql = "UPDATE Messages SET IsRead = TRUE WHERE SenderID = ? AND ReceiverID = ? AND IsRead = FALSE AND BookingID IS NULL";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setInt(1, contactId);
                stmt.setInt(2, userId);
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
