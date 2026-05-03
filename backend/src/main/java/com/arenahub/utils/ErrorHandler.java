package com.arenahub.utils;

import java.io.IOException;
import java.sql.SQLException;

import javax.servlet.http.HttpServletResponse;

/**
 * Centralized error and success response handling
 */
public class ErrorHandler {
  
  /**
   * Send error response in JSON format
   */
  public static void sendError(HttpServletResponse resp, int status, String message) throws IOException {
    resp.setStatus(status);
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    resp.getWriter().write("{\"error\":\"" + escapeJson(message) + "\"}");
  }
  
  /**
   * Send success response in JSON format
   */
  public static void sendSuccess(HttpServletResponse resp, int status, String message) throws IOException {
    resp.setStatus(status);
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    resp.getWriter().write("{\"message\":\"" + escapeJson(message) + "\"}");
  }
  
  /**
   * Send custom JSON response
   */
  public static void sendJson(HttpServletResponse resp, int status, String json) throws IOException {
    resp.setStatus(status);
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    resp.getWriter().write(json);
  }
  
  /**
   * Handle common database errors
   */
  public static void handleDatabaseError(HttpServletResponse resp, SQLException e) throws IOException {
    String msg = e.getMessage().toLowerCase();
    
    if (msg.contains("duplicate")) {
      sendError(resp, HttpServletResponse.SC_CONFLICT, "This resource already exists");
    } else if (msg.contains("foreign key")) {
      sendError(resp, HttpServletResponse.SC_BAD_REQUEST, "Invalid reference - resource not found");
    } else if (msg.contains("constraint")) {
      sendError(resp, HttpServletResponse.SC_BAD_REQUEST, "Data validation failed - constraint violated");
    } else if (msg.contains("timeout")) {
      sendError(resp, HttpServletResponse.SC_REQUEST_TIMEOUT, "Database request timed out");
    } else {
      sendError(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error occurred");
    }
  }
  
  /**
   * Handle validation errors
   */
  public static void sendValidationError(HttpServletResponse resp, String field, String reason) throws IOException {
    sendError(resp, HttpServletResponse.SC_BAD_REQUEST, field + ": " + reason);
  }
  
  /**
   * Handle unauthorized access
   */
  public static void sendUnauthorized(HttpServletResponse resp, String reason) throws IOException {
    sendError(resp, HttpServletResponse.SC_UNAUTHORIZED, reason != null ? reason : "Unauthorized");
  }
  
  /**
   * Handle forbidden access
   */
  public static void sendForbidden(HttpServletResponse resp, String reason) throws IOException {
    sendError(resp, HttpServletResponse.SC_FORBIDDEN, reason != null ? reason : "Forbidden");
  }
  
  /**
   * Handle rate limit exceeded
   */
  public static void sendRateLimited(HttpServletResponse resp, long resetTimeMs) throws IOException {
    resp.setStatus(429); // HTTP 429 Too Many Requests
    resp.setHeader("Retry-After", String.valueOf((resetTimeMs + 999) / 1000)); // Round up to seconds
    sendError(resp, 429, "Rate limited - please try again later");
  }
  
  /**
   * Handle not found
   */
  public static void sendNotFound(HttpServletResponse resp, String resource) throws IOException {
    sendError(resp, HttpServletResponse.SC_NOT_FOUND, resource + " not found");
  }
  
  /**
   * Handle bad request
   */
  public static void sendBadRequest(HttpServletResponse resp, String reason) throws IOException {
    sendError(resp, HttpServletResponse.SC_BAD_REQUEST, reason != null ? reason : "Bad request");
  }
  
  /**
   * Helper: Escape special characters in JSON strings
   */
  private static String escapeJson(String str) {
    if (str == null) return "";
    return str
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\b", "\\b")
      .replace("\f", "\\f")
      .replace("\n", "\\n")
      .replace("\r", "\\r")
      .replace("\t", "\\t");
  }
  
  /**
   * Predefined error messages (for consistency)
   */
  public static class Messages {
    public static final String INVALID_INPUT = "Invalid input provided";
    public static final String MISSING_REQUIRED = "Missing required fields";
    public static final String RESOURCE_NOT_FOUND = "Resource not found";
    public static final String ALREADY_EXISTS = "This resource already exists";
    public static final String UNAUTHORIZED = "Not authorized to perform this action";
    public static final String SERVER_ERROR = "Internal server error";
    public static final String INVALID_EMAIL = "Invalid email format";
    public static final String INVALID_PASSWORD = "Invalid password";
    public static final String USER_NOT_FOUND = "User not found";
    public static final String BOOKING_NOT_FOUND = "Booking not found";
    public static final String SQUAD_FULL = "Squad is full";
    public static final String ALREADY_JOINED = "Already joined this squad";
    public static final String NOT_JOINED = "Not a member of this squad";
  }
}
