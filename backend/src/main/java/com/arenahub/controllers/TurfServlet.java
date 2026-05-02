package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.DatabaseConnection;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

@WebServlet("/api/turfs")
public class TurfServlet extends HttpServlet {

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

    // GET /api/turfs (handles public search AND owner-specific fetching)
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        String search = req.getParameter("search");
        String sportType = req.getParameter("sportType");
        String maxPriceStr = req.getParameter("maxPrice");
        String ownerIdStr = req.getParameter("ownerId");

        try (Connection conn = DatabaseConnection.getConnection()) {
            StringBuilder sql = new StringBuilder(
                "SELECT t.*, COALESCE(AVG(r.Rating), 0) AS AvgRating, COUNT(r.ReviewID) AS ReviewCount " +
                "FROM Turfs t LEFT JOIN Reviews r ON t.TurfID = r.TurfID " +
                "WHERE 1=1"
            );
            List<Object> params = new ArrayList<>();

            if (ownerIdStr != null && !ownerIdStr.trim().isEmpty()) {
                sql.append(" AND t.OwnerID = ?");
                params.add(Integer.parseInt(ownerIdStr));
            } else {
                sql.append(" AND t.Status = 'AVAILABLE'");
            }

            if (search != null && !search.trim().isEmpty()) {
                sql.append(" AND t.Name LIKE ?");
                params.add("%" + search.trim() + "%");
            }
            if (sportType != null && !sportType.trim().isEmpty() && !"All".equalsIgnoreCase(sportType)) {
                sql.append(" AND t.SportType = ?");
                params.add(sportType.trim());
            }
            if (maxPriceStr != null && !maxPriceStr.trim().isEmpty()) {
                try {
                    double maxPrice = Double.parseDouble(maxPriceStr);
                    sql.append(" AND t.PricePerHour <= ?");
                    params.add(maxPrice);
                } catch (NumberFormatException ignored) {}
            }

            sql.append(" GROUP BY t.TurfID ORDER BY t.Name");

            try (PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
                for (int i = 0; i < params.size(); i++) {
                    Object p = params.get(i);
                    if (p instanceof String) stmt.setString(i + 1, (String) p);
                    else if (p instanceof Double) stmt.setDouble(i + 1, (Double) p);
                    else if (p instanceof Integer) stmt.setInt(i + 1, (Integer) p);
                }

                try (ResultSet rs = stmt.executeQuery()) {
                    JsonArray jsonArray = new JsonArray();
                    while (rs.next()) {
                        JsonObject turf = new JsonObject();
                        turf.addProperty("TurfID", rs.getInt("TurfID"));
                        turf.addProperty("Name", rs.getString("Name"));
                        turf.addProperty("SportType", rs.getString("SportType"));
                        turf.addProperty("PricePerHour", rs.getDouble("PricePerHour"));
                        turf.addProperty("Status", rs.getString("Status"));
                        turf.addProperty("AvgRating", Math.round(rs.getDouble("AvgRating") * 10.0) / 10.0);
                        turf.addProperty("ReviewCount", rs.getInt("ReviewCount"));
                        turf.addProperty("Description", rs.getString("Description"));
                        turf.addProperty("ImageURL", rs.getString("ImageURL"));
                        turf.addProperty("Location", rs.getString("Location"));
                        turf.addProperty("WeekendPriceMultiplier", rs.getDouble("WeekendPriceMultiplier"));
                        turf.addProperty("MaintenanceLockStart", rs.getString("MaintenanceLockStart"));
                        turf.addProperty("MaintenanceLockEnd", rs.getString("MaintenanceLockEnd"));
                        jsonArray.add(turf);
                    }
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write(jsonArray.toString());
                }
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"Database error\"}");
        }
    }

    // POST /api/turfs — List a Venue (UC-02)
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            BufferedReader reader = req.getReader();
            JsonObject json = new Gson().fromJson(reader, JsonObject.class);

            int ownerId = json.get("ownerId").getAsInt();
            String name = json.get("name").getAsString();
            String sportType = json.get("sportType").getAsString();
            double price = json.get("pricePerHour").getAsDouble();
            String location = json.has("location") ? json.get("location").getAsString() : "";
            String description = json.has("description") ? json.get("description").getAsString() : "";

            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql = "INSERT INTO Turfs (Name, SportType, PricePerHour, OwnerID, Location, Description, Status) VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE')";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, name);
                    stmt.setString(2, sportType);
                    stmt.setDouble(3, price);
                    stmt.setInt(4, ownerId);
                    stmt.setString(5, location);
                    stmt.setString(6, description);
                    stmt.executeUpdate();

                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write("{\"message\":\"Venue listed successfully!\"}");
                }
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // PUT /api/turfs — Update Pricing (UC-03) & Maintenance (UC-10)
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            BufferedReader reader = req.getReader();
            JsonObject json = new Gson().fromJson(reader, JsonObject.class);

            int turfId = json.get("turfId").getAsInt();
            String action = json.get("action").getAsString();

            try (Connection conn = DatabaseConnection.getConnection()) {
                if ("PRICING".equals(action)) {
                    double multiplier = json.get("weekendPriceMultiplier").getAsDouble();
                    String sql = "UPDATE Turfs SET WeekendPriceMultiplier = ? WHERE TurfID = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setDouble(1, multiplier);
                        stmt.setInt(2, turfId);
                        stmt.executeUpdate();
                    }
                } else if ("MAINTENANCE".equals(action)) {
                    String start = json.has("start") ? json.get("start").getAsString() : null;
                    String end = json.has("end") ? json.get("end").getAsString() : null;
                    String sql = "UPDATE Turfs SET MaintenanceLockStart = ?, MaintenanceLockEnd = ?, Status = ? WHERE TurfID = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setString(1, start);
                        stmt.setString(2, end);
                        stmt.setString(3, (start != null && end != null) ? "MAINTENANCE" : "AVAILABLE");
                        stmt.setInt(4, turfId);
                        stmt.executeUpdate();
                    }
                }

                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write("{\"message\":\"Venue updated successfully!\"}");
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}