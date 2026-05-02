public class TestFile {
    public static void main(String[] args) {
        java.io.File file = new java.io.File("D:/ArenaHub/uploads", "/reviews/test.jpg");
        System.out.println(file.getAbsolutePath());
    }
}
