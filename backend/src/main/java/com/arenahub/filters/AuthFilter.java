package com.arenahub.filters;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.DatabaseConnection;
import com.arenahub.utils.JwtUtil;

import io.jsonwebtoken.Claims;

/**
 * JWT Authentication Filter.
 * CORS is handled by CorsFilter (runs before this filter via web.xml ordering).
 * This filter only handles JWT token validation.
 * 
 * NOTE: No @WebFilter annotation — filter mapping is defined in web.xml
 * to guarantee that CorsFilter runs first.
 */
public class AuthFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        // OPTIONS preflight is already handled by CorsFilter — skip auth
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String path = req.getRequestURI();

        // Skip auth for login, register, reset-password, and fetching turfs/reviews
        if (path.endsWith("/api/login") || path.endsWith("/api/register") || path.endsWith("/api/reset-password")) {
            chain.doFilter(request, response);
            return;
        }
        if (path.endsWith("/api/turfs") && "GET".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        if (path.contains("/uploads/")) {
            chain.doFilter(request, response);
            return;
        }
        
        // Authorization header check
        String authHeader = req.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.setContentType("application/json");
            resp.getWriter().write("{\"error\":\"Missing or invalid Authorization header\"}");
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = JwtUtil.validateToken(token);
            req.setAttribute("validatedUserId", claims.getSubject());
            req.setAttribute("validatedUserRole", claims.get("role"));

            String userId = claims.getSubject();
            try (Connection conn = DatabaseConnection.getConnection();
                 PreparedStatement stmt = conn.prepareStatement("SELECT Status FROM Users WHERE UserID = ?")) {
                stmt.setInt(1, Integer.parseInt(userId));
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next() && "BANNED".equalsIgnoreCase(rs.getString("Status"))) {
                        resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        resp.setContentType("application/json");
                        resp.getWriter().write("{\"error\":\"Your account is banned. Please contact support.\"}");
                        return;
                    }
                }
            } catch (SQLException | NumberFormatException ex) {
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resp.setContentType("application/json");
                resp.getWriter().write("{\"error\":\"Unable to validate account status\"}");
                return;
            }
            
            chain.doFilter(request, response);
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.setContentType("application/json");
            resp.getWriter().write("{\"error\":\"Token is invalid or expired\"}");
        }
    }

    @Override
    public void destroy() {}
}