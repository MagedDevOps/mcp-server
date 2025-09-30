import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// Timeout configuration
const REQUEST_TIMEOUT = 50000; // 50 seconds timeout for all API requests

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
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/hospitals?lang=${lang}`);
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
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/specialties/${hospitalId}?lang=${lang}`);
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
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/doctors/${hospitalId}/${specialtyId}?lang=${lang}`);
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
  "search_individual_category",
  {
    description: "Enhanced search within individual categories with multi-language support, better error handling and available slots",
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
        // Try if the first name is a common Arabic name that might be stored in English
        ...(term.split(' ')[0] === 'بسام' ? [{ term: "Bassam", lang: "A", description: "البحث بـ Bassam للاسم بسام" }] : []),
        ...(term.split(' ')[0] === 'محمد' ? [{ term: "Mohammed", lang: "A", description: "البحث بـ Mohammed للاسم محمد" }] : []),
        ...(term.split(' ')[0] === 'أحمد' ? [{ term: "Ahmed", lang: "A", description: "البحث بـ Ahmed للاسم أحمد" }] : []),
        ...(term.split(' ')[0] === 'علي' ? [{ term: "Ali", lang: "A", description: "البحث بـ Ali للاسم علي" }] : []),
        ...(term.split(' ')[0] === 'ريم' ? [{ term: "Rima", lang: "A", description: "البحث بـ Rima للاسم ريم" }] : [])
      ];
      
      // Try each search strategy
      for (const strategy of searchStrategies) {
        try {
          const searchResponse = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/search/individual?term=${encodeURIComponent(strategy.term)}&lang=${strategy.lang}`);
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
      
      // Handle multiple doctors
      if (searchResults.length > 1) {
        // Return list of doctors for user selection
        const doctorsList = searchResults.map((doctor, index) => ({
          doctor_id: doctor.doctor_id,
          doctor_name: doctor.doctor_name,
          specialty_name: doctor.specialty_name,
          hospital_name: doctor.hospital_name,
          hospital_id: doctor.hospital_id,
          specialty_id: doctor.specialty_id,
          index: index + 1
        }));
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              success: true,
              multiple_doctors: true,
              doctors: doctorsList,
              searchResults: searchResults, // Keep original format for select_doctor_from_list
              total_count: searchResults.length,
              searchAttempts: searchAttempts,
              message: `تم العثور على ${searchResults.length} أطباء بهذا الاسم. يرجى اختيار الطبيب المطلوب من القائمة.`
            }, null, 2) 
          }],
        };
      }
      
      // Handle single doctor - get available slots
      const doctor = searchResults[0];
      
      // Try to get available slots using specialty_id as CLINIC_ID
      let availableSlots = null;
      const clinicIds = [doctor.specialty_id, 1, 2, 3, 4, 5]; // Try specialty_id first, then fallback values
      
      for (const clinicId of clinicIds) {
        try {
          const slotsResponse = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${doctor.hospital_id}&DOC_ID=${doctor.doctor_id}&CLINIC_ID=${clinicId}`);
          const slotsData = await slotsResponse.json();
          
          // Check if we got valid slots data (not an error)
          if (slotsData.Root && slotsData.Root.HOURS_SLOTS) {
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
            single_doctor: true,
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
            message: availableSlots ? 
              `تم العثور على الطبيب والمواعيد المتاحة. الموعد التالي المتاح: ${availableSlots.Root.next_available_time}` : 
              "تم العثور على الطبيب ولكن لا توجد مواعيد متاحة حالياً"
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
      const response = await fetchWithTimeout('https://salemapi.alsalamhosp.com:447/branches');
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
      const response = await fetchWithTimeout('https://salemapi.alsalamhosp.com:447/chatbotinfo');
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
      const response_data = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/confcanc?id=${appointmentId}&response=${response}`, {
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
  "get_doctor_available_days",
  {
    description: "Get available days for a specific doctor",
    inputSchema: {
      branchId: z.string().describe("Branch ID"),
      docId: z.string().describe("Doctor ID"),
      clinicId: z.string().describe("Clinic ID"),
    },
  },
  async ({ branchId, docId, clinicId }) => {
    try {
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${branchId}&CLINIC_ID=${clinicId}&DOC_ID=${docId}&SCHEDULE_DAYS_ONLY=1&mobileapp_whatsapp=2`);
      const data = await response.json();
      
      // Process the response to extract available days
      let availableDays = [];
      if (data.Root && data.Root.DOC_DAYS && data.Root.DOC_DAYS.DOC_DAYS_ROW) {
        availableDays = data.Root.DOC_DAYS.DOC_DAYS_ROW.map(day => ({
          schedule_date: day.SCHEDULE_DATE,
          day_number: day.DAYNUMBER,
          day_name_ar: day.DAYNAME_AR,
          day_name_en: day.DAYNAME_EN,
          emp_id: day.EMP_ID
        }));
      }
      
      // Filter to only show next 14 days (2 weeks) from current date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      const twoWeeksFromNow = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000));
      twoWeeksFromNow.setHours(23, 59, 59, 999); // Normalize to end of day
      
      availableDays = availableDays.filter(day => {
        // Parse date from DD/MM/YYYY format
        const dateParts = day.schedule_date.split(' ')[0].split('/');
        const dayDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        dayDate.setHours(0, 0, 0, 0); // Normalize to start of day
        return dayDate >= today && dayDate <= twoWeeksFromNow;
      });
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            success: true,
            doctor_id: docId,
            branch_id: branchId,
            clinic_id: clinicId,
            available_days: availableDays,
            raw_response: data
          }, null, 2) 
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error getting doctor available days: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "get_doctor_available_slots",
  {
    description: "Get available time slots for a specific doctor on a specific date",
    inputSchema: {
      branchId: z.string().describe("Branch ID"),
      docId: z.string().describe("Doctor ID"),
      clinicId: z.string().describe("Clinic ID"),
      selectedDate: z.string().describe("Selected date in DD/MM/YYYY format (e.g., 13/10/2025)"),
    },
  },
  async ({ branchId, docId, clinicId, selectedDate }) => {
    try {
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${branchId}&CLINIC_ID=${clinicId}&DOC_ID=${docId}&SCHEDULE_DAYS_ONLY=0&Web_FromDate=${selectedDate}&mobileapp_whatsapp=2`);
      const data = await response.json();
      
      // Process the response to include SCHED_SERIAL for each slot
      let processedSlots = [];
      if (data.Root && data.Root.HOURS_SLOTS && data.Root.HOURS_SLOTS.HOURS_SLOTS_ROW) {
        processedSlots = data.Root.HOURS_SLOTS.HOURS_SLOTS_ROW.map(hourSlot => {
          if (hourSlot.SINGLE_HOUR_SLOTS && hourSlot.SINGLE_HOUR_SLOTS.SINGLE_HOUR_SLOTS_ROW) {
            // Handle both array and single object cases
            const slots = Array.isArray(hourSlot.SINGLE_HOUR_SLOTS.SINGLE_HOUR_SLOTS_ROW) 
              ? hourSlot.SINGLE_HOUR_SLOTS.SINGLE_HOUR_SLOTS_ROW 
              : [hourSlot.SINGLE_HOUR_SLOTS.SINGLE_HOUR_SLOTS_ROW];
            
            return slots.map(slot => ({
              time: slot.ID_AM_PM ? slot.ID_AM_PM.split(' ')[1] + ' ' + slot.ID_AM_PM.split(' ')[2] : slot.NAME_AR,
              time_en: slot.ID_AM_PM ? slot.ID_AM_PM.split(' ')[1] + ' ' + slot.ID_AM_PM.split(' ')[2] : slot.NAME_EN,
              id: slot.ID,
              id_am_pm: slot.ID_AM_PM,
              status: slot.SLOT_STATUS,
              schedule_serial: slot.SCHED_SER,
              place_id: slot.PLACE_ID,
              shift_id: slot.SHIFT_ID
            }));
          }
          return [];
        }).flat();
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            success: true,
            doctor_id: docId,
            branch_id: branchId,
            clinic_id: clinicId,
            selected_date: selectedDate,
            available_slots: processedSlots,
            next_available_time: data.Root?.next_available_time || null,
            next_available_schedule_serial: data.Root?.NEXT_AVAILABLE_SCHED_SER || null,
            mobile_app_times: data.Root?.MOBILE_APP_TIMES?.MOBILE_APP_TIMES_ROW || null,
            raw_response: data
          }, null, 2) 
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error getting doctor slots: ${error.message}` }],
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
      const response = await fetchWithTimeout('https://salemapi.alsalamhosp.com:447/checkPatientWhatsApp', {
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

      const response = await fetchWithTimeout('https://salemapi.alsalamhosp.com:447/submit_appointment', {
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

// Helper tool to select a specific doctor from multiple results
server.registerTool(
  "select_doctor_from_list",
  {
    description: "Select a specific doctor from multiple search results and get their available slots",
    inputSchema: {
      doctorIndex: z.number().describe("Index of the selected doctor (1-based)"),
      searchResults: z.array(z.object({
        doctor_id: z.string(),
        doctor_name: z.string(),
        specialty_id: z.string(),
        specialty_name: z.string(),
        hospital_id: z.string(),
        hospital_name: z.string()
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
              message: `رقم غير صحيح. يرجى اختيار رقم بين 1 و ${searchResults.length}`,
              available_doctors: searchResults.length
            }, null, 2) 
          }],
        };
      }
      
      const selectedDoctor = searchResults[doctorIndex - 1];
      
      // Get available days for the selected doctor
      let availableDays = [];
      try {
        const daysResponse = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${selectedDoctor.hospital_id}&DOC_ID=${selectedDoctor.doctor_id}&CLINIC_ID=${selectedDoctor.specialty_id}&SCHEDULE_DAYS_ONLY=1&mobileapp_whatsapp=2`);
        const daysData = await daysResponse.json();
        
        if (daysData.Root && daysData.Root.DOC_DAYS && daysData.Root.DOC_DAYS.DOC_DAYS_ROW) {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Normalize to start of day
          const twoWeeksFromNow = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000));
          twoWeeksFromNow.setHours(23, 59, 59, 999); // Normalize to end of day
          
          availableDays = daysData.Root.DOC_DAYS.DOC_DAYS_ROW.filter(day => {
            // Parse date from DD/MM/YYYY format
            const dateParts = day.SCHEDULE_DATE.split(' ')[0].split('/');
            const dayDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
            dayDate.setHours(0, 0, 0, 0); // Normalize to start of day
            return dayDate >= today && dayDate <= twoWeeksFromNow;
          });
        }
      } catch (error) {
        console.log('Error getting available days:', error.message);
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
              specialty_id: selectedDoctor.specialty_id
            },
            available_days: availableDays,
            message: availableDays.length > 0 ? 
              `تم اختيار د. ${selectedDoctor.doctor_name} (${selectedDoctor.specialty_name}) في ${selectedDoctor.hospital_name}. الأيام المتاحة: ${availableDays.length} يوم` : 
              "تم اختيار الطبيب ولكن لا توجد أيام متاحة حالياً خلال الأسبوعين القادمين"
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

// Helper tool to get available slots for a specific doctor
server.registerTool(
  "get_doctor_slots_by_specialty",
  {
    description: "Get available slots for a doctor using specialty_id as CLINIC_ID",
    inputSchema: {
      hospitalId: z.string().describe("Hospital ID"),
      doctorId: z.string().describe("Doctor ID"),
      specialtyId: z.string().describe("Specialty ID (used as CLINIC_ID)"),
    },
  },
  async ({ hospitalId, doctorId, specialtyId }) => {
    try {
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${hospitalId}&DOC_ID=${doctorId}&CLINIC_ID=${specialtyId}`);
      const data = await response.json();
      
      if (data.Root && data.Root.HOURS_SLOTS) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              success: true,
              available_slots: data,
              next_available_time: data.Root.next_available_time,
              doctor_id: doctorId,
              hospital_id: hospitalId,
              specialty_id: specialtyId
            }, null, 2) 
          }],
        };
      } else {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              success: false,
              message: "No available slots found",
              error: data.error || "Unknown error",
              doctor_id: doctorId,
              hospital_id: hospitalId,
              specialty_id: specialtyId
            }, null, 2) 
          }],
        };
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// OTP Verification APIs
server.registerTool(
  "generate_otp",
  {
    description: "Generate OTP for existing patient verification",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number with country code (e.g., +96569020323)")
    },
  },
  async ({ mobile }) => {
    try {
      // Remove + sign from mobile number as API expects format without +
      const cleanMobile = mobile.startsWith('+') ? mobile.substring(1) : mobile;
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/otp/generate?mobile=${encodeURIComponent(cleanMobile)}&source=WhatsApp`, {
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

server.registerTool(
  "verify_otp",
  {
    description: "Verify OTP for existing patient verification",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number with country code (e.g., +96569020323)"),
      otpCode: z.string().describe("OTP code entered by patient")
    },
  },
  async ({ mobile, otpCode }) => {
    try {
      // Remove + sign from mobile number as API expects format without +
      const cleanMobile = mobile.startsWith('+') ? mobile.substring(1) : mobile;
      const response = await fetchWithTimeout(`https://salemapi.alsalamhosp.com:447/otp/verify?mobile=${encodeURIComponent(cleanMobile)}&source=WhatsApp`, {
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

// WhatsApp messaging tool
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
          'Authorization': 'Bearer F3gpxnJ2BoptJo2Q9BBohtXG9JDTTgaIib5zqTREFTSAqwlo4OJJ72BCRfxxWo45onQapDXrH84965LyUEREFTSAIcD1o33TfiDSYSr8YIvaIv5pbmVEJTopJ755wAiAv5k3c',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhoneNumber,
          type: "text",
          text: {
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
      'search_individual_category',
      
      // Branches API
      'get_branches',
      
      // Chatbot APIs
      'get_chatbot_info',
      
      // Appointment APIs
      'confirm_cancel_appointment',
      
      // Doctor APIs
      'get_doctor_available_days',
      'get_doctor_available_slots',
      
      // Patient APIs
      'check_patient_whatsapp_status',
      'submit_appointment',
      
      // OTP Verification APIs
      'generate_otp',
      'verify_otp',
      
      // WhatsApp APIs
      'send_whatsapp_message',
      
      // Helper tools
      'format_appointment_date',
      'get_doctor_slots_by_specialty',
      'select_doctor_from_list'
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

