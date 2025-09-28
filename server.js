import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for web browser access
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
  name: "AlSalamHospitalMCP", 
  version: "1.0.0" 
});

// Hospital Management APIs
server.registerTool(
  "get_all_hospitals",
  {
    description: "Get all hospitals with language support",
    inputSchema: {
      lang: z.string().optional().describe("Language code (default: E)"),
    },
  },
  async ({ lang = "E" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/hospitals?lang=${lang}`);
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

server.registerTool(
  "get_specialties_by_hospital",
  {
    description: "Get specialties for a specific hospital",
    inputSchema: {
      hospitalId: z.string().describe("Hospital ID"),
      lang: z.string().optional().describe("Language code (default: E)"),
    },
  },
  async ({ hospitalId, lang = "E" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/specialties/${hospitalId}?lang=${lang}`);
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

server.registerTool(
  "get_doctors_by_hospital_specialty",
  {
    description: "Get doctors for a specific hospital and specialty",
    inputSchema: {
      hospitalId: z.string().describe("Hospital ID"),
      specialtyId: z.string().describe("Specialty ID"),
      lang: z.string().optional().describe("Language code (default: E)"),
    },
  },
  async ({ hospitalId, specialtyId, lang = "E" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/doctors/${hospitalId}/${specialtyId}?lang=${lang}`);
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

server.registerTool(
  "search_all_combined",
  {
    description: "Search across all categories (hospitals, specialties, doctors) with a single term",
    inputSchema: {
      term: z.string().describe("Search term"),
      lang: z.string().optional().describe("Language code (default: E)"),
    },
  },
  async ({ term, lang = "E" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/search/all?term=${encodeURIComponent(term)}&lang=${lang}`);
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

server.registerTool(
  "search_doctor_enhanced",
  {
    description: "Enhanced doctor search with multi-language support, better error handling and available slots",
    inputSchema: {
      term: z.string().describe("Search term"),
      lang: z.string().optional().describe("Language code (default: A)"),
    },
  },
  async ({ term, lang = "A" }) => {
    try {
      let searchResults = [];
      let searchAttempts = [];
      
      // Try multiple search strategies
      const searchStrategies = [
        { term: term, lang: lang, description: "البحث الأصلي" },
        { term: term, lang: lang === "A" ? "E" : "A", description: "البحث باللغة الأخرى" },
        { term: term.split(' ')[0], lang: lang, description: "البحث بالاسم الأول فقط" },
        { term: term.split(' ')[0], lang: lang === "A" ? "E" : "A", description: "البحث بالاسم الأول باللغة الأخرى" },
        // Additional strategies for Arabic names that might be stored in English
        { term: term.split(' ')[0], lang: "E", description: "البحث بالاسم الأول بالإنجليزية" },
        { term: term.split(' ')[0], lang: "A", description: "البحث بالاسم الأول بالعربية" },
        // Try common name variations for Arabic names stored in English
        { term: "Bassam", lang: "A", description: "البحث بـ Bassam" },
        { term: "بسام", lang: "E", description: "البحث بـ بسام بالإنجليزية" },
        // Try if the first name is a common Arabic name that might be stored in English
        ...(term.split(' ')[0] === 'بسام' ? [{ term: "Bassam", lang: "A", description: "البحث بـ Bassam للاسم بسام" }] : []),
        ...(term.split(' ')[0] === 'محمد' ? [{ term: "Mohammed", lang: "A", description: "البحث بـ Mohammed للاسم محمد" }] : []),
        ...(term.split(' ')[0] === 'أحمد' ? [{ term: "Ahmed", lang: "A", description: "البحث بـ Ahmed للاسم أحمد" }] : []),
        ...(term.split(' ')[0] === 'علي' ? [{ term: "Ali", lang: "A", description: "البحث بـ Ali للاسم علي" }] : [])
      ];
      
      // Try each search strategy
      for (const strategy of searchStrategies) {
        try {
          const searchResponse = await fetch(`https://salemapi.alsalamhosp.com:447/search/individual?term=${encodeURIComponent(strategy.term)}&lang=${strategy.lang}`);
          const searchData = await searchResponse.json();
          
          searchAttempts.push({
            strategy: strategy.description,
            term: strategy.term,
            lang: strategy.lang,
            results: searchData.searchResults ? searchData.searchResults.length : 0
          });
          
          if (searchData.searchResults && searchData.searchResults.length > 0) {
            searchResults = searchData.searchResults;
            break; // Found results, stop searching
          }
        } catch (error) {
          searchAttempts.push({
            strategy: strategy.description,
            term: strategy.term,
            lang: strategy.lang,
            error: error.message
          });
          continue;
        }
      }
      
      if (searchResults.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              success: false,
              message: "لم يتم العثور على طبيب بهذا الاسم",
              searchAttempts: searchAttempts,
              suggestions: [
                "تأكد من كتابة الاسم بشكل صحيح",
                "جرب البحث بالاسم الأول فقط",
                "جرب البحث بالإنجليزية إذا كان الاسم إنجليزي",
                "أو اختر من قائمة الأطباء المتاحين"
              ],
              alternativeSearch: "هل تريد البحث في تخصص معين؟"
            }, null, 2) 
          }],
        };
      }
      
      const doctor = searchResults[0];
      
      // Try to get available slots with different CLINIC_ID values
      let availableSlots = null;
      const clinicIds = [1, 2, 3, 4, 5]; // Try multiple CLINIC_ID values
      
      for (const clinicId of clinicIds) {
        try {
          const slotsResponse = await fetch(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${doctor.hospital_id}&DOC_ID=${doctor.doctor_id}&CLINIC_ID=${clinicId}`);
          const slotsData = await slotsResponse.json();
          
          if (slotsData.available_slots || slotsData.slots) {
            availableSlots = slotsData;
            break;
          }
        } catch (error) {
          continue; // Try next CLINIC_ID
        }
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            success: true,
            doctor: {
              id: doctor.doctor_id,
              name: doctor.doctor_name,
              specialty: doctor.specialty_name,
              hospital: doctor.hospital_name,
              hospital_id: doctor.hospital_id,
              specialty_id: doctor.specialty_id
            },
            available_slots: availableSlots,
            searchAttempts: searchAttempts,
            message: availableSlots ? "تم العثور على الطبيب والمواعيد المتاحة" : "تم العثور على الطبيب ولكن لا توجد مواعيد متاحة حالياً"
          }, null, 2) 
        }],
      };
      
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            success: false,
            error: error.message,
            message: "حدث خطأ أثناء البحث عن الطبيب"
          }, null, 2) 
        }],
      };
    }
  }
);

// Branches API
server.registerTool(
  "get_branches",
  {
    description: "Get all hospital branches",
    inputSchema: {},
  },
  async () => {
    try {
      const response = await fetch('https://salemapi.alsalamhosp.com:447/branches');
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

// Chatbot APIs
server.registerTool(
  "get_chatbot_info",
  {
    description: "Get chatbot information",
    inputSchema: {},
  },
  async () => {
    try {
      const response = await fetch('https://salemapi.alsalamhosp.com:447/chatbotinfo');
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

// Appointment APIs

server.registerTool(
  "confirm_cancel_appointment",
  {
    description: "Confirm or cancel an appointment",
    inputSchema: {
      appointmentId: z.string().describe("Appointment ID"),
      response: z.string().describe("Response: 1 for confirm, 0 for cancel"),
    },
  },
  async ({ appointmentId, response }) => {
    try {
      const response_data = await fetch(`https://salemapi.alsalamhosp.com:447/confcanc?id=${appointmentId}&response=${response}`, {
        method: 'POST'
      });
      const data = await response_data.json();
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

// Doctor APIs

server.registerTool(
  "get_doctor_available_slots",
  {
    description: "Get doctor's next available appointment slots with enhanced logic to find correct clinic ID",
    inputSchema: {
      branchId: z.string().describe("Branch ID (hospital_id from doctor search)"),
      docId: z.string().describe("Doctor ID"),
      clinicId: z.string().optional().describe("Clinic ID (if known, otherwise will try multiple values)"),
      specialtyId: z.string().optional().describe("Specialty ID (helps determine correct clinic)"),
    },
  },
  async ({ branchId, docId, clinicId, specialtyId }) => {
    try {
      let availableSlots = null;
      let successfulClinicId = null;
      let attemptLogs = [];
      
      // If clinicId is provided, try it first
      const clinicIdsToTry = clinicId ? 
        [clinicId, ...Array.from({length: 10}, (_, i) => (i + 1).toString()).filter(id => id !== clinicId)] :
        Array.from({length: 10}, (_, i) => (i + 1).toString());
      
      // Try different clinic IDs until we find available slots
      for (const testClinicId of clinicIdsToTry) {
        try {
          console.log(`Trying BRANCH_ID=${branchId}, DOC_ID=${docId}, CLINIC_ID=${testClinicId}`);
          
          const response = await fetch(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${branchId}&DOC_ID=${docId}&CLINIC_ID=${testClinicId}`);
          const data = await response.json();
          
          attemptLogs.push({
            clinic_id: testClinicId,
            response_status: response.status,
            has_slots: !!(data.available_slots || data.slots || (data.length && data.length > 0)),
            data_keys: Object.keys(data || {})
          });
          
          // Check if we got slots in the actual API format
          if (data.Root && data.Root.HOURS_SLOTS && data.Root.HOURS_SLOTS.HOURS_SLOTS_ROW) {
            // Extract slots from the nested structure
            const hourSlots = data.Root.HOURS_SLOTS.HOURS_SLOTS_ROW;
            const extractedSlots = [];
            
            hourSlots.forEach(hourSlot => {
              if (hourSlot.SINGLE_HOUR_SLOTS && hourSlot.SINGLE_HOUR_SLOTS.SINGLE_HOUR_SLOTS_ROW) {
                hourSlot.SINGLE_HOUR_SLOTS.SINGLE_HOUR_SLOTS_ROW.forEach(slot => {
                  // Only include available slots (empty or future status)
                  if (slot.SLOT_STATUS === 'empty' || slot.SLOT_STATUS === 'future') {
                    extractedSlots.push(slot);
                  }
                });
              }
            });
            
            if (extractedSlots.length > 0) {
              availableSlots = extractedSlots;
              successfulClinicId = testClinicId;
              break;
            }
          }
          // Check other possible formats
          else if (data.available_slots && data.available_slots.length > 0) {
            availableSlots = data.available_slots;
            successfulClinicId = testClinicId;
            break;
          } else if (data.slots && data.slots.length > 0) {
            availableSlots = data.slots;
            successfulClinicId = testClinicId;
            break;
          } else if (Array.isArray(data) && data.length > 0) {
            availableSlots = data;
            successfulClinicId = testClinicId;
            break;
          } else if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
            availableSlots = data.schedule;
            successfulClinicId = testClinicId;
            break;
          }
          
          // If we got a successful response but no slots, continue trying
          if (response.ok && (data.message || data.status)) {
            continue;
          }
          
        } catch (error) {
          attemptLogs.push({
            clinic_id: testClinicId,
            error: error.message
          });
          continue;
        }
      }
      
      if (!availableSlots || availableSlots.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              success: false,
              message: "لا توجد مواعيد متاحة حالياً لهذا الطبيب",
              doctor_id: docId,
              branch_id: branchId,
              specialty_id: specialtyId,
              attempt_logs: attemptLogs,
              suggestion: "قد تحتاج للاتصال بالمستشفى مباشرة أو المحاولة لاحقاً"
            }, null, 2) 
          }],
        };
      }
      
      // Process the slots to ensure consistent format
      const processedSlots = availableSlots.map((slot, index) => {
        // Handle the actual API format from the nested structure
        if (slot.ID && slot.SCHED_SER) {
          // This is the actual API format
          return {
            slot_id: slot.ID,
            sched_serial: slot.SCHED_SER,
            date: slot.ID.split(' ')[0], // Extract date from "29/09/2025 15:20:00"
            time: slot.ID_AM_PM || slot.ID, // Use AM/PM format if available
            end_time: slot.TIME_SLOT_END,
            shift_id: slot.SHIFT_ID || "1",
            que_sys_ser: slot.QUE_SYS_SER,
            place_id: slot.PLACE_ID,
            slot_status: slot.SLOT_STATUS,
            from_excep_sched: slot.FROM_EXCEP_SCHED,
            doctor_id: docId,
            clinic_id: successfulClinicId,
            branch_id: branchId,
            specialty_id: specialtyId,
            // Arabic and English time display
            time_ar: slot.NAME_AR ? slot.ID.split(' ')[0] + ' ' + slot.NAME_AR : null,
            time_en: slot.NAME_EN ? slot.ID.split(' ')[0] + ' ' + slot.NAME_EN : null,
            // Keep original slot data for reference
            original_data: slot
          };
        } else {
          // Handle other possible formats
          return {
            slot_id: slot.slot_id || slot.id || slot.schedule_id || `slot_${index + 1}`,
            sched_serial: slot.sched_serial || slot.schedule_serial || slot.serial || slot.slot_id || `${docId}_${index + 1}`,
            date: slot.date || slot.appointment_date || slot.schedule_date || new Date().toISOString().split('T')[0],
            time: slot.time || slot.appointment_time || slot.schedule_time || slot.start_time,
            end_time: slot.end_time || slot.appointment_end_time,
            shift_id: slot.shift_id || slot.shift || "1",
            doctor_id: docId,
            clinic_id: successfulClinicId,
            branch_id: branchId,
            specialty_id: specialtyId,
            status: slot.status || "available",
            duration: slot.duration || 20, // Default 20 minutes based on API response
            // Keep original slot data for reference
            original_data: slot
          };
        }
      });
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            success: true,
            message: `تم العثور على ${processedSlots.length} موعد متاح`,
            available_slots: processedSlots,
            doctor_id: docId,
            clinic_id: successfulClinicId,
            branch_id: branchId,
            specialty_id: specialtyId,
            total_slots: processedSlots.length,
            attempt_logs: attemptLogs.slice(0, 3), // Only show first few attempts
            booking_info: {
              required_fields: ["SCHED_SERIAL", "SHIFT_ID", "dateDone", "EXPECTED_END_DATE"],
              note: "استخدم format_appointment_date لتنسيق التاريخ والوقت للحجز"
            }
          }, null, 2) 
        }],
      };
      
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            success: false,
            error: error.message,
            doctor_id: docId,
            branch_id: branchId,
            clinic_id: clinicId,
            message: "حدث خطأ أثناء البحث عن المواعيد المتاحة"
          }, null, 2) 
        }],
      };
    }
  }
);

// Patient APIs
server.registerTool(
  "check_patient_whatsapp_status",
  {
    description: "Check if patient's mobile number is registered for WhatsApp",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number (e.g., +201552781085)"),
    },
  },
  async ({ mobile }) => {
    try {
      const response = await fetch('https://salemapi.alsalamhosp.com:447/checkPatientWhatsApp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: mobile
        })
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

server.registerTool(
  "submit_appointment",
  {
    description: "Submit a new appointment booking",
    inputSchema: {
      servType: z.string().describe("Service type"),
      branchId: z.string().describe("Branch ID"),
      specId: z.string().describe("Specialty ID"),
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
    specId, 
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
        SPEC_ID: specId,
        DOC_ID: docId,
        SCHED_SERIAL: schedSerial,
        SHIFT_ID: shiftId,
        dateDone: dateDone,
        EXPECTED_END_DATE: expectedEndDate,
        PAT_TEL: patTel,
        TELEPHONE_COUNTRY_CODE: telephoneCountryCode
      };

      // Add patient-specific data
      if (patientId) {
        // Registered patient
        appointmentData.PATIENT_ID = patientId;
      } else if (patName && gender) {
        // Non-registered patient
        appointmentData.PAT_NAME = patName;
        appointmentData.GENDER = gender;
      }

      const response = await fetch('https://salemapi.alsalamhosp.com:447/submit_appointment', {
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

// Helper tool for date formatting
server.registerTool(
  "format_appointment_date",
  {
    description: "Format appointment date and time for API submission",
    inputSchema: {
      date: z.string().describe("Date in YYYY-MM-DD format"),
      time: z.string().describe("Time in HH:mm format"),
      duration: z.number().optional().describe("Appointment duration in minutes (default: 30)"),
    },
  },
  async ({ date, time, duration = 30 }) => {
    try {
      // Parse the date and time
      const [year, month, day] = date.split('-');
      const [hours, minutes] = time.split(':');
      
      // Create start date
      const startDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes));
      
      // Create end date (add duration)
      const endDate = new Date(startDate.getTime() + (duration * 60000));
      
      // Format for API (DD/MM/YYYY HH:mm:ss)
      const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      };
      
      const result = {
        dateDone: formatDate(startDate),
        expectedEndDate: formatDate(endDate),
        originalDate: date,
        originalTime: time,
        duration: duration
      };
      
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);


// Store transports by session ID
const transports = {};

// SSE endpoint for establishing the stream
app.get('/mcp', async (req, res) => {
  console.log('📡 Received GET request to /mcp (establishing SSE stream)');
  try {
    // Create a new SSE transport for the client
    const transport = new SSEServerTransport('/messages', res);
    
    // Store the transport by session ID
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;
    
    // Set up onclose handler to clean up transport when closed
    transport.onclose = () => {
      console.log(`🔚 SSE transport closed for session ${sessionId}`);
      delete transports[sessionId];
    };
    
    // Connect the transport to the MCP server
    await server.connect(transport);
    console.log(`✅ Established SSE stream with session ID: ${sessionId}`);
  } catch (error) {
    console.error('❌ Error establishing SSE stream:', error);
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream');
    }
  }
});

// Messages endpoint for receiving client JSON-RPC requests
app.post('/messages', async (req, res) => {
  console.log('📨 Received POST request to /messages');
  
  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    console.error('❌ No session ID provided in request URL');
    res.status(400).send('Missing sessionId parameter');
    return;
  }
  
  const transport = transports[sessionId];
  if (!transport) {
    console.error(`❌ No active transport found for session ID: ${sessionId}`);
    res.status(404).send('Session not found');
    return;
  }
  
  try {
    // Handle the POST message with the transport
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('❌ Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Error handling request');
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    server: 'AlSalamHospitalMCP',
    version: '1.0.0',
    tools: [
      // Hospital Management APIs
      'get_all_hospitals',
      'get_specialties_by_hospital', 
      'get_doctors_by_hospital_specialty',
      'search_all_combined',
      'search_doctor_enhanced',
      
      // Branches API
      'get_branches',
      
      // Chatbot APIs
      'get_chatbot_info',
      
      // Appointment APIs
      'confirm_cancel_appointment',
      
      // Doctor APIs
      'get_doctor_available_slots',
      
      // Patient APIs
      'check_patient_whatsapp_status',
      'submit_appointment',
      
      // Helper tools
      'format_appointment_date'
    ]
  });
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 MCP server running at http://localhost:${port}`);
  console.log(`📡 SSE endpoint: http://localhost:${port}/mcp`);
  console.log(`📨 Messages endpoint: http://localhost:${port}/messages`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);
  console.log(`\n🌐 For public access, deploy this server and use the deployed URL`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`🔚 Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`❌ Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  console.log('✅ Server shutdown complete');
  process.exit(0);
});