package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.io.File;
import java.util.UUID;

import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.Part;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.DatabaseConnection;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

@WebServlet("/api/turfs")
@MultipartConfig(fileSizeThreshold=1024*1024*2, maxFileSize=1024*1024*10, maxRequestSize=1024*1024*50)
public class TurfServlet extends HttpServlet {

    private String getFileName(Part part) {
        for (String cd : part.getHeader("content-disposition").split(";")) {
            if (cd.trim().startsWith("filename")) {
                return cd.substring(cd.indexOf('=') + 1).trim().replace("\"", "");
            }
        }
        return "unknown";
    }

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
                params.add(Integer.valueOf(ownerIdStr));
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
                    switch (p) {
                        case String s -> stmt.setString(i + 1, s);
                        case Double d -> stmt.setDouble(i + 1, d);
                        case Integer num -> stmt.setInt(i + 1, num);
                        case null, default -> {}
                    }
                }

                try (ResultSet rs = stmt.executeQuery()) {
                    JsonArray jsonArray = new JsonArray();
                    // Collect turf IDs for batch image loading
                    java.util.List<JsonObject> turfList = new java.util.ArrayList<>();
                    while (rs.next()) {
                        JsonObject turf = new JsonObject();
                        turf.addProperty("TurfID", rs.getInt("TurfID"));
                        turf.addProperty("Name", rs.getString("Name"));
                        turf.addProperty("SportType", rs.getString("SportType"));
                        
                        double price = rs.getDouble("PricePerHour");
                        double multiplier = rs.getDouble("WeekendPriceMultiplier");
                        java.time.DayOfWeek day = java.time.LocalDate.now().getDayOfWeek();
                        if (multiplier > 1.0 && (day == java.time.DayOfWeek.SATURDAY || day == java.time.DayOfWeek.SUNDAY)) {
                            price = price * multiplier;
                        }
                        turf.addProperty("PricePerHour", price);
                        
                        turf.addProperty("Status", rs.getString("Status"));
                        turf.addProperty("AvgRating", Math.round(rs.getDouble("AvgRating") * 10.0) / 10.0);
                        turf.addProperty("ReviewCount", rs.getInt("ReviewCount"));
                        turf.addProperty("OwnerID", rs.getInt("OwnerID"));
                        turf.addProperty("Description", rs.getString("Description"));
                        turf.addProperty("ImageURL", rs.getString("ImageURL"));
                        turf.addProperty("Location", rs.getString("Location"));
                        turf.addProperty("WeekendPriceMultiplier", rs.getDouble("WeekendPriceMultiplier"));
                        turf.addProperty("MaintenanceLockStart", rs.getString("MaintenanceLockStart"));
                        turf.addProperty("MaintenanceLockEnd", rs.getString("MaintenanceLockEnd"));
                        turfList.add(turf);
                    }
                    
                    // Load gallery images for each turf
                    for (JsonObject turf : turfList) {
                        int turfId = turf.get("TurfID").getAsInt();
                        JsonArray images = new JsonArray();
                        String imgSql = "SELECT ImageURL FROM TurfImages WHERE TurfID = ? ORDER BY ImageID";
                        try (PreparedStatement imgStmt = conn.prepareStatement(imgSql)) {
                            imgStmt.setInt(1, turfId);
                            try (ResultSet imgRs = imgStmt.executeQuery()) {
                                while (imgRs.next()) {
                                    images.add(imgRs.getString("ImageURL"));
                                }
                            }
                        }
                        turf.add("images", images);
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
            int ownerId = 0;
            String name = "";
            String sportType = "Football";
            double price = 0.0;
            String location = "";
            String description = "";
            String primaryImageUrl = null;
            List<String> galleryUrls = new ArrayList<>();

            // Handle Multipart
            if (req.getContentType() != null && req.getContentType().toLowerCase().startsWith("multipart/form-data")) {
                ownerId = Integer.parseInt(req.getParameter("ownerId"));
                name = req.getParameter("name");
                sportType = req.getParameter("sportType");
                price = Double.parseDouble(req.getParameter("pricePerHour"));
                location = req.getParameter("location") != null ? req.getParameter("location") : "";
                description = req.getParameter("description") != null ? req.getParameter("description") : "";
                
                // Create upload directory
                String uploadPath = "D:/ArenaHub/uploads/turfs";
                File uploadDir = new File(uploadPath);
                if (!uploadDir.exists()) uploadDir.mkdirs();
                
                // Handle multiple image parts
                for (Part part : req.getParts()) {
                    if ("images".equals(part.getName()) && part.getSize() > 0 && part.getContentType() != null && part.getContentType().startsWith("image/")) {
                        String fileName = UUID.randomUUID().toString() + "_" + getFileName(part);
                        part.write(uploadPath + File.separator + fileName);
                        String url = "/uploads/turfs/" + fileName;
                        galleryUrls.add(url);
                        if (primaryImageUrl == null) primaryImageUrl = url;
                    }
                }
                
                // Fallback: also check for single 'image' part (backward compat)
                if (galleryUrls.isEmpty()) {
                    Part filePart = req.getPart("image");
                    if (filePart != null && filePart.getSize() > 0) {
                        String fileName = UUID.randomUUID().toString() + "_" + getFileName(filePart);
                        filePart.write(uploadPath + File.separator + fileName);
                        primaryImageUrl = "/uploads/turfs/" + fileName;
                        galleryUrls.add(primaryImageUrl);
                    }
                }
            } else {
                BufferedReader reader = req.getReader();
                JsonObject json = new Gson().fromJson(reader, JsonObject.class);
                ownerId = json.get("ownerId").getAsInt();
                name = json.get("name").getAsString();
                sportType = json.get("sportType").getAsString();
                price = json.get("pricePerHour").getAsDouble();
                location = json.has("location") ? json.get("location").getAsString() : "";
                description = json.has("description") ? json.get("description").getAsString() : "";
            }

            try (Connection conn = DatabaseConnection.getConnection()) {
                // Insert turf with RETURN_GENERATED_KEYS
                String sql = "INSERT INTO Turfs (Name, SportType, PricePerHour, OwnerID, Location, Description, ImageURL, Status) VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')";
                int newTurfId = -1;
                try (PreparedStatement stmt = conn.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                    stmt.setString(1, name);
                    stmt.setString(2, sportType);
                    stmt.setDouble(3, price);
                    stmt.setInt(4, ownerId);
                    stmt.setString(5, location);
                    stmt.setString(6, description);
                    stmt.setString(7, primaryImageUrl);
                    stmt.executeUpdate();
                    
                    try (ResultSet keys = stmt.getGeneratedKeys()) {
                        if (keys.next()) newTurfId = keys.getInt(1);
                    }
                }
                
                // Insert gallery images
                if (newTurfId > 0 && !galleryUrls.isEmpty()) {
                    String imgSql = "INSERT INTO TurfImages (TurfID, ImageURL) VALUES (?, ?)";
                    try (PreparedStatement imgStmt = conn.prepareStatement(imgSql)) {
                        for (String url : galleryUrls) {
                            imgStmt.setInt(1, newTurfId);
                            imgStmt.setString(2, url);
                            imgStmt.addBatch();
                        }
                        imgStmt.executeBatch();
                    }
                }

                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write("{\"message\":\"Venue listed successfully!\"}");
            }
        } catch (SQLException | NumberFormatException e) {
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
                } else if ("EDIT".equals(action)) {
                    String name = json.get("name").getAsString();
                    String sportType = json.get("sportType").getAsString();
                    String sql = "UPDATE Turfs SET Name = ?, SportType = ? WHERE TurfID = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setString(1, name);
                        stmt.setString(2, sportType);
                        stmt.setInt(3, turfId);
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