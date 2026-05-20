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

/**
 * GRASP & GOF DESIGN PATTERNS USED:
 * 
 * ✅ CONTROLLER PATTERN (GRASP):
 *    - Receives HTTP requests and coordinates responses
 *    - Entry point for user registration feature
 * 
 * ✅ INFORMATION EXPERT (GRASP):
 *    - This servlet is expert in user registration domain
 *    - Contains all registration-related logic
 * 
 * ✅ FACADE PATTERN (GOF):
 *    - Hides complex database operations behind simple interface
 *    - Client calls POST /api/register with JSON
 *    - Behind scenes: validation, hashing, DB insert, error handling
 * 
 * ✅ TEMPLATE METHOD PATTERN (GOF):
 *    - Extends HttpServlet which defines HTTP method template
 *    - We override doPost() for POST request handling
 *    - HttpServlet framework calls our doPost() when POST arrives
 * 
 * ✅ STRATEGY PATTERN (GOF):
 *    - doPost() is one strategy for handling /api/register
 *    - doOptions() is another strategy for CORS preflight
 * 
 * ✅ ADAPTER PATTERN (GOF):
 *    - Gson adapts JSON string to JsonObject
 *    - Servlet adapts HTTP request to internal objects
 * 
 * ✅ FACTORY PATTERN (GOF):
 *    - DatabaseConnection.getConnection() is factory
 *    - Creates Connection objects we use in doPost()
 * 
 * ✅ DECORATOR PATTERN (GOF):
 *    - @WebServlet annotation decorates class with URL mapping
 *    - Without modifying code, container knows to map "/api/register" to this servlet
 */

/**
 * INHERITANCE: Extends HttpServlet (parent class from javax.servlet)
 * This servlet inherits HTTP handling capabilities from the parent class
 */
@WebServlet("/api/register")
public class SignupServlet extends HttpServlet {

    /**
     * ENCAPSULATION: Private method - hides internal header logic from outside classes
     * Only accessible within this class, restricting direct access to implementation
     */
    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    /**
     * POLYMORPHISM: Override - provides different behavior from parent's doOptions()
     * Implements HTTP OPTIONS request handling for CORS preflight requests
     */
    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * UC-01: Register Account
     * Allows a guest user to create a new account with email, password, name, and role
     */
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

            // INTERFACE: Connection & PreparedStatement implement java.sql interfaces
            // ABSTRACTION: getConnection() hides database connection details from business logic
            try (Connection conn = DatabaseConnection.getConnection()) {
                String sql = "INSERT INTO Users (Email, PasswordHash, UserRole, FullName, Phone) VALUES (?, ?, ?, ?, ?)";
                // ABSTRACTION: PreparedStatement abstracts SQL execution and parameter binding
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