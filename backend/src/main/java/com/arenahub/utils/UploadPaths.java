package com.arenahub.utils;

import java.io.File;

import javax.servlet.ServletContext;

public final class UploadPaths {

    private static final String SYSTEM_PROPERTY = "arenahub.uploadDir";
    private static final String ENVIRONMENT_VARIABLE = "ARENAHUB_UPLOAD_DIR";
    private static final String DEFAULT_FOLDER = "ArenaHub/uploads";

    private UploadPaths() {
    }

    public static File resolveBaseDir(ServletContext context) {
        String configuredPath = trimToNull(System.getProperty(SYSTEM_PROPERTY));
        if (configuredPath == null) {
            configuredPath = trimToNull(System.getenv(ENVIRONMENT_VARIABLE));
        }

        if (configuredPath != null) {
            return new File(configuredPath);
        }

        // Check for pre-migration location at D:/ArenaHub/uploads (Windows) FIRST
        File originalLocation = new File("D:/ArenaHub/uploads");
        if (originalLocation.exists()) {
            return originalLocation;
        }

        if (context != null) {
            String realPath = context.getRealPath("/uploads");
            if (realPath != null) {
                File contextPath = new File(realPath);
                if (contextPath.exists()) {
                    return contextPath;
                }
            }
        }

        // Fallback to user home
        return new File(System.getProperty("user.home"), DEFAULT_FOLDER);
    }

    public static File resolveUploadDir(ServletContext context, String subdirectory) {
        File baseDir = resolveBaseDir(context);
        if (subdirectory == null || subdirectory.trim().isEmpty()) {
            return baseDir;
        }
        return new File(baseDir, subdirectory.trim());
    }

    public static String resolvePublicUrl(String subdirectory, String fileName) {
        return "/uploads/" + subdirectory + "/" + fileName;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}