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

@WebServlet("/api/equipment")
public class EquipmentServlet extends HttpServlet {

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

    // GET /api/equipment — Fetch all available equipment
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setAccessControlHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try (Connection conn = DatabaseConnection.getConnection()) {
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
}
