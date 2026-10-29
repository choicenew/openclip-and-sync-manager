# OpenClip Standalone Desktop Companion (Rust)

## Architecture Principles
1. **100% Independent Desktop Executable**: Runs as a standalone background daemon/tray app on Windows/macOS/Linux. Captures OS clipboard entries whether Chrome is open or closed.
2. **100% Independent Browser Extension**: Chrome/Firefox extension functions fully on its own.
3. **Local WebSocket IPC Bridge (`ws://127.0.0.1:18900`)**:
   - When the extension opens or connects, both sides exchange clipboard events in real-time.
   - Low memory footprint (< 3MB RAM).
