# Test File: test-book-nader.js

## Purpose
This test file demonstrates the complete appointment booking flow for Dr. Nader (نادر) using the Al Salam Hospital API.

## What It Tests

### 1. **Doctor Search**
- Searches for "نادر" using the `/search/individual` endpoint
- Handles both response formats:
  - New format: `searchResults` array
  - Old format: `Root.INDIVIDUAL_SEARCH.INDIVIDUAL_SEARCH_ROW`

### 2. **Available Days** (NEW ENDPOINT)
- Uses the **new** `get_doctor_available_days` endpoint
- URL: `https://salemuatapi.alsalamhosp.com:446/get_doctor_available_days`
- Parameters:
  - `BRANCH_ID`: Hospital ID
  - `DOC_ID`: Doctor ID
  - `CLINIC_ID`: Clinic ID (from search results)
  - `SCHEDULE_DAYS_ONLY`: 1
  - `Web_FromDate`: Today's date in DD/MM/YYYY format
  - `mobileapp_whatsapp`: 2
- Response structure: `Root.DOC_DAYS.DOC_DAYS_ROW[]`

### 3. **Available Time Slots**
- Uses `get_doc_next_availble_slot` endpoint (unchanged)
- Gets time slots for a specific selected day
- Parameters:
  - `SCHEDULE_DAYS_ONLY`: 0 (to get slots, not days)
  - `Web_FromDate`: Selected date
- Response structure: `Root.HOURS_SLOTS.HOURS_SLOTS_ROW[]`

### 4. **Patient Registration Check**
- Calls `checkPatientWhatsApp` endpoint
- Checks if phone number `201552781085` is registered
- Handles both registered and non-registered patients

### 5. **Appointment Submission**
- Submits appointment using `submit_appointment` endpoint
- For **non-registered patients**:
  - Sends: `PAT_NAME` and `GENDER`
- For **registered patients**:
  - Sends: `PATIENT_ID`

## Test Configuration

```javascript
const TEST_CONFIG = {
  doctorSearchTerm: 'نادر',
  patientPhone: '201552781085', // Without + sign
  patientName: 'محمد محمود احمد',
  patientGender: 'M',
  servType: '1'
};
```

## How to Run

```bash
node test-book-nader.js
```

## Expected Output

The test will:
1. ✅ Find Dr. Nader العسعوسي
2. ✅ Show available days using the NEW endpoint
3. ✅ Show available time slots
4. ✅ Check patient registration
5. ✅ Book an appointment
6. ✅ Display booking confirmation with appointment ID

## Key Changes from Old System

### Before:
- Used `get_doc_next_availble_slot` with `SCHEDULE_DAYS_ONLY=1` for days

### After:
- Uses `get_doctor_available_days` for days (cleaner, dedicated endpoint)
- Still uses `get_doc_next_availble_slot` with `SCHEDULE_DAYS_ONLY=0` for time slots

## Notes

- The test handles both API response formats for flexibility
- Patient registration check properly handles undefined `PAT_DATA`
- Automatically selects first available day and first empty slot
- Books as new patient if phone number not registered
