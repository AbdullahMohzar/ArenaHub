package com.arenahub.controllers;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.sql.Connection;
import java.sql.Statement;
import com.arenahub.utils.DatabaseConnection;

@WebServlet(value = "/uploads/*", loadOnStartup = 1)
public class StaticFileServlet extends HttpServlet {

    private static final String BASE_DIR = "D:/ArenaHub/uploads";

    @Override
    public void init() throws ServletException {
        super.init();
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement()) {
            
            String[] sqls = {
                "CREATE TABLE IF NOT EXISTS TurfImages (ImageID INT AUTO_INCREMENT PRIMARY KEY, TurfID INT NOT NULL, ImageURL VARCHAR(500) NOT NULL, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE);",
                "INSERT IGNORE INTO TurfImages (TurfID, ImageURL) SELECT TurfID, ImageURL FROM Turfs WHERE ImageURL IS NOT NULL AND ImageURL != '';",
                "CREATE TABLE IF NOT EXISTS ReviewImages (ImageID INT AUTO_INCREMENT PRIMARY KEY, ReviewID INT NOT NULL, ImageURL VARCHAR(500) NOT NULL, CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (ReviewID) REFERENCES Reviews(ReviewID) ON DELETE CASCADE);"
            };
            
            for (String sql : sqls) {
                try { stmt.execute(sql); } catch (Exception ignored) {}
            }
            System.out.println("Migration v6 executed successfully.");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setHeader("Access-Control-Allow-Origin", "*");

        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // Prevent directory traversal
        if (pathInfo.contains("..")) {
            resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        // Strip leading slash
        if (pathInfo.startsWith("/")) {
            pathInfo = pathInfo.substring(1);
        }

        File file = new File(BASE_DIR, pathInfo);
        if (!file.exists() || file.isDirectory()) {
            System.err.println("StaticFileServlet: File not found: " + file.getAbsolutePath());
            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // Set content type
        String mimeType = getServletContext().getMimeType(file.getName());
        if (mimeType == null) {
            String lower = file.getName().toLowerCase();
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mimeType = "image/jpeg";
            else if (lower.endsWith(".png")) mimeType = "image/png";
            else if (lower.endsWith(".gif")) mimeType = "image/gif";
            else if (lower.endsWith(".webp")) mimeType = "image/webp";
            else mimeType = "application/octet-stream";
        }
        
        resp.setContentType(mimeType);
        resp.setContentLength((int) file.length());
        resp.setHeader("Cache-Control", "public, max-age=3600");

        try (FileInputStream fis = new FileInputStream(file);
             OutputStream os = resp.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = fis.read(buffer)) != -1) {
                os.write(buffer, 0, bytesRead);
            }
        } catch (Exception e) {
            System.err.println("Error serving file: " + e.getMessage());
        }
    }
}
