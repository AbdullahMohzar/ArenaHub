public class TestFile {
    public static void main(String[] args) {
        String uploadRoot = System.getProperty("arenahub.uploadDir", System.getProperty("user.home") + java.io.File.separator + "ArenaHub" + java.io.File.separator + "uploads");
        java.io.File file = new java.io.File(uploadRoot, "reviews/test.jpg");
        System.out.println(file.getAbsolutePath());
    }
}
