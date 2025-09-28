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

// OTP APIs
server.registerTool(
  "generate_otp",
  {
    description: "Generate OTP for mobile number",
    inputSchema: {
      mobile: z.string().describe("Mobile number"),
      source: z.string().optional().describe("Source of request (default: WhatsApp)"),
    },
  },
  async ({ mobile, source = "WhatsApp" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/otp/generate?mobile=${encodeURIComponent(mobile)}&source=${encodeURIComponent(source)}`, {
        method: 'POST'
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
  "verify_otp",
  {
    description: "Verify OTP for mobile number",
    inputSchema: {
      mobile: z.string().describe("Mobile number"),
      otp: z.string().describe("OTP code to verify"),
      source: z.string().optional().describe("Source of request (default: WhatsApp)"),
    },
  },
  async ({ mobile, otp, source = "WhatsApp" }) => {
    try {
      const response = await fetch(`https://salemapi.alsalamhosp.com:447/otp/verify?mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(otp)}&source=${encodeURIComponent(source)}`, {
        method: 'POST'
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

// Booking Flow Orchestrator
server.registerTool(
  "booking_flow",
  {
    description: "Guide booking flow based on channel, mobile, OTP, and names.",
    inputSchema: {
      Channel: z.string().describe("User channel: whatsapp/whatsapp cloud/other"),
      mobile: z.string().optional().describe("Existing or provided mobile number"),
      confirmed: z.boolean().optional().describe("Whether the displayed mobile is confirmed by user"),
      newMobile: z.string().optional().describe("Alternative mobile if not confirmed"),
      otp: z.string().optional().describe("OTP code when sent"),
      names: z.array(z.string()).optional().describe("Three-part patient name when not registered")
    },
  },
  async ({ Channel, mobile, confirmed, newMobile, otp, names }) => {
    try {
      const isWhatsApp = (Channel || '').toLowerCase() === 'whatsapp' || (Channel || '').toLowerCase() === 'whatsapp cloud';

      const checkStatus = async (msisdn) => {
        const resp = await fetch('https://salemapi.alsalamhosp.com:447/checkPatientWhatsApp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: msisdn })
        });
        return await resp.json();
      };

      const sendOtp = async (msisdn) => {
        const resp = await fetch(`https://salemapi.alsalamhosp.com:447/otp/generate?mobile=${encodeURIComponent(msisdn)}&source=${encodeURIComponent(isWhatsApp ? 'WhatsApp' : 'Other')}`, { method: 'POST' });
        return await resp.json();
      };

      const verifyOtp = async (msisdn, code) => {
        const resp = await fetch(`https://salemapi.alsalamhosp.com:447/otp/verify?mobile=${encodeURIComponent(msisdn)}&otp=${encodeURIComponent(code)}&source=${encodeURIComponent(isWhatsApp ? 'WhatsApp' : 'Other')}`, { method: 'POST' });
        return await resp.json();
      };

      const response = { success: true };

      if (isWhatsApp) {
        if (!mobile) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, next: 'ask_confirm_mobile', message: 'Please confirm the detected WhatsApp number.' }, null, 2) }] };
        }
        if (confirmed === undefined) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, next: 'confirm_mobile', mobile }, null, 2) }] };
        }
        if (confirmed === true) {
          const status = await checkStatus(mobile);
          response.step = 'select_patient_from_linked';
          response.mobile = mobile;
          response.status = status;
          return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
        }
        // confirmed === false
        if (!newMobile) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, next: 'ask_new_mobile', message: 'Please provide another mobile number.' }, null, 2) }] };
        }
        const newStatus = await checkStatus(newMobile);
        const isRegistered = !!(newStatus && (newStatus.registered || newStatus.isRegistered || newStatus.status === 'registered'));
        if (isRegistered) {
          if (!otp) {
            const sent = await sendOtp(newMobile);
            return { content: [{ type: 'text', text: JSON.stringify({ success: true, next: 'enter_otp', mobile: newMobile, otp_sent: sent }, null, 2) }] };
          }
          const verified = await verifyOtp(newMobile, otp);
          const ok = !!(verified && (verified.valid || verified.verified || verified.status === 'verified'));
          if (!ok) {
            return { content: [{ type: 'text', text: JSON.stringify({ success: false, next: 'enter_otp', message: 'Invalid OTP. Please try again.' }, null, 2) }] };
          }
          const finalStatus = await checkStatus(newMobile);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, step: 'select_patient_from_linked', mobile: newMobile, status: finalStatus }, null, 2) }] };
        } else {
          if (!names || names.length < 3) {
            return { content: [{ type: 'text', text: JSON.stringify({ success: true, next: 'ask_three_names', message: 'Provide first, second, and last names.' }, null, 2) }] };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, step: 'proceed_with_new_patient', mobile: newMobile, names }, null, 2) }] };
        }
      } else {
        // Other channels
        if (!mobile) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, next: 'ask_mobile', message: 'Please provide a mobile number.' }, null, 2) }] };
        }
        const status = await checkStatus(mobile);
        const isRegistered = !!(status && (status.registered || status.isRegistered || status.status === 'registered'));
        if (isRegistered) {
          if (!otp) {
            const sent = await sendOtp(mobile);
            return { content: [{ type: 'text', text: JSON.stringify({ success: true, next: 'enter_otp', mobile, otp_sent: sent }, null, 2) }] };
          }
          const verified = await verifyOtp(mobile, otp);
          const ok = !!(verified && (verified.valid || verified.verified || verified.status === 'verified'));
          if (!ok) {
            return { content: [{ type: 'text', text: JSON.stringify({ success: false, next: 'enter_otp', message: 'Invalid OTP. Please try again.' }, null, 2) }] };
          }
          const finalStatus = await checkStatus(mobile);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, step: 'select_patient_from_linked', mobile, status: finalStatus }, null, 2) }] };
        }
        // not registered
        if (!names || names.length < 3) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, next: 'ask_three_names', message: 'Provide first, second, and last names.' }, null, 2) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, step: 'proceed_with_new_patient', mobile, names }, null, 2) }] };
      }
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
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
      // OTP APIs
      'generate_otp',
      'verify_otp',
      
      // Patient APIs
      'check_patient_whatsapp_status',
      
      // Flow Orchestrator
      'booking_flow'
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

