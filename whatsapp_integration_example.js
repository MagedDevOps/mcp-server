// WhatsApp Integration Example for Al Salam Hospital
// This demonstrates how to use the new send_whatsapp_message tool

// Example usage of the WhatsApp messaging functionality
const exampleAppointmentDetails = {
  patientName: "أحمد محمد علي",
  doctorName: "د. سارة أحمد",
  specialty: "أمراض القلب",
  branchName: "فرع الكويت",
  appointmentDate: "15/09/2025",
  appointmentTime: "10:30",
  appointmentId: "12345",
  branchAddress: "شارع الخليج العربي، الكويت",
  notes: "يرجى الحضور قبل الموعد بـ 15 دقيقة"
};

// Example of how the AI would call the tool
const whatsappMessageExample = {
  tool: "send_whatsapp_message",
  parameters: {
    mobile: "+96569020323",
    appointmentDetails: exampleAppointmentDetails,
    language: "A" // A for Arabic, E for English
  }
};

// Expected WhatsApp message output (Arabic):
const expectedArabicMessage = `🏥 تأكيد حجز الموعد - مستشفى السلام

👤 المريض: أحمد محمد علي
👨‍⚕️ الطبيب: د. سارة أحمد
🏥 التخصص: أمراض القلب
📍 الفرع: فرع الكويت
📅 التاريخ: 15/09/2025
🕐 الوقت: 10:30
🆔 رقم الموعد: 12345
📍 العنوان: شارع الخليج العربي، الكويت

📝 ملاحظات: يرجى الحضور قبل الموعد بـ 15 دقيقة

✅ تم تأكيد حجز موعدك بنجاح!
⏰ يرجى الحضور قبل الموعد بـ 15 دقيقة
📞 للاستفسارات: فرع الكويت

شكراً لاختياركم مستشفى السلام 🏥`;

// Expected WhatsApp message output (English):
const expectedEnglishMessage = `🏥 Appointment Confirmation - Al Salam Hospital

👤 Patient: أحمد محمد علي
👨‍⚕️ Doctor: د. سارة أحمد
🏥 Specialty: أمراض القلب
📍 Branch: فرع الكويت
📅 Date: 15/09/2025
🕐 Time: 10:30
🆔 Appointment ID: 12345
📍 Address: شارع الخليج العربي، الكويت

📝 Notes: يرجى الحضور قبل الموعد بـ 15 دقيقة

✅ Your appointment has been confirmed successfully!
⏰ Please arrive 15 minutes before your appointment time
📞 For inquiries: فرع الكويت

Thank you for choosing Al Salam Hospital 🏥`;

console.log("WhatsApp Integration Example:");
console.log("=============================");
console.log("\n1. Tool Call Example:");
console.log(JSON.stringify(whatsappMessageExample, null, 2));

console.log("\n2. Expected Arabic Message:");
console.log(expectedArabicMessage);

console.log("\n3. Expected English Message:");
console.log(expectedEnglishMessage);

console.log("\n4. Integration Benefits:");
console.log("- Automatic appointment confirmation via WhatsApp");
console.log("- Professional formatted messages with emojis");
console.log("- Support for both Arabic and English");
console.log("- Complete appointment details included");
console.log("- Patient contact information for inquiries");
console.log("- Important instructions and reminders");

module.exports = {
  exampleAppointmentDetails,
  whatsappMessageExample,
  expectedArabicMessage,
  expectedEnglishMessage
};
