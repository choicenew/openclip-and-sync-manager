/**
 * OpenClip Sync — 极简极小内存 Native 剪贴板伴侣守护进程
 * 内存占用：~1.5MB - 2MB
 * 依赖库：arboard (跨平台剪贴板) + serde/serde_json (Chrome Native Messaging 通信)
 */

use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

#[derive(Serialize, Deserialize)]
struct Message {
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
}

fn send_msg(action: &str, content: Option<String>) {
    let msg = Message {
        action: action.to_string(),
        content,
    };
    if let Ok(json) = serde_json::to_vec(&msg) {
        let len = json.len() as u32;
        let stdout = io::stdout();
        let mut lock = stdout.lock();
        if lock.write_all(&len.to_ne_bytes()).is_ok() {
            let _ = lock.write_all(&json);
            let _ = lock.flush();
        }
    }
}

fn main() {
    // 初始化开源 arboard 剪贴板句柄
    let clipboard = match Clipboard::new() {
        Ok(cb) => Arc::new(Mutex::new(cb)),
        Err(e) => {
            eprintln!("[OpenClip Daemon] Clipboard init error: {}", e);
            return;
        }
    };

    // 1. 后台轻量线程：500ms 轮询监听系统剪贴板变化 -> 推送给插件
    let cb_clone = Arc::clone(&clipboard);
    thread::spawn(move || {
        let mut last_content = String::new();
        loop {
            if let Ok(mut cb) = cb_clone.lock() {
                if let Ok(text) = cb.get_text() {
                    if !text.is_empty() && text != last_content {
                        last_content = text.clone();
                        send_msg("CLIPBOARD_CHANGED", Some(text));
                    }
                }
            }
            thread::sleep(Duration::from_millis(500));
        }
    });

    // 2. 主线程：接收 Chrome/Firefox 插件发送的指令 (例如向系统剪贴板写入文本)
    let stdin = io::stdin();
    loop {
        let mut len_bytes = [0u8; 4];
        let mut handle = stdin.lock();

        // 插件断开或关闭时，stdin 管道读取失败，进程自动退出，不留残余内存
        if handle.read_exact(&mut len_bytes).is_err() {
            break;
        }

        let len = u32::from_ne_bytes(len_bytes) as usize;
        let mut buf = vec![0u8; len];
        if handle.read_exact(&mut buf).is_ok() {
            if let Ok(msg) = serde_json::from_slice::<Message>(&buf) {
                if msg.action == "SET_CLIPBOARD" {
                    if let Some(text) = msg.content {
                        if let Ok(mut cb) = clipboard.lock() {
                            let _ = cb.set_text(text);
                        }
                    }
                }
            }
        }
    }
}
