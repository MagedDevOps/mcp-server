import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// Timeout configuration
const REQUEST_TIMEOUT = 50000; // 50 seconds timeout

// Helper function to create fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Simple in-memory cache for doctor available days
const DAYS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const daysCache = new Map(); // key -> { timestamp, availableDays }

const app = express();
const port = process.env.PORT || 3001; // Use 3001 to avoid conflict with server.js

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Create MCP server
const server = new McpServer({
  name: "AlSalamHospitalNewMCP",
  version: "1.0.0"
});

// Tool: search_individual
server.registerTool(
  "search_individual",
  {
    description: "Search for a doctor by name or specialty",
    inputSchema: {
      term: z.string().describe("Search term (doctor name or specialty)"),
      lang: z.string().optional().describe("Language code (default: A)"),
    },
  },
  async ({ term, lang = "A" }) => {
    try {
      const response = await fetchWithTimeout(`https://salemuatapi.alsalamhosp.com:446/search/individual?term=${encodeURIComponent(term)}&lang=${lang}`);
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool: get_doc_next_availble_slot
server.registerTool(
  "get_doc_next_availble_slot",
  {
    description: "Get the next available slot for a doctor",
    inputSchema: {
      branchId: z.string().describe("Branch ID"),
      clinicId: z.string().describe("Clinic ID"),
      docId: z.string().describe("Doctor ID"),
      scheduleDaysOnly: z.string().describe("1 for days only, 0 for slots"),
      webFromDate: z.string().optional().describe("Date in DD/MM/YYYY format (required if scheduleDaysOnly is 0)"),
      mobileAppWhatsapp: z.string().optional().default("2").describe("Mobile app/Whatsapp flag"),
    },
  },
  async ({ branchId, clinicId, docId, scheduleDaysOnly, webFromDate, mobileAppWhatsapp = "2" }) => {
    try {
      let url = `https://salemuatapi.alsalamhosp.com:446/get_doc_next_availble_slot?BRANCH_ID=${branchId}&CLINIC_ID=${clinicId}&DOC_ID=${docId}&SCHEDULE_DAYS_ONLY=${scheduleDaysOnly}&mobileapp_whatsapp=${mobileAppWhatsapp}`;

      if (webFromDate) {
        url += `&Web_FromDate=${webFromDate}`;
      }

      const response = await fetchWithTimeout(url);
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool: check_patient_whatsapp
server.registerTool(
  "check_patient_whatsapp",
  {
    description: "Check if a patient exists and has multiple profiles by mobile number",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number (e.g., +965...)"),
    },
  },
  async ({ mobile }) => {
    try {
      const response = await fetchWithTimeout('https://salemuatapi.alsalamhosp.com:446/checkPatientWhatsApp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile })
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Helper tool to select a specific doctor from multiple results
server.registerTool(
  "select_doctor_from_list",
  {
    description: "Select a specific doctor from multiple search results and get their available days",
    inputSchema: {
      doctorIndex: z.number().describe("Index of the selected doctor (1-based)"),
      searchResults: z.array(z.object({
        doctor_id: z.string(),
        doctor_name: z.string(),
        specialty_id: z.string(),
        specialty_name: z.string(),
        hospital_id: z.string(),
        hospital_name: z.string(),
        clinic_id: z.string().describe("Clinic ID from search results - REQUIRED for getting available days")
      })).describe("Array of doctors from search results")
    },
  },
  async ({ doctorIndex, searchResults }) => {
    try {
      // Validate index
      if (doctorIndex < 1 || doctorIndex > searchResults.length) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              message: `Invalid number. Please choose a number between 1 and ${searchResults.length}`,
              available_doctors: searchResults.length
            }, null, 2)
          }],
        };
      }

      const selectedDoctor = searchResults[doctorIndex - 1];

      // Get available days for the selected doctor with caching, shorter timeout, and fallbacks
      let availableDays = [];
      const cacheKey = `${selectedDoctor.hospital_id}:${selectedDoctor.doctor_id}:${selectedDoctor.clinic_id}`;
      const cached = daysCache.get(cacheKey);
      const nowTs = Date.now();
      if (cached && (nowTs - cached.timestamp) < DAYS_CACHE_TTL_MS) {
        availableDays = cached.availableDays;
      } else {
        const tryFetchDays = async (clinicId, timeoutMs) => {
          try {
            // Get today's date in DD/MM/YYYY format
            const today = new Date();
            const fromDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

            const resp = await fetchWithTimeout(
              `https://salemuatapi.alsalamhosp.com:446/get_doctor_available_days?BRANCH_ID=${selectedDoctor.hospital_id}&DOC_ID=${selectedDoctor.doctor_id}&CLINIC_ID=${clinicId}&SCHEDULE_DAYS_ONLY=1&Web_FromDate=${fromDate}&mobileapp_whatsapp=2`,
              {},
              timeoutMs
            );
            const data = await resp.json();
            return data;
          } catch (e) {
            return { error: e.message };
          }
        };

        // Use clinic_id from search results as the primary clinic ID (this is the correct approach!)
        const primaryTimeout = 12000; // 12s
        let daysData = await tryFetchDays(selectedDoctor.clinic_id, primaryTimeout);

        // Only use fallbacks if clinic_id didn't work
        if (!(daysData.Root && daysData.Root.DOC_DAYS && daysData.Root.DOC_DAYS.DOC_DAYS_ROW)) {
          // Try specialty_id as fallback
          daysData = await tryFetchDays(selectedDoctor.specialty_id, 8000);
        }

        // Last resort: try common clinic IDs
        if (!(daysData.Root && daysData.Root.DOC_DAYS && daysData.Root.DOC_DAYS.DOC_DAYS_ROW)) {
          const fallbackClinicIds = [1, 2, 3];
          for (const fallbackId of fallbackClinicIds) {
            const fbData = await tryFetchDays(fallbackId, 7000);
            if (fbData.Root && fbData.Root.DOC_DAYS && fbData.Root.DOC_DAYS.DOC_DAYS_ROW) {
              daysData = fbData;
              break;
            }
          }
        }

        if (daysData.Root && daysData.Root.DOC_DAYS && daysData.Root.DOC_DAYS.DOC_DAYS_ROW) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const twoWeeksFromNow = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000));
          twoWeeksFromNow.setHours(23, 59, 59, 999);

          availableDays = daysData.Root.DOC_DAYS.DOC_DAYS_ROW.filter(day => {
            const dateParts = day.SCHEDULE_DATE.split(' ')[0].split('/');
            const dayDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
            dayDate.setHours(0, 0, 0, 0);
            return dayDate >= today && dayDate <= twoWeeksFromNow;
          });

          // Cache result
          daysCache.set(cacheKey, { timestamp: Date.now(), availableDays });
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            doctor: {
              id: selectedDoctor.doctor_id,
              name: selectedDoctor.doctor_name,
              specialty: selectedDoctor.specialty_name,
              hospital: selectedDoctor.hospital_name,
              hospital_id: selectedDoctor.hospital_id,
              specialty_id: selectedDoctor.specialty_id,
              clinic_id: selectedDoctor.clinic_id
            },
            available_days: availableDays,
            message: availableDays.length > 0 ?
              `Selected Dr. ${selectedDoctor.doctor_name} (${selectedDoctor.specialty_name}) at ${selectedDoctor.hospital_name}. Available days: ${availableDays.length}` :
              "Doctor selected but no available days in the next 2 weeks"
          }, null, 2)
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool: generate_otp
server.registerTool(
  "generate_otp",
  {
    description: "Generate OTP for existing patient verification",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number with country code (e.g., +96569020323)"),
    },
  },
  async ({ mobile }) => {
    try {
      // Remove + sign from mobile number as API expects format without +
      const cleanMobile = mobile.startsWith('+') ? mobile.substring(1) : mobile;
      const response = await fetchWithTimeout(`https://salemuatapi.alsalamhosp.com:446/otp/generate?mobile=${encodeURIComponent(cleanMobile)}&source=WhatsApp`, {
        method: 'POST'
      });
      const data = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: data.success,
            message: data.message,
            otp: data.otp,
            mobile: mobile
          }, null, 2)
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error generating OTP: ${error.message}` }],
      };
    }
  }
);

// Tool: verify_otp
server.registerTool(
  "verify_otp",
  {
    description: "Verify OTP for existing patient verification",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number with country code (e.g., +96569020323)"),
      otpCode: z.string().describe("OTP code entered by patient"),
    },
  },
  async ({ mobile, otpCode }) => {
    try {
      // Remove + sign from mobile number as API expects format without +
      const cleanMobile = mobile.startsWith('+') ? mobile.substring(1) : mobile;
      const response = await fetchWithTimeout(`https://salemuatapi.alsalamhosp.com:446/otp/verify?mobile=${encodeURIComponent(cleanMobile)}&source=WhatsApp`, {
        method: 'POST'
      });
      const data = await response.json();

      // Check if the OTP matches
      const isVerified = data.success && data.otpCode === otpCode;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: isVerified,
            message: isVerified ? "OTP verified successfully" : "OTP verification failed",
            verified: isVerified,
            mobile: mobile
          }, null, 2)
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error verifying OTP: ${error.message}` }],
      };
    }
  }
);

// Tool: submit_appointment
server.registerTool(
  "submit_appointment",
  {
    description: "Submit a new appointment booking",
    inputSchema: {
      servType: z.string().describe("Service type"),
      branchId: z.string().describe("Branch ID"),
      clinicId: z.string().describe("Clinic ID"),
      specialtyId: z.string().optional().describe("Specialty ID"),
      docId: z.string().describe("Doctor ID"),
      schedSerial: z.string().describe("Schedule serial number"),
      shiftId: z.string().describe("Shift ID"),
      dateDone: z.string().describe("Appointment date and time (DD/MM/YYYY HH:mm:ss)"),
      expectedEndDate: z.string().describe("Expected end date and time (DD/MM/YYYY HH:mm:ss)"),
      patTel: z.string().describe("Patient telephone number"),
      telephoneCountryCode: z.string().describe("Telephone country code (e.g., +965)"),
      patientId: z.string().optional().describe("Patient ID (for registered patients)"),
      patName: z.string().optional().describe("Patient full name (for non-registered patients)"),
      gender: z.string().optional().describe("Patient gender (M/F)"),
      bufferStatus: z.string().optional().describe("Buffer status (default: 1)"),
      init: z.string().optional().describe("Init value (default: 1)"),
      computerName: z.string().optional().describe("Computer name (default: whatsapp)"),
    },
  },
  async ({
    servType,
    branchId,
    clinicId,
    specialtyId,
    docId,
    schedSerial,
    shiftId,
    dateDone,
    expectedEndDate,
    patTel,
    telephoneCountryCode,
    patientId,
    patName,
    gender,
    bufferStatus = "1",
    init = "1",
    computerName = "whatsapp"
  }) => {
    try {
      // Prepare the appointment data
      const appointmentData = {
        SERV_TYPE: servType,
        buffer_status: bufferStatus,
        INIT: init,
        COMPUTER_NAME: computerName,
        BRANCH_ID: branchId,
        CLINIC_ID: clinicId,
        DOC_ID: docId,
        SCHED_SERIAL: schedSerial,
        SHIFT_ID: shiftId,
        dateDone: dateDone,
        EXPECTED_END_DATE: expectedEndDate,
        PAT_TEL: patTel,
        TELEPHONE_COUNTRY_CODE: telephoneCountryCode
      };

      if (specialtyId) {
        appointmentData.SPECIALTY_ID = specialtyId;
      }

      // Add patient-specific data
      if (patientId) {
        // Registered patient
        appointmentData.PATIENT_ID = patientId;
      } else if (patName && gender) {
        // Non-registered patient
        appointmentData.PAT_NAME = patName;
        appointmentData.GENDER = gender;
      }

      const response = await fetchWithTimeout('https://salemuatapi.alsalamhosp.com:446/submit_appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      });

      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool: send_whatsapp_message
server.registerTool(
  "send_whatsapp_message",
  {
    description: "Send WhatsApp message to patient",
    inputSchema: {
      phoneNumber: z.string().describe("Patient's phone number with country code (e.g., +96569020323)"),
      message: z.string().describe("Message content to send")
    },
  },
  async ({ phoneNumber, message }) => {
    try {
      // Remove + sign from phone number for WhatsApp API
      const cleanPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

      const response = await fetchWithTimeout('https://graph.facebook.com/v21.0/634818759725194/messages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer EAAPwnEgzTZBEBPBg6nWtTAHq5MTOgahk0Mz2GGmH2jZBs6HQXY4tWmX4s2pOUbG2IkN6Im2SyPY4yGZAo5wuPvTBWZCqJZBQV4NZB3FnlNaaLqCDJU4r3sKpHtH42TKnm7Ys3ZBx0MSzYUogD5DkOfvw1ZC43snYDzRsZBZB2zUFZC8vZACxfDfmZCWMZA7esNKPhbTCTA3uL2yQicTdaGZCzowHDf7wdYIfE8aT19wBElCxbdcQJi4yY3IuuWVQxw5fE8ZAaVsLjdw8LQZDZD',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhoneNumber,
          type: "text",
          text: {
            preview_url: false,
            body: message
          }
        })
      });

      const data = await response.json();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: response.ok,
            message: response.ok ? "WhatsApp message sent successfully" : "Failed to send WhatsApp message",
            phoneNumber: phoneNumber,
            whatsappResponse: data
          }, null, 2)
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error sending WhatsApp message: ${error.message}` }],
      };
    }
  }
);

// SSE and Server setup
const transports = {};

app.get('/mcp', async (req, res) => {
  try {
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;

    if (transports[sessionId]) {
      try {
        await transports[sessionId].close();
      } catch (e) { }
      delete transports[sessionId];
    }

    transports[sessionId] = transport;
    transport.onclose = () => delete transports[sessionId];

    await server.connect(transport);
  } catch (error) {
    if (!res.headersSent) res.status(500).send('Error establishing SSE stream');
  }
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId || !transports[sessionId]) {
    res.status(404).send('Session not found');
    return;
  }
  await transports[sessionId].handlePostMessage(req, res, req.body);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'AlSalamHospitalNewMCP',
    version: '1.0.0',
    tools: [
      'search_individual',
      'get_doc_next_availble_slot',
      'check_patient_whatsapp',
      'select_doctor_from_list',
      'generate_otp',
      'verify_otp',
      'submit_appointment',
      'send_whatsapp_message'
    ]
  });
});

app.listen(port, () => {
  console.log(`New MCP server running at http://localhost:${port}`);
});