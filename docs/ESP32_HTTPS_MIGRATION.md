# ESP32 HTTPS/WSS Migration Guide

## Overview

This guide explains how to update ESP32 firmware to work with HTTPS backend instead of HTTP.

## Required Changes

### 1. Include Required Libraries

```cpp
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
```

### 2. HTTPS REST API Calls

**Before (HTTP):**

```cpp
HTTPClient http;
http.begin("http://backend-ip:3000/devices/register");
```

**After (HTTPS):**

```cpp
WiFiClientSecure client;
client.setInsecure(); // Skip certificate validation (for testing)
// OR for production:
// client.setCACert(root_ca); // Use proper certificate validation

HTTPClient http;
http.begin(client, "https://your-domain.com/api/devices/register");
```

### 3. WebSocket Secure (WSS)

**Before (WS):**

```cpp
webSocket.begin("backend-ip", 3001, "/ws");
```

**After (WSS):**

```cpp
webSocket.beginSSL("your-domain.com", 3001, "/ws");
// OR with certificate validation:
webSocket.beginSSL("your-domain.com", 3001, "/ws", "", root_ca);
```

### 4. Memory Considerations

HTTPS requires additional RAM for SSL handshake:

- Allocate at least 40KB more heap for SSL operations
- Consider using `client.setInsecure()` to reduce memory usage (less secure)
- Monitor heap usage during SSL connections

### 5. Certificate Management (Production)

For production, include root CA certificate:

```cpp
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"YOUR_ROOT_CA_CERTIFICATE_HERE\n" \
"-----END CERTIFICATE-----\n";

void setup() {
    WiFiClientSecure client;
    client.setCACert(root_ca);
    // Use client for HTTPS requests
}
```

### 6. Configuration Updates

Update device configuration to use HTTPS endpoints:

```cpp
// Configuration constants
#define API_BASE_URL "https://your-domain.com/api"
#define WS_HOST "your-domain.com"
#define WS_PORT 3001
#define WS_PATH "/ws"
#define USE_SSL true

// Registration endpoint
String registerUrl = String(API_BASE_URL) + "/devices/register";

// WebSocket connection
if (USE_SSL) {
    webSocket.beginSSL(WS_HOST, WS_PORT, WS_PATH);
} else {
    webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
}
```

## Testing

### Development Phase

1. Test with `client.setInsecure()` for initial validation
2. Verify all API calls work with HTTPS
3. Test WebSocket connectivity with WSS

### Production Phase

1. Add proper certificate validation
2. Test certificate expiry handling
3. Implement certificate update mechanism if needed

## Troubleshooting

### Common Issues

**SSL Handshake Failures:**

- Ensure enough heap memory available
- Check certificate validity
- Verify correct hostname

**WebSocket Connection Issues:**

- Confirm WSS port accessibility (3001)
- Verify WebSocket path `/ws`
- Check firewall settings

**Memory Issues:**

- Use `client.setInsecure()` if certificates aren't critical
- Increase ESP32 partition sizes if needed
- Monitor heap usage with `ESP.getFreeHeap()`
