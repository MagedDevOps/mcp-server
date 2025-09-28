/**
 * Archived MCP tool registrations (temporarily removed from server.js)
 *
 * This file is for safekeeping only. All contents are commented out and NOT executed.
 * To restore any tool, copy the corresponding registration back into server.js.
 */

/*
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
  "search_individual_category",
  {
    description: "Search within individual categories",
    inputSchema: {
      term: z.string().describe("Search term"),
      lang: z.string().optional().describe("Language code (default: E)"),
    },
  },
  async ({ term, lang = "E" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/search/individual?term=${encodeURIComponent(term)}&lang=${lang}`);
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

server.registerTool(
  "get_chatbot_menu",
  {
    description: "Get chatbot menu items",
    inputSchema: {
      lang: z.string().optional().describe("Language code (default: E)"),
    },
  },
  async ({ lang = "E" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/menu/0?lang=${lang}`);
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
  "get_appointments_count",
  {
    description: "Get appointments count for a specific date",
    inputSchema: {
      date: z.string().describe("Date in MM-DD-YYYY format (e.g., 08-25-2025)"),
    },
  },
  async ({ date }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/msgcount?today=${date}`);
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
  "get_patient_pending_appointments",
  {
    description: "Get patient's pending appointments by phone number",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number (e.g., +96569020323)"),
    },
  },
  async ({ mobile }) => {
    try {
      const response = await fetch('https://salemapi.alsalamhosp.com:447/byphone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pat_mobile: mobile
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
    description: "Get doctor's next available appointment slots",
    inputSchema: {
      branchId: z.string().describe("Branch ID"),
      docId: z.string().describe("Doctor ID"),
      clinicId: z.string().describe("Clinic ID"),
    },
  },
  async ({ branchId, docId, clinicId }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/get_doc_next_availble_slot?BRANCH_ID=${branchId}&DOC_ID=${docId}&CLINIC_ID=${clinicId}`);
      const data = await response.json();
      if (data.available_slots || data.slots) {
        const slots = data.available_slots || data.slots;
        const processedSlots = slots.map((slot, index) => ({
          ...slot,
          sched_serial: slot.sched_serial || slot.slot_id || `slot_${index + 1}`,
          slot_id: slot.slot_id || `slot_${index + 1}`,
          date: slot.date || new Date().toISOString().split('T')[0],
          time: slot.time || slot.appointment_time,
          doctor_id: docId,
          clinic_id: clinicId,
          branch_id: branchId
        }));
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              available_slots: processedSlots,
              doctor_id: docId,
              clinic_id: clinicId,
              branch_id: branchId
            }, null, 2) 
          }],
        };
      }
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

// Appointment submission
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
    servType, branchId, specId, docId, schedSerial, shiftId, dateDone, expectedEndDate, patTel, telephoneCountryCode, patientId, patName, gender, bufferStatus = "1", init = "1", computerName = "whatsapp"
  }) => {
    try {
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
      if (patientId) {
        appointmentData.PATIENT_ID = patientId;
      } else if (patName && gender) {
        appointmentData.PAT_NAME = patName;
        appointmentData.GENDER = gender;
      }
      const response = await fetch('https://salemapi.alsalamhosp.com:447/submit_appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
      });
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
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
      const [year, month, day] = date.split('-');
      const [hours, minutes] = time.split(':');
      const startDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes));
      const endDate = new Date(startDate.getTime() + (duration * 60000));
      const formatDate = (date) => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        const h = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${d}/${m}/${y} ${h}:${mm}:${s}`;
      };
      const result = { dateDone: formatDate(startDate), expectedEndDate: formatDate(endDate), originalDate: date, originalTime: time, duration };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Pricing API
server.registerTool(
  "get_packages_prices",
  {
    description: "Get pricing information for packages",
    inputSchema: {},
  },
  async () => {
    try {
      const response = await fetch('https://salemapi.alsalamhosp.com:447/packagesprices');
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// WhatsApp Messaging API
server.registerTool(
  "send_whatsapp_message",
  {
    description: "Send appointment details via WhatsApp to patient",
    inputSchema: {
      mobile: z.string().describe("Patient's mobile number with country code (e.g., +96569020323)"),
      appointmentDetails: z.object({
        patientName: z.string().describe("Patient's full name"),
        doctorName: z.string().describe("Doctor's name"),
        specialty: z.string().describe("Medical specialty"),
        branchName: z.string().describe("Hospital branch name"),
        appointmentDate: z.string().describe("Appointment date (DD/MM/YYYY)"),
        appointmentTime: z.string().describe("Appointment time (HH:mm)"),
        appointmentId: z.string().optional().describe("Appointment ID if available"),
        branchAddress: z.string().optional().describe("Branch address if available"),
        notes: z.string().optional().describe("Additional notes or instructions")
      }),
      language: z.string().optional().describe("Message language (A for Arabic, E for English, default: A)")
    },
  },
  async ({ mobile, appointmentDetails, language = "A" }) => {
    try {
      const message = formatAppointmentMessage(appointmentDetails, language);
      const response = await fetch('https://salemapi.alsalamhosp.com:447/msg2send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, message, language, type: "appointment_confirmation" })
      });
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Appointment details sent via WhatsApp", appointmentDetails, whatsappResponse: data }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error sending WhatsApp message: ${error.message}` }] };
    }
  }
);

function formatAppointmentMessage(details, language = "A") {
  if (language === "A") {
    return `🏥 تأكيد حجز الموعد - مستشفى السلام\n\n👤 المريض: ${details.patientName}\n👨‍⚕️ الطبيب: ${details.doctorName}\n🏥 التخصص: ${details.specialty}\n📍 الفرع: ${details.branchName}\n📅 التاريخ: ${details.appointmentDate}\n🕐 الوقت: ${details.appointmentTime}\n${details.appointmentId ? `🆔 رقم الموعد: ${details.appointmentId}` : ''}\n${details.branchAddress ? `📍 العنوان: ${details.branchAddress}` : ''}\n\n${details.notes ? `📝 ملاحظات: ${details.notes}` : ''}\n\n✅ تم تأكيد حجز موعدك بنجاح!\n⏰ يرجى الحضور قبل الموعد بـ 15 دقيقة\n📞 للاستفسارات: ${details.branchName}\n\nشكراً لاختياركم مستشفى السلام 🏥`;
  } else {
    return `🏥 Appointment Confirmation - Al Salam Hospital\n\n👤 Patient: ${details.patientName}\n👨‍⚕️ Doctor: ${details.doctorName}\n🏥 Specialty: ${details.specialty}\n📍 Branch: ${details.branchName}\n📅 Date: ${details.appointmentDate}\n🕐 Time: ${details.appointmentTime}\n${details.appointmentId ? `🆔 Appointment ID: ${details.appointmentId}` : ''}\n${details.branchAddress ? `📍 Address: ${details.branchAddress}` : ''}\n\n${details.notes ? `📝 Notes: ${details.notes}` : ''}\n\n✅ Your appointment has been confirmed successfully!\n⏰ Please arrive 15 minutes before your appointment time\n📞 For inquiries: ${details.branchName}\n\nThank you for choosing Al Salam Hospital 🏥`;
  }
}
*/


