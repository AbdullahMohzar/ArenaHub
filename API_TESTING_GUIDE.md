# ArenaHub API Testing Guide
**Backend Version:** May 3, 2026  
**Test Environment:** http://localhost:8080

## Prerequisites
- Backend running: `mvn tomcat7:run`
- Get Auth Token: Login first, store JWT from response
- Set Token in curl: `-H "Authorization: Bearer <JWT_TOKEN>"`

---

## 🎫 Authentication Flow

### 1. Register New User
```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@test.com",
    "password": "Test@1234",
    "name": "Test Player",
    "role": "Player",
    "phone": "03001234567"
  }'
```

### 2. Login & Get Token
```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@test.com",
    "password": "Test@1234"
  }'
```
**Response:** `{ "token": "JWT_TOKEN", "userId": 1, "role": "Player" }`

Store token as: `TOKEN=<jwt_token_from_response>`

---

## 🏟️ Turf Management Tests

### 3. Get All Turfs (Public)
```bash
curl -X GET "http://localhost:8080/api/turfs" \
  -H "Content-Type: application/json"
```

### 4. Search Turfs with Filters
```bash
curl -X GET "http://localhost:8080/api/turfs?search=football&sportType=Football&maxPrice=5000" \
  -H "Content-Type: application/json"
```

### 5. Create Turf (Owner Only)
```bash
curl -X POST http://localhost:8080/api/turfs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ownerId": 1,
    "name": "FC Arena",
    "sportType": "Football",
    "pricePerHour": 3000,
    "location": "Islamabad",
    "description": "Premium football pitch"
  }'
```

---

## 📅 Booking Management Tests

### 6. Create Booking (Player/Captain)
```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": 1,
    "turfId": 1,
    "bookingDate": "2026-05-10",
    "startTime": "18:00",
    "endTime": "19:00",
    "visibility": "PUBLIC",
    "maxPlayers": 10
  }'
```
**Expected:** `{ "message": "Booking successful!", "bookingId": 1 }`

### 7. Create Booking with Past Date (Should Fail) ❌
```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": 1,
    "turfId": 1,
    "bookingDate": "2026-05-01",
    "startTime": "18:00",
    "endTime": "19:00",
    "visibility": "PUBLIC",
    "maxPlayers": 10
  }'
```
**Expected Error:** `{ "error": "Cannot book for a past date" }` (400)

### 8. Create Booking Today <30min (Should Fail) ❌
```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": 1,
    "turfId": 1,
    "bookingDate": "2026-05-03",
    "startTime": "20:15",
    "endTime": "21:00",
    "visibility": "PUBLIC",
    "maxPlayers": 10
  }'
```
**Expected Error:** `{ "error": "Booking start time must be at least 30 minutes from now" }` (400)

### 9. Check Conflicts (Before Booking)
```bash
curl -X GET "http://localhost:8080/api/bookings?checkConflicts=true&turfId=1&date=2026-05-10" \
  -H "Content-Type: application/json"
```
**Response:** `[{ "startTime": "18:00", "endTime": "19:00" }]`

### 10. Get My Bookings
```bash
curl -X GET "http://localhost:8080/api/bookings?userId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### 11. Get Public Games (Squad Discovery)
```bash
curl -X GET "http://localhost:8080/api/bookings?publicGames=true&userId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```
**Response includes:** `HasJoined` flag (true if user already in squad)

---

## 👥 Squad Management Tests ⭐ NEW

### 12. Join Public Squad ✅
```bash
curl -X POST http://localhost:8080/api/squad/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "bookingId": 1,
    "userId": 2
  }'
```
**Expected:** `{ "message": "Successfully joined the squad!", "bookingId": 1, "newCurrentPlayers": 2 }`

### 13. Join Squad (Already Member - Should Fail) ❌
```bash
curl -X POST http://localhost:8080/api/squad/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "bookingId": 1,
    "userId": 2
  }'
```
**Expected Error:** `{ "error": "You are already in this squad" }` (400)

### 14. Join Full Squad (Should Fail) ❌
```bash
# First create booking with maxPlayers=1
# Then try to add 2nd player
curl -X POST http://localhost:8080/api/squad/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "bookingId": 1,
    "userId": 3
  }'
```
**Expected Error:** `{ "error": "Squad is full. Could not join" }` (400)

### 15. Join Private Booking (Should Fail) ❌
```bash
# Create booking with visibility: PRIVATE
curl -X POST http://localhost:8080/api/squad/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "bookingId": 1,
    "userId": 2
  }'
```
**Expected Error:** `{ "error": "This booking is private. Only the captain can join" }` (403)

### 16. Leave Squad
```bash
curl -X DELETE http://localhost:8080/api/squad/leave \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "bookingId": 1,
    "userId": 2
  }'
```
**Expected:** `{ "message": "Successfully left the squad!" }`

---

## 💬 Chat Tests

### 17. Get Chat Contacts (Direct + Squad)
```bash
curl -X GET "http://localhost:8080/api/chat/contacts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```
**Response:** Merged list of direct messages and squad chats with unread counts

### 18. Get Messages from Contact
```bash
curl -X GET "http://localhost:8080/api/chat/messages?contactId=U_2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```
**Format:** `U_<userId>` for direct, `B_<bookingId>` for squad

### 19. Send Message (Direct)
```bash
curl -X POST http://localhost:8080/api/chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "contactId": "U_2",
    "content": "Hey! Want to join our game?"
  }'
```

### 20. Send Message (Squad)
```bash
curl -X POST http://localhost:8080/api/chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "contactId": "B_1",
    "content": "Game starting in 10 minutes!"
  }'
```

### 21. Mark Messages as Read
```bash
curl -X PUT "http://localhost:8080/api/chat/read?contactId=U_2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💳 Wallet Tests

### 22. Get Wallet Balance
```bash
curl -X GET "http://localhost:8080/api/wallet?userId=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### 23. Top-up Wallet
```bash
curl -X POST http://localhost:8080/api/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": 1,
    "amount": 5000
  }'
```

---

## 👨‍💼 Admin Tests

### 24. Get All Users (Admin)
```bash
curl -X GET "http://localhost:8080/api/admin/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 25. Ban User (Admin)
```bash
curl -X PUT http://localhost:8080/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "userId": 2,
    "action": "BAN"
  }'
```

### 26. Process Refund (Admin) ✅
```bash
curl -X POST http://localhost:8080/api/admin/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "bookingId": 1,
    "userId": 2,
    "amount": 3000
  }'
```
**Expected:** `{ "message": "Refund processed successfully!" }`

---

## ⚡ Quick Test Sequence

**Recommended order to test full workflow:**

1. Register 3 users (captain, player1, player2)
2. Login all 3, store their tokens
3. Register owner, create turf
4. Login owner
5. Create PUBLIC booking for tomorrow (captain = user1)
6. Verify captain auto-added to squad
7. Player2 joins squad via `/api/squad/join` ✅
8. Check squad capacity increased
9. Send chat message in squad
10. Admin processes refund
11. Verify wallet credited

---

## 🔧 Environment Variables

```bash
# Save to .env or set in terminal
TOKEN_CAPTAIN="<jwt_from_login>"
TOKEN_PLAYER1="<jwt_from_login>"
TOKEN_PLAYER2="<jwt_from_login>"
ADMIN_TOKEN="<jwt_from_login_as_admin>"
BOOKING_ID=1
TURFID=1
```

Use in scripts:
```bash
curl -X POST http://localhost:8080/api/squad/join \
  -H "Authorization: Bearer $TOKEN_CAPTAIN" \
  -d "{ ... }"
```

---

## ✅ Success Criteria

- ✅ All bookings reject past dates
- ✅ Same-day bookings require 30-min advance
- ✅ Squad JOIN automatically increments CurrentPlayers
- ✅ Duplicate joins return 400 error
- ✅ Full squads return 400 error
- ✅ Private bookings return 403 error
- ✅ Refunds update wallet atomically
- ✅ Chat messages support both direct & squad modes
- ✅ Unread message counts aggregate correctly

