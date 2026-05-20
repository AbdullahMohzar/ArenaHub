package com.arenahub.controllers;

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
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * GRASP & GOF DESIGN PATTERNS USED:
 * 
 * ✅ CONTROLLER PATTERN (GRASP):
 *    - Handles HTTP requests for booking calendar display
 *    - Coordinates between turf owner requests and booking database
 * 
 * ✅ INFORMATION EXPERT (GRASP):
 *    - Domain expert in turf owner booking queries
 *    - Knows how to fetch bookings specific to an owner
 * 
 * ✅ FACADE PATTERN (GOF):
 *    - Simplifies booking calendar display
 *    - Hides: complex SQL joins, date filtering, status aggregation
 *    - Owners see simple calendar view, complexity hidden
 * 
 * ✅ STRATEGY PATTERN (GOF):
 *    - GET strategy: fetch all bookings for a specific turf owner
 *    - Filters by userId parameter to ensure access control
 * 
 * ✅ TEMPLATE METHOD PATTERN (GOF):
 *    - doGet() implements booking retrieval algorithm
 * 
 * ✅ PROTECTED VARIATIONS (GRASP):
 *    - Admin authentication ensures only authorized access
 *    - Single place for all calendar operations
 */

/**
 * INHERITANCE: Extends HttpServlet (parent class from javax.servlet)
 * Inherits HTTP request handling and servlet lifecycle capabilities
 */
@WebServlet("/api/admin/bookings")
public class AdminBookingServlet extends HttpServlet {

    /**
     * ENCAPSULATION: Private method - hides CORS header configuration from external access
     * Maintains information hiding by keeping header setup details internal
     */
    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * UC-13: View Booking Calendar
     * Allows turf owners to view all bookings for their turfs
     * 
     * POLYMORPHISM: Override - doGet() for booking calendar display
     * INTERFACE: Connection & PreparedStatement provide JDBC abstraction
     * ABSTRACTION: Calendar query logic hidden behind SQL interface
     */
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String userIdStr = req.getParameter("userId");
        if (userIdStr == null || userIdStr.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            JsonObject errorResp = new JsonObject();
            errorResp.addProperty("error", "userId parameter is required");
            resp.getWriter().write(errorResp.toString());
            return;
        }

        int userId;
        try {
            userId = Integer.parseInt(userIdStr);
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            JsonObject errorResp = new JsonObject();
            errorResp.addProperty("error", "Invalid userId format");
            resp.getWriter().write(errorResp.toString());
            return;
        }

        try (Connection conn = DatabaseConnection.getConnection()) {
            // First, verify the user is actually an ADMIN
            String roleSql = "SELECT UserRole FROM Users WHERE UserID = ?";
            boolean isAdmin = false;
            try (PreparedStatement roleStmt = conn.prepareStatement(roleSql)) {
                roleStmt.setInt(1, userId);
                try (ResultSet rs = roleStmt.executeQuery()) {
                    if (rs.next()) {
                        String role = rs.getString("UserRole");
                        if ("ADMIN".equals(role)) {
                            isAdmin = true;
                        }
                    }
                }
            }

            if (!isAdmin) {
                resp.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403 Forbidden
                JsonObject errorResp = new JsonObject();
                errorResp.addProperty("error", "Access Denied. You do not have admin privileges.");
                resp.getWriter().write(errorResp.toString());
                return;
            }

            // If verified, fetch all bookings joined with Users and Turfs
            String sql = "SELECT b.BookingID, u.Email, t.Name AS TurfName, b.BookingDate, b.StartTime, b.EndTime, b.Status " +
                         "FROM Bookings b " +
                         "JOIN Users u ON b.UserID = u.UserID " +
                         "JOIN Turfs t ON b.TurfID = t.TurfID " +
                         "ORDER BY b.BookingDate DESC, b.StartTime DESC";
                         
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                try (ResultSet rs = stmt.executeQuery()) {
                    JsonArray jsonArray = new JsonArray();
                    while (rs.next()) {
                        JsonObject booking = new JsonObject();
                        booking.addProperty("BookingID", rs.getInt("BookingID"));
                        booking.addProperty("Email", rs.getString("Email"));
                        booking.addProperty("TurfName", rs.getString("TurfName"));
                        booking.addProperty("BookingDate", rs.getString("BookingDate"));
                        booking.addProperty("StartTime", rs.getString("StartTime"));
                        booking.addProperty("EndTime", rs.getString("EndTime"));
                        booking.addProperty("Status", rs.getString("Status"));
                        jsonArray.add(booking);
                    }
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write(jsonArray.toString());
                }
            }
        } catch (SQLException e) {
            System.err.println("Admin booking error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JsonObject errorResp = new JsonObject();
            errorResp.addProperty("error", "Database error occurred");
            resp.getWriter().write(errorResp.toString());
        }
    }
}