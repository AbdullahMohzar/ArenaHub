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

@WebServlet("/api/reviews")
public class ReviewServlet extends HttpServlet {

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

    // GET /api/reviews?turfId=X — Fetch reviews for a turf
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
                    JsonArray arr = new JsonArray();
                    while (rs.next()) {
                        JsonObject review = new JsonObject();
                        review.addProperty("reviewId", rs.getInt("ReviewID"));
                        review.addProperty("rating", rs.getInt("Rating"));
                        review.addProperty("reviewText", rs.getString("ReviewText"));
                        review.addProperty("createdAt", rs.getString("CreatedAt"));
                        review.addProperty("userName", rs.getString("FullName"));
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

    // POST /api/reviews — Submit a review { userId, turfId, bookingId, rating, reviewText }
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            BufferedReader reader = req.getReader();
            Gson gson = new Gson();
            JsonObject json = gson.fromJson(reader, JsonObject.class);

            if (json == null || !json.has("userId") || !json.has("turfId") || !json.has("rating")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"userId, turfId, and rating are required\"}");
                return;
            }

            int userId = json.get("userId").getAsInt();
            int turfId = json.get("turfId").getAsInt();
            int rating = json.get("rating").getAsInt();
            int bookingId = json.has("bookingId") ? json.get("bookingId").getAsInt() : 0;
            String reviewText = json.has("reviewText") ? json.get("reviewText").getAsString() : "";

            if (rating < 1 || rating > 5) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"error\":\"Rating must be between 1 and 5\"}");
                return;
            }

            try (Connection conn = DatabaseConnection.getConnection()) {
                // Check if user already reviewed this turf
                String checkSql = "SELECT ReviewID FROM Reviews WHERE UserID = ? AND TurfID = ?";
                try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                    checkStmt.setInt(1, userId);
                    checkStmt.setInt(2, turfId);
                    try (ResultSet rs = checkStmt.executeQuery()) {
                        if (rs.next()) {
                            // Update existing review
                            String updateSql = "UPDATE Reviews SET Rating = ?, ReviewText = ? WHERE UserID = ? AND TurfID = ?";
                            try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                                updateStmt.setInt(1, rating);
                                updateStmt.setString(2, reviewText);
                                updateStmt.setInt(3, userId);
                                updateStmt.setInt(4, turfId);
                                updateStmt.executeUpdate();
                            }
                            JsonObject result = new JsonObject();
                            result.addProperty("message", "Review updated!");
                            resp.setStatus(HttpServletResponse.SC_OK);
                            resp.getWriter().write(result.toString());
                            return;
                        }
                    }
                }

                // Insert new review
                String sql = "INSERT INTO Reviews (UserID, TurfID, BookingID, Rating, ReviewText) VALUES (?, ?, ?, ?, ?)";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, userId);
                    stmt.setInt(2, turfId);
                    stmt.setInt(3, bookingId);
                    stmt.setInt(4, rating);
                    stmt.setString(5, reviewText);
                    stmt.executeUpdate();

                    JsonObject result = new JsonObject();
                    result.addProperty("message", "Review submitted!");
                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write(result.toString());
                }
            }
        } catch (SQLException e) {
            System.err.println("Review error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
