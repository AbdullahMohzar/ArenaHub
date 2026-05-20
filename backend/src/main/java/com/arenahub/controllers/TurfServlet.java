package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;

import com.arenahub.utils.DatabaseConnection;
import com.arenahub.utils.UploadPaths;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * GRASP & GOF DESIGN PATTERNS USED:
 * 
 * ✅ CONTROLLER PATTERN (GRASP):
 *    - Handles HTTP requests for turf-related operations
 *    - Coordinates between HTTP layer and database layer
 * 
 * ✅ INFORMATION EXPERT (GRASP):
 *    - Domain expert in turf operations (search, create, update, maintenance)
 *    - Only class that knows turf business logic
 * 
 * ✅ HIGH COHESION (GRASP):
 *    - All turf-related methods together (doGet, doPost, doPut, doDelete)
 *    - Not mixed with booking, payment, or other domains
 * 
 * ✅ FACADE PATTERN (GOF):
 *    - Simplifies complex turf operations
 *    - Hides: SQL joins, image handling, pricing logic, maintenance locks
 * 
 * ✅ TEMPLATE METHOD PATTERN (GOF):
 *    - doGet, doPost, doPut override HttpServlet template methods
 *    - Each method implements a specific algorithm
 * 
 * ✅ STRATEGY PATTERN (GOF):
 *    - GET strategy: search turfs by filters
 *    - POST strategy: create new turf
 *    - PUT strategy: update pricing or maintenance
 * 
 * ✅ DECORATOR PATTERN (GOF):
 *    - @WebServlet("/api/turfs") maps URL without modifying code
 *    - @MultipartConfig enables file upload without modifying code
 */

/**
 * INHERITANCE: Extends HttpServlet (parent class from javax.servlet)
 * Inherits HTTP request handling and servlet lifecycle management
 */
@WebServlet("/api/turfs")
@MultipartConfig(fileSizeThreshold=1024*1024*2, maxFileSize=1024*1024*10, maxRequestSize=1024*1024*50)
public class TurfServlet extends HttpServlet {

    /**
     * ENCAPSULATION: Private helper method - encapsulates file name extraction logic
     * Reduces code duplication and hides implementation details from other classes
     */
    private String getFileName(Part part) {
        for (String cd : part.getHeader("content-disposition").split(";")) {
            if (cd.trim().startsWith("filename")) {
                return cd.substring(cd.indexOf('=') + 1).trim().replace("\"", "");
            }
        }
        return "unknown";
    }

    /**
     * ENCAPSULATION: Private method - hides CORS header configuration from external access
     * Controls access to internal header-setting implementation
     */
    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS, DELETE");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    /**
     * POLYMORPHISM: Override - HTTP OPTIONS handler
     */
    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * UC-11: Browse and Search Venues
     * Allows players and captains to search turfs by name, sport type, and max price
     */
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
                        case Integer n -> stmt.setInt(i + 1, n);
                        default -> {}
                    }
                }

                try (ResultSet rs = stmt.executeQuery()) {
                    JsonArray jsonArray = new JsonArray();
                    List<JsonObject> turfList = new ArrayList<>();
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
            resp.getWriter().write("{\"error\":\"Database error: " + e.getMessage() + "\"}");
        }
    }

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

            if (req.getContentType() != null && req.getContentType().toLowerCase().startsWith("multipart/form-data")) {
                String oIdStr = req.getParameter("ownerId");
                if (oIdStr != null) ownerId = Integer.parseInt(oIdStr);

                name = req.getParameter("name");
                sportType = req.getParameter("sportType");

                String pStr = req.getParameter("pricePerHour");
                if (pStr != null) price = Double.parseDouble(pStr);

                location = req.getParameter("location") != null ? req.getParameter("location") : "";
                description = req.getParameter("description") != null ? req.getParameter("description") : "";

                File uploadDir = UploadPaths.resolveUploadDir(req.getServletContext(), "turfs");
                if (!uploadDir.exists()) uploadDir.mkdirs();
                String uploadPath = uploadDir.getAbsolutePath();

                for (Part part : req.getParts()) {
                    if ("images".equals(part.getName()) && part.getSize() > 0 && part.getContentType() != null && part.getContentType().startsWith("image/")) {
                        String fileName = UUID.randomUUID().toString() + "_" + getFileName(part);
                        part.write(uploadPath + File.separator + fileName);
                        String url = UploadPaths.resolvePublicUrl("turfs", fileName);
                        galleryUrls.add(url);
                        if (primaryImageUrl == null) primaryImageUrl = url;
                    }
                }

                Part singleImagePart = req.getPart("image");
                if (singleImagePart != null && singleImagePart.getSize() > 0 && singleImagePart.getContentType() != null && singleImagePart.getContentType().startsWith("image/")) {
                    String fileName = UUID.randomUUID().toString() + "_" + getFileName(singleImagePart);
                    singleImagePart.write(uploadPath + File.separator + fileName);
                    String url = UploadPaths.resolvePublicUrl("turfs", fileName);
                    galleryUrls.add(url);
                    if (primaryImageUrl == null) primaryImageUrl = url;
                }

                String action = req.getParameter("action");
                if ("FULL_UPDATE".equals(action)) {
                    int turfId = Integer.parseInt(req.getParameter("turfId"));
                    try (Connection conn = DatabaseConnection.getConnection()) {
                        handleFullUpdate(conn, turfId, name, sportType, price, location, description, galleryUrls);
                        resp.setStatus(HttpServletResponse.SC_OK);
                        resp.getWriter().write("{\"message\":\"Venue updated successfully!\"}");
                        return;
                    }
                }
            } else {
                try (BufferedReader reader = req.getReader()) {
                    JsonObject json = new Gson().fromJson(reader, JsonObject.class);
                    if (json != null) {
                        if (json.has("ownerId")) ownerId = json.get("ownerId").getAsInt();
                        name = json.has("name") ? json.get("name").getAsString() : "";
                        sportType = json.has("sportType") ? json.get("sportType").getAsString() : "Football";
                        if (json.has("pricePerHour")) price = json.get("pricePerHour").getAsDouble();
                        location = json.has("location") ? json.get("location").getAsString() : "";
                        description = json.has("description") ? json.get("description").getAsString() : "";
                    }
                }
            }

            try (Connection conn = DatabaseConnection.getConnection()) {
                String sqlInsert = "INSERT INTO Turfs (Name, SportType, PricePerHour, OwnerID, Location, Description, ImageURL, Status) VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')";
                int newTurfId = -1;
                try (PreparedStatement stmt = conn.prepareStatement(sqlInsert, java.sql.Statement.RETURN_GENERATED_KEYS)) {
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

    private void handleFullUpdate(Connection conn, int turfId, String name, String sportType, double price, String location, String description, List<String> galleryUrls) throws SQLException {
        String sql = "UPDATE Turfs SET Name = ?, SportType = ?, PricePerHour = ?, Location = ?, Description = ? WHERE TurfID = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, name);
            stmt.setString(2, sportType);
            stmt.setDouble(3, price);
            stmt.setString(4, location);
            stmt.setString(5, description);
            stmt.setInt(6, turfId);
            stmt.executeUpdate();
        }

        if (galleryUrls != null && !galleryUrls.isEmpty()) {
            String imgSql = "INSERT INTO TurfImages (TurfID, ImageURL) VALUES (?, ?)";
            try (PreparedStatement imgStmt = conn.prepareStatement(imgSql)) {
                for (String url : galleryUrls) {
                    imgStmt.setInt(1, turfId);
                    imgStmt.setString(2, url);
                    imgStmt.addBatch();
                }
                imgStmt.executeBatch();
            }
        }
    }

    /**
     * UC-03, UC-10: Set Dynamic Pricing Rules & Trigger Maintenance Lock
     * Allows turf owners to set weekend price multipliers and trigger maintenance locks
     * 
     * POLYMORPHISM: Override - doPut() for turf updates (polymorphic to other servlets)
     * INTERFACE: Connection & PreparedStatement provide database abstraction
     * ABSTRACTION: Update logic and SQL execution hidden behind interface methods
     */
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try (BufferedReader reader = req.getReader()) {
            JsonObject json = new Gson().fromJson(reader, JsonObject.class);
            if (json == null || !json.has("turfId") || !json.has("action")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"turfId and action are required\"}");
                return;
            }

            int turfId = json.get("turfId").getAsInt();
            String action = json.get("action").getAsString();

            try (Connection conn = DatabaseConnection.getConnection()) {
                switch (action) {
                    // UC-03: Dynamic Pricing - Set weekend price multiplier
                    case "PRICING" -> {
                        double multiplier = json.get("weekendPriceMultiplier").getAsDouble();
                        String sql = "UPDATE Turfs SET WeekendPriceMultiplier = ? WHERE TurfID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                            stmt.setDouble(1, multiplier);
                            stmt.setInt(2, turfId);
                            stmt.executeUpdate();
                        }
                    }
                    case "FULL_UPDATE" -> {
                        String name = json.get("name").getAsString();
                        String sportType = json.get("sportType").getAsString();
                        double price = json.get("pricePerHour").getAsDouble();
                        String location = json.get("location").getAsString();
                        String description = json.get("description").getAsString();
                        handleFullUpdate(conn, turfId, name, sportType, price, location, description, null);
                    }
                    // UC-10: Maintenance Lock - Trigger maintenance lock on turf
                    case "MAINTENANCE" -> {
                        String start = (json.has("start") && !json.get("start").isJsonNull()) ? json.get("start").getAsString() : null;
                        String end = (json.has("end") && !json.get("end").isJsonNull()) ? json.get("end").getAsString() : null;
                        String sqlMaint = "UPDATE Turfs SET MaintenanceLockStart = ?, MaintenanceLockEnd = ?, Status = ? WHERE TurfID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sqlMaint)) {
                            stmt.setString(1, start);
                            stmt.setString(2, end);
                            stmt.setString(3, (start != null && end != null) ? "MAINTENANCE" : "AVAILABLE");
                            stmt.setInt(4, turfId);
                            stmt.executeUpdate();
                        }
                    }
                    case "EDIT" -> {
                        String editName = json.get("name").getAsString();
                        String editSportType = json.get("sportType").getAsString();
                        String sqlEdit = "UPDATE Turfs SET Name = ?, SportType = ? WHERE TurfID = ?";
                        try (PreparedStatement stmt = conn.prepareStatement(sqlEdit)) {
                            stmt.setString(1, editName);
                            stmt.setString(2, editSportType);
                            stmt.setInt(3, turfId);
                            stmt.executeUpdate();
                        }
                    }
                    case "REMOVE_TURF_IMAGE" -> {
                    Object uidAttr = req.getAttribute("validatedUserId");
                    if (uidAttr == null) {
                        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        resp.getWriter().write("{\"error\":\"Unauthorized\"}");
                        return;
                    }
                    int requestUserId = Integer.parseInt(uidAttr.toString());
                    String imageUrlRaw = json.get("imageUrl").getAsString().trim();
                    String imageUrl = normalizeTurfImagePath(imageUrlRaw);

                    String ownSql = "SELECT OwnerID, ImageURL FROM Turfs WHERE TurfID = ?";
                    try (PreparedStatement ownStmt = conn.prepareStatement(ownSql)) {
                        ownStmt.setInt(1, turfId);
                        try (ResultSet ors = ownStmt.executeQuery()) {
                            if (!ors.next()) {
                                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                                resp.getWriter().write("{\"error\":\"Venue not found\"}");
                                return;
                            }
                            if (ors.getInt("OwnerID") != requestUserId) {
                                resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                resp.getWriter().write("{\"error\":\"Not allowed to edit this venue\"}");
                                return;
                            }
                        }
                    }

                    String delSql = "DELETE FROM TurfImages WHERE TurfID = ? AND ImageURL = ?";
                    try (PreparedStatement delStmt = conn.prepareStatement(delSql)) {
                        delStmt.setInt(1, turfId);
                        delStmt.setString(2, imageUrl);
                        delStmt.executeUpdate();
                    }

                    String getPrimarySql = "SELECT ImageURL FROM Turfs WHERE TurfID = ?";
                    String currentPrimary = null;
                    try (PreparedStatement gp = conn.prepareStatement(getPrimarySql)) {
                        gp.setInt(1, turfId);
                        try (ResultSet grs = gp.executeQuery()) {
                            if (grs.next()) {
                                currentPrimary = grs.getString("ImageURL");
                            }
                        }
                    }

                    if (currentPrimary != null && currentPrimary.equals(imageUrl)) {
                        String nextUrl = null;
                        String nextSql = "SELECT ImageURL FROM TurfImages WHERE TurfID = ? ORDER BY ImageID ASC LIMIT 1";
                        try (PreparedStatement ns = conn.prepareStatement(nextSql)) {
                            ns.setInt(1, turfId);
                            try (ResultSet nrs = ns.executeQuery()) {
                                if (nrs.next()) {
                                    nextUrl = nrs.getString("ImageURL");
                                }
                            }
                        }
                        String updPrim = "UPDATE Turfs SET ImageURL = ? WHERE TurfID = ?";
                        try (PreparedStatement up = conn.prepareStatement(updPrim)) {
                            up.setString(1, nextUrl);
                            up.setInt(2, turfId);
                            up.executeUpdate();
                        }
                    }

                        resp.setStatus(HttpServletResponse.SC_OK);
                        resp.getWriter().write("{\"message\":\"Image removed\"}");
                        return;
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

    private static String normalizeTurfImagePath(String raw) {
        if (raw == null || raw.isEmpty()) return "";
        String s = raw.trim();
        int uploadsIdx = s.indexOf("/uploads/");
        if (uploadsIdx >= 0) {
            return s.substring(uploadsIdx);
        }
        if (!s.startsWith("/")) {
            return "/" + s;
        }
        return s;
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        
        String turfIdStr = req.getParameter("turfId");
        if (turfIdStr == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"error\":\"Missing turfId\"}");
            return;
        }

        try (Connection conn = DatabaseConnection.getConnection()) {
            int turfId = Integer.parseInt(turfIdStr);
            
            String delImgs = "DELETE FROM TurfImages WHERE TurfID = ?";
            try (PreparedStatement stmt = conn.prepareStatement(delImgs)) {
                stmt.setInt(1, turfId);
                stmt.executeUpdate();
            }

            String delTurf = "DELETE FROM Turfs WHERE TurfID = ?";
            try (PreparedStatement stmt = conn.prepareStatement(delTurf)) {
                stmt.setInt(1, turfId);
                int deleted = stmt.executeUpdate();
                if (deleted > 0) {
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write("{\"message\":\"Venue deleted successfully\"}");
                } else {
                    resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    resp.getWriter().write("{\"error\":\"Venue not found\"}");
                }
            }
        } catch (SQLException | NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}