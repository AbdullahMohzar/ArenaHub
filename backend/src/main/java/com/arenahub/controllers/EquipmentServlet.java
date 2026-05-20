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
 * INHERITANCE: Extends HttpServlet (parent class from javax.servlet)
 * Inherits HTTP request handling and servlet lifecycle management
 * 
 * GRASP & GOF DESIGN PATTERNS USED:
 * 
 * ✅ CONTROLLER PATTERN (GRASP):
 *    - Handles HTTP requests for equipment rental management
 *    - Entry point for equipment browsing and availability
 * 
 * ✅ INFORMATION EXPERT (GRASP):
 *    - Domain expert in equipment availability and pricing
 *    - Knows all equipment options and stock information
 * 
 * ✅ FACADE PATTERN (GOF):
 *    - Simplifies equipment discovery
 *    - Hides: seeding logic, pricing queries, stock management
 *    - Clients see simple equipment list with pricing
 * 
 * ✅ STRATEGY PATTERN (GOF):
 *    - GET strategy: retrieve all equipment with pricing
 *    - Supports lazy initialization of default equipment
 * 
 * ✅ TEMPLATE METHOD PATTERN (GOF):
 *    - doGet() implements equipment retrieval algorithm
 *    - doPost() would implement equipment management
 * 
 * ✅ PROTECTED VARIATIONS (GRASP):
 *    - seedDefaultEquipment() protected against equipment changes
 *    - Equipment once created remains consistent
 */
@WebServlet("/api/equipment")
public class EquipmentServlet extends HttpServlet {

    /**
     * ENCAPSULATION: Private method - hides CORS header configuration logic
     * Restricts direct access to internal header-setting implementation
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
     * UC-09: Rent Equipment
     * Allows captains and players to browse and rent equipment for turf bookings
     * 
     * POLYMORPHISM: Override - doGet() for equipment listing
     * INTERFACE: Connection & PreparedStatement provide database abstraction
     * ABSTRACTION: Equipment query logic hidden behind SQL interface
     */
    // GET /api/equipment — Fetch all available equipment
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        // INTERFACE: Connection interface abstracts database connection
        // ABSTRACTION: getConnection() hides connection pool and driver implementation
        try (Connection conn = DatabaseConnection.getConnection()) {
            seedDefaultEquipment(conn);

            String sql = "SELECT EquipmentID, Name, Description, PricePerHour, AvailableStock FROM Equipment WHERE Status = 'AVAILABLE'";
            try (PreparedStatement stmt = conn.prepareStatement(sql);
                 ResultSet rs = stmt.executeQuery()) {
                JsonArray arr = new JsonArray();
                while (rs.next()) {
                    JsonObject eq = new JsonObject();
                    eq.addProperty("equipmentId", rs.getInt("EquipmentID"));
                    eq.addProperty("name", rs.getString("Name"));
                    eq.addProperty("description", rs.getString("Description"));
                    eq.addProperty("pricePerHour", rs.getDouble("PricePerHour"));
                    eq.addProperty("availableStock", rs.getInt("AvailableStock"));
                    arr.add(eq);
                }
                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write(arr.toString());
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private void seedDefaultEquipment(Connection conn) throws SQLException {
        Object[][] defaults = new Object[][] {
            {"Football", "Standard match-quality football", 200.00, 15},
            {"Training Bibs (Set of 10)", "Colored mesh bibs for team identification", 300.00, 10},
            {"Cones (Set of 20)", "Boundary and drill marker cones", 150.00, 20},
            {"Goalkeeper Gloves", "Professional grade GK gloves", 250.00, 8},
            {"First Aid Kit", "Basic sports first aid kit", 100.00, 5},
            {"Agility Ladder", "Speed and footwork training ladder", 180.00, 12},
            {"Shin Guards", "Lightweight protective shin guards", 220.00, 14}
        };

        String checkSql = "SELECT 1 FROM Equipment WHERE Name = ? LIMIT 1";
        String insertSql = "INSERT INTO Equipment (Name, Description, PricePerHour, AvailableStock) VALUES (?, ?, ?, ?)";

        for (Object[] item : defaults) {
            try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                checkStmt.setString(1, (String) item[0]);
                try (ResultSet rs = checkStmt.executeQuery()) {
                    if (rs.next()) {
                        continue;
                    }
                }
            }

            try (PreparedStatement insertStmt = conn.prepareStatement(insertSql)) {
                insertStmt.setString(1, (String) item[0]);
                insertStmt.setString(2, (String) item[1]);
                insertStmt.setDouble(3, (Double) item[2]);
                insertStmt.setInt(4, (Integer) item[3]);
                insertStmt.executeUpdate();
            }
        }
    }
}
