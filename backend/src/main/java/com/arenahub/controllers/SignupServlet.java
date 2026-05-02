package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.DatabaseConnection;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

@WebServlet("/api/register")
public class SignupServlet extends HttpServlet {

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
            BufferedReader reader = req.getReader();
            Gson gson = new Gson();
            JsonObject jsonRequest = gson.fromJson(reader, JsonObject.class);

            if (jsonRequest == null || !jsonRequest.has("email") || !jsonRequest.has("password") || !jsonRequest.has("name") || !jsonRequest.has("role")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                JsonObject errorResp = new JsonObject();
                errorResp.addProperty("error", "Missing required fields");
                resp.getWriter().write(errorResp.toString());
                return;
            }

            String email = jsonRequest.get("email").getAsString();
            String password = jsonRequest.get("password").getAsString(); 
            String hashedPassword = org.mindrot.jbcrypt.BCrypt.hashpw(password, org.mindrot.jbcrypt.BCrypt.gensalt());
            String name = jsonRequest.get("name").getAsString();
            String role = jsonRequest.get("role").getAsString();
            String phone = jsonRequest.has("phone") ? jsonRequest.get("phone").getAsString() : "";

            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql = "INSERT INTO Users (Email, PasswordHash, UserRole, FullName, Phone) VALUES (?, ?, ?, ?, ?)";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, email);
                    stmt.setString(2, hashedPassword);
                    stmt.setString(3, role);
                    stmt.setString(4, name);
                    stmt.setString(5, phone);
                    
                    int rowsAffected = stmt.executeUpdate();
                    if (rowsAffected > 0) {
                        resp.setStatus(HttpServletResponse.SC_OK);
                        JsonObject jsonResponse = new JsonObject();
                        jsonResponse.addProperty("message", "User registered successfully");
                        resp.getWriter().write(jsonResponse.toString());
                    } else {
                        throw new SQLException("Failed to insert user records.");
                    }
                }
            }

        } catch (SQLException | IOException e) {
            System.err.println("Registration error: " + e.getMessage());
            // e.printStackTrace(); helps see it in the Tomcat console
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JsonObject errorResp = new JsonObject();
            errorResp.addProperty("error", "DB Error: " + e.getMessage());
            resp.getWriter().write(errorResp.toString());
        }
    }
}