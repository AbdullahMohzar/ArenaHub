package com.arenahub.filters;

import java.io.IOException;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.arenahub.utils.JwtUtil;

import io.jsonwebtoken.Claims;

@WebFilter("/*")
public class AuthFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        // Handle CORS Preflight completely here
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            resp.setHeader("Access-Control-Allow-Origin", "*");
            resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            resp.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        // Standard CORS headers for downstream traffic
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        String path = req.getRequestURI();

        // Skip auth for login, register, and fetching turfs
        if (path.endsWith("/api/login") || path.endsWith("/api/register")) {
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