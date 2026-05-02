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
import com.google.gson.JsonObject;

@WebServlet("/api/login")
public class LoginServlet extends HttpServlet {

    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            // Read JSON Body
            BufferedReader reader = req.getReader();
            Gson gson = new Gson();
            JsonObject jsonRequest = gson.fromJson(reader, JsonObject.class);

            if (jsonRequest == null || !jsonRequest.has("email") || !jsonRequest.has("password")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                JsonObject errorResp = new JsonObject();
                errorResp.addProperty("error", "Email and password are required");
                resp.getWriter().write(errorResp.toString());
                return;
            }

            String email = jsonRequest.get("email").getAsString();
            String password = jsonRequest.get("password").getAsString();

            // Query Database
            boolean isValidUser = false;
            String role = null;
            int userId = -1;
            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql = "SELECT UserID, PasswordHash, UserRole FROM Users WHERE Email = ?";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, email);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) {
                            String storedHash = rs.getString("PasswordHash");
                            
                            // Verify the hashed password
                            if (org.mindrot.jbcrypt.BCrypt.checkpw(password, storedHash)) {
                                isValidUser = true;
                                role = rs.getString("UserRole");
                                userId = rs.getInt("UserID");
                            }
                        }
                    }
                }
            }

            // Send Response
            JsonObject jsonResponse = new JsonObject();
            if (isValidUser) {
                String token = com.arenahub.utils.JwtUtil.generateToken(userId, role);
                resp.setStatus(HttpServletResponse.SC_OK);
                jsonResponse.addProperty("message", "Login successful");
                jsonResponse.addProperty("token", token);
                jsonResponse.addProperty("role", role);
                jsonResponse.addProperty("userId", userId);
            } else {
                resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                jsonResponse.addProperty("error", "Invalid email or password");
            }
            resp.getWriter().write(jsonResponse.toString());

        } catch (SQLException | IOException e) {
            // Log the error properly
            System.err.println("Login error: " + e.getMessage());
            
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JsonObject errorResp = new JsonObject();
            errorResp.addProperty("error", "Server error occurred");
            resp.getWriter().write(errorResp.toString());
        }
    }
}