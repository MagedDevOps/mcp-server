# AlSalam Hospital MCP Server

A comprehensive Model Context Protocol (MCP) server for hospital management operations with HTTP/SSE transport support.

## Overview

The AlSalam Hospital MCP Server provides a robust API for managing hospital operations including appointment booking, doctor management, patient services, and WhatsApp integration. Built with Node.js, Express.js, and the MCP framework, it supports real-time communication through Server-Sent Events (SSE).

## Features

### Hospital Management
- **get_all_hospitals**: Retrieve all hospitals with language support
- **get_specialties_by_hospital**: Get medical specialties for specific hospitals
- **get_doctors_by_hospital_specialty**: Find doctors by hospital and specialty
- **get_branches**: Get all hospital branches

### Search & Discovery
- **search_individual_category**: Enhanced search with multi-language support
- **select_doctor_from_list**: Select specific doctor from search results
- **get_doctor_slots_by_specialty**: Get available slots using specialty ID

### Appointment Management
- **get_doctor_available_days**: Get available appointment days for doctors
- **get_doctor_available_slots**: Get time slots for specific dates
- **submit_appointment**: Book new appointments
- **confirm_cancel_appointment**: Confirm or cancel existing appointments
- **format_appointment_date**: Format dates for API submission

### Patient Management
- **check_patient_whatsapp_status**: Check WhatsApp registration status
- **generate_otp**: Generate OTP for patient verification
- **verify_otp**: Verify OTP for authentication

### Communication
- **send_whatsapp_message**: Send WhatsApp messages to patients
- **get_chatbot_info**: Get chatbot information

### Additional Features
- Multi-language support (Arabic and English)
- Intelligent search strategies with fallback mechanisms
- Comprehensive error handling and timeout management
- Real-time availability checking
- Automatic phone number formatting
- CORS support for browser compatibility

## Endpoints

- **SSE Connection:** `GET /mcp` - Establishes Server-Sent Events connection
- **Messages:** `POST /messages` - Receives JSON-RPC requests from clients
- **Health Check:** `GET /health` - Returns server status and available tools

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `REQUEST_TIMEOUT`: API request timeout (default: 50000ms)

### External APIs
- **AlSalam Hospital API**: `https://salemuatapi.alsalamhosp.com:446`
- **Facebook WhatsApp API**: `https://graph.facebook.com/v21.0`

## Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or run in development mode
node server.js
```

## Usage

The server provides 20+ MCP tools for comprehensive hospital management. Connect using any MCP-compatible client:

1. Establish SSE connection via `/mcp` endpoint
2. Send JSON-RPC requests via `/messages` endpoint
3. Use the registered tools for hospital operations

### Example Tool Usage

```javascript
// Search for a doctor
{
  "method": "tools/call",
  "params": {
    "name": "search_individual_category",
    "arguments": {
      "term": "دكتور أحمد",
      "lang": "A"
    }
  }
}

// Book an appointment
{
  "method": "tools/call",
  "params": {
    "name": "submit_appointment",
    "arguments": {
      "servType": "Consultation",
      "branchId": "1",
      "specId": "2",
      "docId": "123",
      "schedSerial": "456",
      "shiftId": "1",
      "dateDone": "15/12/2024 10:30:00",
      "expectedEndDate": "15/12/2024 11:00:00",
      "patTel": "96569020323",
      "telephoneCountryCode": "+965",
      "patName": "Ahmed Mohammed",
      "gender": "M"
    }
  }
}
```

## Deployment

This server is configured for deployment on:
- **Vercel** - Serverless deployment with `vercel.json`
- **Railway** - Container deployment with `railway.json`
- **Render** - Cloud platform with `render.yaml`
- **AWS App Runner** - Container service with `apprunner.yaml`

### Docker Support
```bash
# Build Docker image
docker build -t alsalam-hospital-mcp .

# Run container
docker run -p 3000:3000 alsalam-hospital-mcp
```

## API Documentation

For detailed API documentation including all parameters, response formats, and error codes, see the comprehensive technical documentation.

## Security Considerations

- All inputs are validated using Zod schemas
- Request timeouts prevent hanging connections
- CORS is configured for web browser access
- WhatsApp API credentials should be stored in environment variables in production

## Performance

- SSE connections are properly managed and cleaned up
- Efficient search strategies reduce API calls
- Request timeout prevents hanging connections
- Graceful shutdown process for clean resource management

## Support

For technical support or questions regarding this MCP server, please contact the development team.
