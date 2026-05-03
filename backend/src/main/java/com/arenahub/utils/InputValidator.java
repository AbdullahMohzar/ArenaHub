package com.arenahub.utils;

public class InputValidator {
  private static final int MAX_STRING_LENGTH = 500;
  private static final int MAX_TEXT_LENGTH = 5000;
  private static final int MIN_PASSWORD_LENGTH = 8;
  
  /**
   * Check if string is null or empty
   */
  public static boolean isNullOrEmpty(String value) {
    return value == null || value.trim().isEmpty();
  }
  
  /**
   * Validate string length
   */
  public static boolean isValidLength(String value, int maxLength) {
    return value != null && value.length() <= maxLength;
  }
  
  /**
   * Sanitize for HTML display (prevent XSS)
   */
  public static String sanitizeForDisplay(String value) {
    if (value == null) return "";
    return value
      .replace("&", "&amp;")
      .replace("<", "&lt;")
      .replace(">", "&gt;")
      .replace("\"", "&quot;")
      .replace("'", "&#x27;");
  }
  
  /**
   * Validate email format
   */
  public static boolean isValidEmail(String email) {
    return email != null && 
      email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$") &&
      isValidLength(email, 255);
  }
  
  /**
   * Validate password (8+ chars, uppercase, lowercase, digit)
   */
  public static boolean isValidPassword(String password) {
    return password != null && 
      password.length() >= MIN_PASSWORD_LENGTH &&
      password.matches(".*[A-Z].*") &&     // At least one uppercase
      password.matches(".*[a-z].*") &&     // At least one lowercase
      password.matches(".*[0-9].*");       // At least one digit
  }
  
  /**
   * Validate phone number (basic)
   */
  public static boolean isValidPhone(String phone) {
    return phone != null &&
      phone.matches("[0-9+\\-\\s()]{7,20}");
  }
  
  /**
   * Validate price (positive, reasonable range)
   */
  public static boolean isValidPrice(double price) {
    return price > 0 && price <= 999999;
  }
  
  /**
   * Validate player count
   */
  public static boolean isValidPlayerCount(int count) {
    return count > 0 && count <= 100;
  }
  
  /**
   * Validate booking duration (in hours)
   */
  public static boolean isValidDuration(double hours) {
    return hours > 0 && hours <= 12;
  }
  
  /**
   * Validate review rating (1-5)
   */
  public static boolean isValidRating(int rating) {
    return rating >= 1 && rating <= 5;
  }
  
  /**
   * Validate name (alphanumeric + spaces)
   */
  public static boolean isValidName(String name) {
    return name != null &&
      name.matches("[A-Za-z0-9\\s.-]{2,100}") &&
      isValidLength(name, 100);
  }
  
  /**
   * Validate text content (chat, reviews)
   */
  public static boolean isValidContent(String content) {
    return content != null &&
      !content.trim().isEmpty() &&
      isValidLength(content, MAX_TEXT_LENGTH);
  }
  
  /**
   * Validate location/address
   */
  public static boolean isValidLocation(String location) {
    return location != null &&
      !location.trim().isEmpty() &&
      isValidLength(location, 200);
  }
  
  /**
   * Prevent path traversal attacks
   */
  public static boolean isValidPath(String path) {
    return path != null &&
      !path.contains("..") &&
      !path.contains("//") &&
      !path.contains("\\");
  }
}
