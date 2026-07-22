# SFML Network — Quick Reference

Last verified: 2026-07-22 | Engine: SFML 3.0

## What Changed Since 2.x (LLM Cutoff)

### SFML 3.0 Changes
- **C++17 patterns** — use modern error handling
- **API surface mostly unchanged** — core networking classes remain
- **Verify return types** — some methods may have updated signatures

### Unchanged Core API
- `sf::TcpSocket`, `sf::UdpSocket`, `sf::TcpListener` remain
- `sf::Http`, `sf::Ftp` for high-level protocols remain
- `sf::Packet` for serialization remains
- Socket status codes unchanged

## Current API Patterns

### TCP Client
```cpp
#include <SFML/Network.hpp>

sf::TcpSocket socket;
sf::Socket::Status status = socket.connect("192.168.1.100", 53000);

if (status == sf::Socket::Status::Done) {
    // Send data
    std::string message = "Hello, server!";
    socket.send(message.data(), message.size());

    // Receive data
    char buffer[1024];
    std::size_t received;
    socket.receive(buffer, sizeof(buffer), received);
    std::string response(buffer, received);
}
```

### TCP Server
```cpp
sf::TcpListener listener;
listener.listen(53000); // Bind to port

sf::TcpSocket client;
if (listener.accept(client) == sf::Socket::Status::Done) {
    // Client connected
    std::string message = "Welcome!";
    client.send(message.data(), message.size());
}
```

### UDP Socket
```cpp
sf::UdpSocket socket;

// Send (connectionless)
std::string message = "Hello!";
socket.send(message.data(), message.size(), "192.168.1.100", 53000);

// Receive
char buffer[1024];
std::size_t received;
sf::IpAddress sender;
unsigned short port;
socket.receive(buffer, sizeof(buffer), received, sender, port);
```

### Packet Serialization
```cpp
// Sending
sf::Packet packet;
sf::Uint16 playerID = 42;
float x = 100.5f, y = 200.3f;
std::string name = "Player1";

packet << playerID << x << y << name;
socket.send(packet);

// Receiving
sf::Packet packet;
socket.receive(packet);

sf::Uint16 id;
float px, py;
std::string playerName;

packet >> id >> px >> py >> playerName;
```

### HTTP Requests
```cpp
sf::Http http("https://api.example.com");

sf::Http::Request request;
request.setMethod(sf::Http::Request::Method::Post);
request.setUrl("/api/score");
request.setBody(R"({"player": "Player1", "score": 100})");
request.setField("Content-Type", "application/json");

sf::Http::Response response = http.sendRequest(request);

if (response.getStatus() == sf::Http::Response::Status::Ok) {
    std::string body = response.getBody();
}
```

### FTP (Basic)
```cpp
sf::Ftp ftp;
ftp.connect("ftp.example.com");
ftp.login("user", "password");
ftp.download("file.txt", "local/directory");
ftp.disconnect();
```

## Socket Status Codes
```cpp
// Common status values
sf::Socket::Status::Done       // Success
sf::Socket::Status::NotReady   // Would block (non-blocking mode)
sf::Socket::Status::Partial    // Partial send/receive
sf::Socket::Status::Disconnected // Connection lost
sf::Socket::Status::Error      // Unexpected error
```

## Non-Blocking Mode
```cpp
socket.setBlocking(false);

// Poll for data without blocking
auto status = socket.receive(buffer, sizeof(buffer), received);
if (status == sf::Socket::Status::NotReady) {
    // No data available yet — try again later
}
```

## Common Mistakes
- Not checking socket status after connect/send/receive
- Using blocking sockets in game loop — will freeze the game
- Not handling `sf::Socket::Status::Disconnected` — connection drops silently
- Using UDP for reliable data — use TCP for guaranteed delivery
- Forgetting that UDP packets can arrive out of order or be lost
- Sending large packets via UDP — may exceed MTU and get dropped
- Not using `sf::Packet` for serialization — manual byte ordering issues
