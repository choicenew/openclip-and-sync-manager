# arboard (Reference Copy)

Cross-platform clipboard library in Rust for text and image reading/writing.

## Supported Platforms
- Windows (Win32)
- macOS (AppKit NSPasteboard)
- Linux (X11 & Wayland)

## Usage
```rust
use arboard::Clipboard;

let mut clipboard = Clipboard::new().unwrap();
let text = clipboard.get_text().unwrap();
clipboard.set_text("Hello OpenClip!").unwrap();
```
