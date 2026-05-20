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
 *    - Handles HTTP requests for venue reviews and ratings
 *    - Entry point for review submission and retrieval
 * 
 * ✅ INFORMATION EXPERT (GRASP):
 *    - Domain expert in review/rating operations
 *    - Knows how to store and retrieve reviews with images
 * 
 * ✅ FACADE PATTERN (GOF):
 *    - Hides complexity of file upload and image storage
 *    - Hides database operations for reviews
 *    - Clients see simple JSON API
 * 
 * ✅ STRATEGY PATTERN (GOF):
 *    - GET strategy: retrieve all reviews for a turf
 *    - POST strategy: create new review with optional images
 * 
 * ✅ TEMPLATE METHOD PATTERN (GOF):
 *    - doGet() and doPost() override HttpServlet methods
 * 
 * ✅ DECORATOR PATTERN (GOF):
 *    - @MultipartConfig enables multipart form data (file uploads)
 *    - Without modifying code, framework handles file parsing
 */

/**
 * INHERITANCE: Extends HttpServlet (parent class from javax.servlet)
 * Inherits HTTP request/response handling and servlet lifecycle capabilities
 */
@WebServlet("/api/reviews")
@MultipartConfig(fileSizeThreshold=1024*1024*2, maxFileSize=1024*1024*10, maxRequestSize=1024*1024*50)
public class ReviewServlet extends HttpServlet {

    /**
     * ENCAPSULATION: Private helper method - encapsulates file name extraction logic
     * Hides implementation details and reduces code duplication across methods
     */
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

        String turfIdStr = req.getParameter("turfId");
        if (turfIdStr == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"error\":\"turfId required\"}");
            return;
        }

        try (Connection conn = DatabaseConnection.getConnection()) {
            String sql = "SELECT r.ReviewID, r.Rating, r.ReviewText, r.CreatedAt, u.FullName " +
                         "FROM Reviews r JOIN Users u ON r.UserID = u.UserID " +
                         "WHERE r.TurfID = ? ORDER BY r.CreatedAt DESC";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setInt(1, Integer.parseInt(turfIdStr));
                try (ResultSet rs = stmt.executeQuery()) {
                    List<JsonObject> reviewList = new ArrayList<>();
                    while (rs.next()) {
                        JsonObject review = new JsonObject();
                        review.addProperty("reviewId", rs.getInt("ReviewID"));
                        review.addProperty("rating", rs.getInt("Rating"));
                        review.addProperty("reviewText", rs.getString("ReviewText"));
                        review.addProperty("createdAt", rs.getString("CreatedAt"));
                        review.addProperty("userName", rs.getString("FullName"));
                        reviewList.add(review);
                    }
                    
                    JsonArray arr = new JsonArray();
                    for (JsonObject review : reviewList) {
                        int reviewId = review.get("reviewId").getAsInt();
                        JsonArray images = new JsonArray();
                        String imgSql = "SELECT ImageURL FROM ReviewImages WHERE ReviewID = ? ORDER BY ImageID";
                        try (PreparedStatement imgStmt = conn.prepareStatement(imgSql)) {
                            imgStmt.setInt(1, reviewId);
                            try (ResultSet imgRs = imgStmt.executeQuery()) {
                                while (imgRs.next()) {
                                    images.add(imgRs.getString("ImageURL"));
                                }
                            }
                        }
                        review.add("images", images);
                        arr.add(review);
                    }
                    
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write(arr.toString());
                }
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    /**
     * UC-12: Rate a Venue
     * Allows players and captains to submit ratings and reviews for turfs
     * Supports optional image uploads for review photos
     */
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            List<String> imageUrls = new ArrayList<>();

            int userId = 0;
            int turfId = 0;
            int rating = 0;
            int bookingId = 0;
            String reviewText = "";

            if (req.getContentType() != null && req.getContentType().toLowerCase().startsWith("multipart/form-data")) {
                String uId = req.getParameter("userId");
                if (uId != null) userId = Integer.parseInt(uId);
                
                String tId = req.getParameter("turfId");
                if (tId != null) turfId = Integer.parseInt(tId);
                
                String rat = req.getParameter("rating");
                if (rat != null) rating = Integer.parseInt(rat);
                
                String bId = req.getParameter("bookingId");
                if (bId != null) bookingId = Integer.parseInt(bId);
                
                reviewText = req.getParameter("reviewText") != null ? req.getParameter("reviewText") : "";

                File uploadDir = UploadPaths.resolveUploadDir(req.getServletContext(), "reviews");
                if (!uploadDir.exists()) uploadDir.mkdirs();
                String uploadPath = uploadDir.getAbsolutePath();

                for (Part part : req.getParts()) {
                    if ("images".equals(part.getName()) && part.getSize() > 0 && part.getContentType() != null && part.getContentType().startsWith("image/")) {
                        String fileName = UUID.randomUUID().toString() + "_" + getFileName(part);
                        part.write(uploadPath + File.separator + fileName);
                        imageUrls.add(UploadPaths.resolvePublicUrl("reviews", fileName));
                    }
                }
            } else {
                try (BufferedReader reader = req.getReader()) {
                    JsonObject json = new Gson().fromJson(reader, JsonObject.class);
                    if (json != null) {
                        if (json.has("userId")) userId = json.get("userId").getAsInt();
                        if (json.has("turfId")) turfId = json.get("turfId").getAsInt();
                        if (json.has("rating")) rating = json.get("rating").getAsInt();
                        if (json.has("bookingId")) bookingId = json.get("bookingId").getAsInt();
                        if (json.has("reviewText")) reviewText = json.get("reviewText").getAsString();
                    }
                }
            }

            if (userId == 0 || turfId == 0) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"userId and turfId are required\"}");
                return;
            }

            if (rating < 1 || rating > 5) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Rating must be between 1 and 5\"}");
                return;
            }

            try (Connection conn = DatabaseConnection.getConnection()) {
                String checkSql = "SELECT ReviewID FROM Reviews WHERE UserID = ? AND TurfID = ?";
                try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                    checkStmt.setInt(1, userId);
                    checkStmt.setInt(2, turfId);
                    try (ResultSet rs = checkStmt.executeQuery()) {
                        if (rs.next()) {
                            int existingReviewId = rs.getInt("ReviewID");
                            String updateSql = "UPDATE Reviews SET Rating = ?, ReviewText = ? WHERE ReviewID = ?";
                            try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                                updateStmt.setInt(1, rating);
                                updateStmt.setString(2, reviewText);
                                updateStmt.setInt(3, existingReviewId);
                                updateStmt.executeUpdate();
                            }
                            if (!imageUrls.isEmpty()) {
                                insertReviewImages(conn, existingReviewId, imageUrls);
                            }
                            resp.setStatus(HttpServletResponse.SC_OK);
                            resp.getWriter().write("{\"message\":\"Review updated!\"}");
                            return;
                        }
                    }
                }

                String sql = "INSERT INTO Reviews (UserID, TurfID, BookingID, Rating, ReviewText) VALUES (?, ?, ?, ?, ?)";
                int newReviewId = -1;
                try (PreparedStatement stmt = conn.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                    stmt.setInt(1, userId);
                    stmt.setInt(2, turfId);
                    stmt.setInt(3, bookingId);
                    stmt.setInt(4, rating);
                    stmt.setString(5, reviewText);
                    stmt.executeUpdate();

                    try (ResultSet keys = stmt.getGeneratedKeys()) {
                        if (keys.next()) newReviewId = keys.getInt(1);
                    }
                }

                if (newReviewId > 0 && !imageUrls.isEmpty()) {
                    insertReviewImages(conn, newReviewId, imageUrls);
                }

                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write("{\"message\":\"Review submitted!\"}");
            }
        } catch (SQLException e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private void insertReviewImages(Connection conn, int reviewId, List<String> imageUrls) throws SQLException {
        String imgSql = "INSERT INTO ReviewImages (ReviewID, ImageURL) VALUES (?, ?)";
        try (PreparedStatement imgStmt = conn.prepareStatement(imgSql)) {
            for (String url : imageUrls) {
                imgStmt.setInt(1, reviewId);
                imgStmt.setString(2, url);
                imgStmt.addBatch();
            }
            imgStmt.executeBatch();
        }
    }
}
