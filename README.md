# ArenaHub

ArenaHub is a two-part sports booking platform:

- `backend/` contains the Java servlet API, database logic, and Tomcat runtime.
- `arenahub/` contains the React + Vite frontend.

## Prerequisites

- Node.js 18+ and npm
- Java 21
- Maven 3.9+
- MySQL 8+

You also need a MySQL database named `ArenaHub` with the project schema loaded before starting the app.

## Database Setup

1. Create the database if it does not already exist:

```sql
CREATE DATABASE ArenaHub;
```

2. Import the SQL scripts in `backend/` in the order required by your local setup. The repository includes migration files for users, turfs, bookings, chat, media, and related features.

3. Update the backend database connection settings in `backend/src/main/java/com/arenahub/utils/DatabaseConnection.java` if your MySQL username, password, host, or port differ from the defaults.

## Run the Backend

Open a terminal in the `backend/` folder and start Tomcat through Maven:

```bash
cd backend
mvn tomcat7:run
```

The backend runs on `http://localhost:8080`.

To build only the WAR file instead of running the server:

```bash
cd backend
mvn clean package -DskipTests
```

## Run the Frontend

Open a second terminal in the `arenahub/` folder and install dependencies once:

```bash
cd arenahub
npm install
```

Start the Vite development server:

```bash
cd arenahub
npm run dev
```

The frontend usually runs on `http://localhost:5173`.

To create a production frontend build:

```bash
cd arenahub
npm run build
```

## Recommended Local Start Order

1. Start MySQL and make sure the `ArenaHub` database is available.
2. Start the backend with `mvn tomcat7:run`.
3. Start the frontend with `npm run dev`.
4. Open the frontend URL in your browser.

## Notes

- The frontend expects the backend API at `http://localhost:8080`.
- If login, booking, reset-password, or image features fail, check the backend logs first.
- Uploads are stored under the local `uploads/` folder.