package com.arenahub.controllers;

import java.io.BufferedReader;
import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

@WebServlet("/api/reset-password")
public class ResetPasswordServlet extends HttpServlet {

    private void setAccessControlHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
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

            if (jsonRequest == null || !jsonRequest.has("email")) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                JsonObject errorResp = new JsonObject();
                errorResp.addProperty("error", "Email is required");
                resp.getWriter().write(errorResp.toString());
                return;
            }

            String email = jsonRequest.get("email").getAsString();
            
            // Here you would typically query the DB to see if the user exists,
            // generate a secure token, store it, and dispatch a recovery email.
            System.out.println("Processing password reset request for: " + email);

            resp.setStatus(HttpServletResponse.SC_OK);
            JsonObject jsonResponse = new JsonObject();
            jsonResponse.addProperty("message", "If an account exists, a reset link will be sent to " + email);
            resp.getWriter().write(jsonResponse.toString());

        } catch (IOException | RuntimeException e) {
            System.err.println("Reset Password error: " + e.getMessage());
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JsonObject errorResp = new JsonObject();
            errorResp.addProperty("error", "Server error occurred");
            resp.getWriter().write(errorResp.toString());
        }
    }
}