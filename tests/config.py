BASE_URL = "http://localhost:3001/api"

# Test user credentials (must match seed data in backend/database/seed.js)
# Student IDs: 8 digits starting with "1"; default password = ddmmyyyy birth date
TEST_STUDENT_1 = {"studentId": "14100001", "password": "01011990"}
TEST_STUDENT_2 = {"studentId": "14100002", "password": "02021992"}
TEST_ADMIN     = {"studentId": "st0001",   "password": "03031985"}

# New user for registration tests (valid 8-digit ID starting with 1)
NEW_STUDENT    = {"studentId": "19200001", "email": "newstudent@jcu.edu.sg", "password": "15061999"}

# Building IDs (match seed order: Block A=1, B=2, C=3, E=4, Library=5)
BLOCK_A_ID   = 1
BLOCK_A_NAME = "Block A"
BLOCK_B_ID   = 2
BLOCK_C_ID   = 3
BLOCK_E_ID   = 4
LIBRARY_ID   = 5
LEVEL_1      = "Level 1"
LEVEL_2      = "Level 2"

# Room IDs (match insertion order in seed.js)
# Block A Level 1: A1-04(1), A1-05(2), A1-03(3)
ROOM_A1_04_ID = 1
ROOM_A1_05_ID = 2

# Block C Level 1 consultation rooms start at id 28
# C1-01(21)..C1-07(27), C1-10(28), C1-11(29), C1-12(30), C1-13(31)
ROOM_C1_10_ID = 28

# Library Level 1 seats: ids 61-95  (L1-Seat-1 through L1-Seat-35)
LIBRARY_L1_SEAT_START = 61
# Library Level 2 seats: ids 96-173 (L2-Seat-1 through L2-Seat-78)
LIBRARY_L2_SEAT_START = 96
