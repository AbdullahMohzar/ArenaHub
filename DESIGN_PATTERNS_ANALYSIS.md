# Design Patterns Analysis - ArenaHub Backend

## GRASP Patterns (General Responsibility Assignment Software Patterns)

### 1. **CONTROLLER Pattern** ✅
**Where:** All Servlet classes (SignupServlet, TurfServlet, BookingServlet, etc.)

**Explanation:**
- Servlets act as controllers that receive HTTP requests and coordinate responses
- They delegate to the database layer and format responses back to clients
- Controllers separate presentation logic from business logic

**Example:**
```java
// SignupServlet.java
@Override
protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
    // CONTROLLER: Receives HTTP POST request, validates, processes, returns response
    BufferedReader reader = req.getReader();
    JsonObject jsonRequest = gson.fromJson(reader, JsonObject.class);
    // ... validation and processing
    resp.getWriter().write(jsonResponse.toString());
}
```

**Why Used:** 
- Centralizes HTTP request handling
- Separates concerns between HTTP layer and database layer
- Makes code more maintainable and testable

---

### 2. **INFORMATION EXPERT Pattern** ✅
**Where:** Domain-specific servlets

**Explanation:**
- Each servlet is an expert in its domain and holds responsibility for its data
- TurfServlet is expert on turf-related operations
- BookingServlet is expert on booking-related operations
- AdminServlet is expert on admin-related operations

**Example:**
```java
// TurfServlet.java - EXPERT in turf domain
public class TurfServlet extends HttpServlet {
    // Handles all turf operations: search, create, update, delete
    // Only this class knows how to query and manipulate turfs
}

// BookingServlet.java - EXPERT in booking domain
public class BookingServlet extends HttpServlet {
    // Handles all booking operations: create, query, update
    // Only this class knows booking logic
}
```

**Why Used:**
- Keeps related responsibility together
- Makes code predictable - you know where turf logic lives
- Reduces coupling between components

---

### 3. **LOW COUPLING Pattern** ✅
**Where:** DatabaseConnection abstraction layer

**Explanation:**
- Servlets don't directly depend on database driver
- They depend on JDBC interfaces (Connection, PreparedStatement, ResultSet)
- DatabaseConnection provides a single point of connection management

**Example:**
```java
// Instead of direct driver usage:
// ❌ BAD: Class.forName("com.mysql.cj.jdbc.Driver"); DriverManager.getConnection(...)

// ✅ GOOD: Use DatabaseConnection abstraction
try (Connection conn = DatabaseConnection.getConnection()) {
    PreparedStatement stmt = conn.prepareStatement(sql);
    // ... execute query
}
```

**Why Used:**
- Changing database driver only requires DatabaseConnection changes
- Servlets remain unchanged if we switch databases (MySQL → PostgreSQL)
- Reduces ripple effects of changes

---

### 4. **HIGH COHESION Pattern** ✅
**Where:** Each servlet class

**Explanation:**
- Related functionality is grouped together in one class
- TurfServlet contains only turf-related methods (doGet, doPost, doPut)
- Not mixing authentication, payment, or booking logic in TurfServlet

**Example:**
```java
// TurfServlet - HIGH COHESION
public class TurfServlet extends HttpServlet {
    // Only turf-related methods
    protected void doGet() { /* turf search */ }
    protected void doPost() { /* turf creation */ }
    protected void doPut() { /* turf update */ }
    private String getFileName() { /* helper for turf */ }
}
```

**Why Used:**
- Easy to understand and maintain
- Changes to one feature don't affect other features
- Increases code readability

---

### 5. **CREATOR Pattern** ✅
**Where:** DatabaseConnection, Gson, JSON objects

**Explanation:**
- DatabaseConnection creates and returns Connection objects
- Gson creates JSON objects from strings
- Servlets create Response objects

**Example:**
```java
// DatabaseConnection.java - Factory for creating connections
public static Connection getConnection() throws SQLException {
    Class.forName("com.mysql.cj.jdbc.Driver");
    return DriverManager.getConnection(URL, USER, PASSWORD);
}

// SignupServlet.java - Creating JSON response
JsonObject jsonResponse = new JsonObject();
jsonResponse.addProperty("message", "User registered successfully");
```

**Why Used:**
- Centralizes object creation logic
- Makes it easy to modify how objects are created
- Reduces duplication

---

### 6. **POLYMORPHISM Pattern** ✅
**Where:** HTTP method implementations (doGet, doPost, doPut, doDelete)

**Explanation:**
- Each servlet implements different versions of HTTP methods
- Same method name, different implementations
- Framework calls appropriate method based on HTTP verb

**Example:**
```java
// BookingServlet.java
@Override
protected void doGet() {
    // POLYMORPHISM: Fetch bookings (read)
}

@Override
protected void doPost() {
    // POLYMORPHISM: Create booking (create)
}

@Override
protected void doPut() {
    // POLYMORPHISM: Update booking (update)
}
```

**Why Used:**
- Eliminates if-else statements checking HTTP method
- Leverages Java's polymorphic capabilities
- Makes code cleaner and more maintainable

---

### 7. **INDIRECTION Pattern** ✅
**Where:** DatabaseConnection layer

**Explanation:**
- DatabaseConnection acts as intermediary between Servlets and JDBC Driver
- Servlets don't directly interact with DriverManager
- Reduces direct dependencies

**Example:**
```java
// INDIRECTION: Servlet doesn't know about MySQL driver
// Servlet -> DatabaseConnection -> JDBC Driver -> MySQL

try (Connection conn = DatabaseConnection.getConnection()) {
    // Servlet doesn't care HOW connection is obtained
}
```

**Why Used:**
- Decouples servlets from database implementation
- Can change connection pooling strategy without changing servlets
- Supports future features like connection pooling

---

### 8. **PROTECTED VARIATIONS Pattern** ✅
**Where:** Error handling, CORS headers, HTTP OPTIONS method

**Explanation:**
- Encapsulates points of change (CORS policies, error formats)
- Protects against variations in external requirements
- @WebServlet, @MultipartConfig annotations protect against configuration changes

**Example:**
```java
private void setAccessControlHeaders(HttpServletResponse resp) {
    // PROTECTED VARIATIONS: All CORS changes centralized here
    resp.setHeader("Access-Control-Allow-Origin", "*");
    resp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

@Override
protected void doOptions() {
    // PROTECTED VARIATIONS: Handle preflight requests consistently
    setAccessControlHeaders(resp);
}
```

**Why Used:**
- Single place to modify CORS policies
- Protects from browser CORS errors
- Consistent security handling across all endpoints

---

## GOF Design Patterns (Gang of Four)

### 1. **FACTORY Pattern** ✅
**Where:** DatabaseConnection.getConnection()

**Explanation:**
- Static factory method creates Connection objects
- Centralizes connection creation logic
- Can easily switch to connection pooling (HikariCP, etc.)

**Implementation:**
```java
// DatabaseConnection.java - FACTORY PATTERN
public class DatabaseConnection {
    public static Connection getConnection() throws SQLException {
        // FACTORY METHOD: Creates and returns Connection
        Class.forName("com.mysql.cj.jdbc.Driver");
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}

// Usage in servlets
Connection conn = DatabaseConnection.getConnection();
```

**Why Used:**
- Hides connection creation complexity
- Easy to implement connection pooling later
- Single point of modification for database connections

---

### 2. **TEMPLATE METHOD Pattern** ✅
**Where:** HttpServlet base class (provided by Servlet API)

**Explanation:**
- HttpServlet provides template with doGet, doPost, doPut, doDelete methods
- Servlets override specific methods
- Framework calls the appropriate template method

**Example:**
```java
// Template provided by HttpServlet:
// public void service(HttpServletRequest req, HttpServletResponse resp) {
//     if (GET) doGet(req, resp);
//     else if (POST) doPost(req, resp);
//     else if (PUT) doPut(req, resp);
// }

// Our Servlets override specific steps:
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
    // Our specific implementation
}

@Override
protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
    // Our specific implementation
}
```

**Why Used:**
- Standardizes servlet request handling
- Framework handles HTTP routing
- Developers only implement specific HTTP methods

---

### 3. **STRATEGY Pattern** ✅
**Where:** Different HTTP method implementations (GET, POST, PUT, DELETE)

**Explanation:**
- Each HTTP method represents a different strategy for handling the request
- Same endpoint, different operations based on HTTP verb
- Runtime selection of strategy

**Example:**
```java
// BookingServlet.java - STRATEGY PATTERN
// Strategy 1: GET strategy (fetch bookings)
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
    // Strategy: Query bookings from database
    String sql = "SELECT * FROM Bookings WHERE UserID = ?";
}

// Strategy 2: POST strategy (create booking)
@Override
protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
    // Strategy: Insert new booking
    String sql = "INSERT INTO Bookings (UserID, TurfID, ...) VALUES (?, ?, ...)";
}

// Strategy 3: PUT strategy (update booking)
@Override
protected void doPut(HttpServletRequest req, HttpServletResponse resp) {
    // Strategy: Update existing booking
    String sql = "UPDATE Bookings SET Status = ? WHERE BookingID = ?";
}
```

**Why Used:**
- Encapsulates different algorithms (GET, POST, PUT, DELETE)
- Eliminates if-else checking HTTP method
- Easy to add new strategies (new HTTP methods)

---

### 4. **FACADE Pattern** ✅
**Where:** Servlet classes act as facades

**Explanation:**
- Servlets provide simplified interface to complex subsystems
- Hide complexity of database operations, validation, error handling
- Present clean API to HTTP clients

**Example:**
```java
// TurfServlet - FACADE PATTERN
public class TurfServlet extends HttpServlet {
    // FACADE: Hides complexity of:
    // - Database connection
    // - Multi-table JOIN queries
    // - Image file handling
    // - Error handling
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        // Client calls simple GET /api/turfs
        // Behind scenes: complex SQL, file I/O, error handling
        try (Connection conn = DatabaseConnection.getConnection()) {
            String sql = "SELECT t.*, COALESCE(AVG(r.Rating), 0) AS AvgRating " +
                        "FROM Turfs t LEFT JOIN Reviews r ON ...";
            // ... complex logic hidden
            resp.getWriter().write(jsonResponse.toString());
        }
    }
}
```

**Why Used:**
- Clients don't need to know database details
- Single endpoint handles multiple complex operations
- Isolates clients from subsystem changes

---

### 5. **ADAPTER Pattern** ✅
**Where:** Servlet request/response handling

**Explanation:**
- Servlets adapt HTTP requests/responses to internal object formats
- Gson adapts JSON strings to JsonObject
- Response objects adapted to JSON format

**Example:**
```java
// BookingServlet - ADAPTER PATTERN
@Override
protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
    // ADAPTER 1: Convert HTTP request to JSON object
    BufferedReader reader = req.getReader();
    Gson gson = new Gson();
    JsonObject jsonRequest = gson.fromJson(reader, JsonObject.class);
    
    // ADAPTER 2: Extract values
    int userId = jsonRequest.get("userId").getAsInt();
    String bookingDate = jsonRequest.get("bookingDate").getAsString();
    
    // ... business logic ...
    
    // ADAPTER 3: Convert response to JSON
    JsonObject jsonResponse = new JsonObject();
    jsonResponse.addProperty("bookingId", newBookingId);
    resp.getWriter().write(jsonResponse.toString());
}
```

**Why Used:**
- Converts between HTTP format and internal format
- Handles JSON serialization/deserialization
- Separates HTTP concerns from business logic

---

### 6. **DECORATOR Pattern** ✅
**Where:** Java annotations (@WebServlet, @MultipartConfig)

**Explanation:**
- Annotations decorate classes with additional functionality
- @WebServlet maps URL to servlet
- @MultipartConfig enables file upload handling
- No need to modify class code; metadata adds functionality

**Example:**
```java
// TurfServlet.java - DECORATOR PATTERN
@WebServlet("/api/turfs")  // DECORATOR: Maps URL path
@MultipartConfig(...)      // DECORATOR: Enables multipart form data (file uploads)
public class TurfServlet extends HttpServlet {
    // Annotations add functionality without modifying class code
}

// ReviewServlet.java - DECORATOR PATTERN
@WebServlet("/api/reviews")  // DECORATOR: Maps URL
@MultipartConfig(...)        // DECORATOR: Handles image file uploads
public class ReviewServlet extends HttpServlet {
    // File upload support added via decorator
}
```

**Why Used:**
- Adds functionality without modifying class
- Clean separation of concerns
- Configuration managed through metadata
- Easy to enable/disable features

---

### 7. **SINGLETON Pattern (Potential)** 🔄
**Where:** DatabaseConnection (could be improved)

**Explanation:**
- Currently: Static factory method (semi-singleton)
- Could be improved with true Singleton pattern
- Connection pool could be singleton

**Current Implementation:**
```java
// DatabaseConnection.java - SEMI-SINGLETON
public class DatabaseConnection {
    private static final String URL = "jdbc:mysql://localhost:3306/ArenaHub";
    
    public static Connection getConnection() throws SQLException {
        // Static method acts like singleton factory
        // Creates new connection each time (not ideal)
    }
}
```

**Improvement Option:**
```java
// Better: Singleton with connection pooling
public class DatabaseConnection {
    private static DatabaseConnection instance;
    private HikariDataSource dataSource;
    
    private DatabaseConnection() {
        // Initialize connection pool once
    }
    
    public static synchronized DatabaseConnection getInstance() {
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
}
```

**Why Used:**
- Ensures single database connection pool
- Thread-safe connection management
- Better resource management

---

### 8. **OBSERVER Pattern** ✅
**Where:** Servlet lifecycle events (implicit)

**Explanation:**
- Servlet container observes lifecycle events
- Servlets implement lifecycle callbacks: init(), service(), destroy()
- Container notifies servlet of state changes

**Example:**
```java
// Implicit in servlet architecture:
// Container observes and calls these methods:

public class BookingServlet extends HttpServlet {
    // Called once when servlet is loaded
    @Override
    public void init() throws ServletException {
        // Initialize resources
    }
    
    // Called for each request (template method calls doGet/doPost/etc)
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        // Handle request
    }
    
    // Called when servlet is unloaded
    @Override
    public void destroy() {
        // Cleanup resources
    }
}
```

**Why Used:**
- Standardized lifecycle management
- Automatic resource initialization and cleanup
- Container manages servlet lifecycle

---

## Pattern Summary Table

| Pattern | Type | Used? | Location | Purpose |
|---------|------|-------|----------|---------|
| Controller | GRASP | ✅ | All Servlets | Handle HTTP requests |
| Information Expert | GRASP | ✅ | Domain Servlets | Encapsulate domain logic |
| Low Coupling | GRASP | ✅ | DatabaseConnection | Reduce dependencies |
| High Cohesion | GRASP | ✅ | Each Servlet | Group related functionality |
| Creator | GRASP | ✅ | DatabaseConnection, Gson | Create objects |
| Polymorphism | GRASP | ✅ | HTTP Methods | Different strategies per method |
| Indirection | GRASP | ✅ | DatabaseConnection | Decouple layers |
| Protected Variations | GRASP | ✅ | CORS, Error Handling | Handle points of variation |
| Factory | GOF | ✅ | DatabaseConnection.getConnection() | Create connections |
| Template Method | GOF | ✅ | HttpServlet base class | Define algorithm skeleton |
| Strategy | GOF | ✅ | doGet/doPost/doPut/doDelete | Different algorithms per method |
| Facade | GOF | ✅ | Servlet classes | Simplify complex operations |
| Adapter | GOF | ✅ | Gson, JSON conversion | Adapt between formats |
| Decorator | GOF | ✅ | @WebServlet, @MultipartConfig | Add functionality via metadata |
| Singleton | GOF | 🔄 | DatabaseConnection | Could improve connection pooling |
| Observer | GOF | ✅ | Servlet lifecycle | Manage lifecycle events |

---

## Why These Patterns Were Chosen

1. **Separation of Concerns** - Each layer has specific responsibility
2. **Maintainability** - Changes isolated to specific components
3. **Scalability** - Easy to add new servlets or features
4. **Testability** - Can test each servlet independently
5. **Reusability** - DatabaseConnection used by all servlets
6. **Industry Standards** - These patterns are proven and widely used
7. **Framework Design** - Java Servlet API itself uses these patterns

