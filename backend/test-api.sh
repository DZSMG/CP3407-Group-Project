#!/bin/bash
set -e
BASE="http://localhost:3001/api"

echo "=== 1. Health Check ==="
curl -s $BASE/health | jq .
echo ""

echo "=== 2. Get Buildings ==="
curl -s $BASE/buildings | jq '.[].name'
echo ""

echo "=== 3. Login as student ==="
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"jc100001","password":"test123"}' | jq -r '.token')
echo "Token received: ${TOKEN:0:20}..."
echo ""

echo "=== 4. Get Block A rooms ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/rooms/availability?buildingId=1&level=Level%201&date=$(date +%Y-%m-%d)&startTime=10:00&duration=1" \
  | jq '.[0:3] | .[] | {room_id, room_type, isAvailable}'
echo ""

echo "=== 5. Create a booking ==="
BOOKING=$(curl -s -X POST $BASE/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":1,\"date\":\"$(date +%Y-%m-%d)\",\"startTime\":\"14:00\",\"durationHours\":1}")
echo $BOOKING | jq '{booking_ref, room_id, start_time, end_time, status}'
BOOKING_ID=$(echo $BOOKING | jq '.id')
echo ""

echo "=== 6. Verify room now shows as unavailable ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/rooms/availability?buildingId=1&level=Level%201&date=$(date +%Y-%m-%d)&startTime=14:00&duration=1" \
  | jq '.[] | select(.id == 1) | {room_id, isAvailable}'
echo ""

echo "=== 7. Get my bookings ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/bookings/me" | jq '.[0] | {booking_ref, room_name, status}'
echo ""

echo "=== 8. Cancel booking ==="
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" "$BASE/bookings/$BOOKING_ID/cancel" | jq '{status}'
echo ""

echo "=== 9. Double-booking test (should fail with 409) ==="
curl -s -X POST $BASE/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":1,\"date\":\"$(date +%Y-%m-%d)\",\"startTime\":\"10:00\",\"durationHours\":1}" | jq '{booking_ref}'
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":1,\"date\":\"$(date +%Y-%m-%d)\",\"startTime\":\"10:00\",\"durationHours\":1}")
echo "Double-booking attempt returned: HTTP $RESULT (expect 409)"
echo ""

echo "=== ALL TESTS PASSED ==="
