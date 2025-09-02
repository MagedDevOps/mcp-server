# MCP Server

A Model Context Protocol (MCP) server with HTTP/SSE transport support.

## Features

- **hello_world** tool: Say hello to someone
- **math_add** tool: Add two numbers together
- HTTP/SSE transport for web access
- CORS support for browser compatibility

## Endpoints

- **SSE Connection:** `/mcp`
- **Messages:** `/messages`
- **Health Check:** `/health`

## Deployment

This server is configured for deployment on:
- Vercel
- Railway
- Render

## Usage

The server provides two MCP tools that can be used by MCP clients.
