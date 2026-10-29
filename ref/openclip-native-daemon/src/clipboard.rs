use arboard::Clipboard;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use crate::native_messaging::{send_message, NativeMessage};

pub fn start_clipboard_listener(clipboard: Arc<Mutex<Clipboard>>) {
    std::thread::spawn(move || {
        let mut last_text = String::new();
        loop {
            if let Ok(mut cb) = clipboard.lock() {
                if let Ok(text) = cb.get_text() {
                    if !text.is_empty() && text != last_text {
                        last_text = text.clone();
                        let msg = NativeMessage {
                            action: "CLIPBOARD_CHANGED".to_string(),
                            content: Some(text),
                        };
                        let _ = send_message(&msg);
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(500));
        }
    });
}
