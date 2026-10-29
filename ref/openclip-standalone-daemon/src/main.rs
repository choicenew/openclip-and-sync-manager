/**
 * OpenClip Standalone Desktop Daemon (Rust)
 *
 * 架构特点：
 * 1. 桌面端 100% 独立运行：浏览器不开启时，依然能独立常驻后台并捕获/管理系统剪贴板。
 * 2. 浏览器插件 100% 独立运行：无需强绑定 Chrome Native Messaging。
 * 3. 双边无缝共享：内嵌轻量 WebSocket 服务 (ws://127.0.0.1:18900)。
 *    任意一边复制，双边独立记录并实时双向共享！
 */

use arboard::Clipboard;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ClipboardPayload {
    action: String,
    content: String,
    timestamp: u64,
}

#[tokio::main]
async fn main() {
    println!("[OpenClip Standalone Daemon] 独立桌面守护进程启动 (ws://127.0.0.1:18900)...");

    // 系统剪贴板句柄
    let clipboard = Arc::new(Mutex::new(
        Clipboard::new().expect("Failed to initialize system clipboard"),
    ));

    // 客户端连接列表 (用于多端广播共享)
    let clients = Arc::new(Mutex::new(Vec::<mpsc::Sender<ClipboardPayload>>::new()));

    // 1. 桌面端独立工作线程：捕获操作系统全局剪贴板 (浏览器关闭时依然独立工作)
    let cb_clone = Arc::clone(&clipboard);
    let clients_clone = Arc::clone(&clients);
    tokio::task::spawn_blocking(move || {
        let mut last_content = String::new();
        loop {
            if let Ok(mut cb) = cb_clone.lock() {
                if let Ok(text) = cb.get_text() {
                    if !text.is_empty() && text != last_content {
                        last_content = text.clone();
                        let payload = ClipboardPayload {
                            action: "SYNC_ENTRY".to_string(),
                            content: text,
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis() as u64,
                        };

                        // 如果浏览器插件连入，即时共享过去；即使无插件连入，依然独立工作
                        if let Ok(mut list) = clients_clone.lock() {
                            list.retain(|tx| tx.try_send(payload.clone()).is_ok());
                        }
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(500));
        }
    });

    // 2. 本地独立 WebSocket 服务：供浏览器插件连入进行数据共享
    let listener = TcpListener::bind("127.0.0.1:18900")
        .await
        .expect("Failed to bind local WebSocket port 18900");

    while let Ok((stream, _)) = listener.accept().await {
        let clients_ref = Arc::clone(&clients);
        let cb_ref = Arc::clone(&clipboard);

        tokio::spawn(async move {
            let ws_stream = match accept_async(stream).await {
                Ok(ws) => ws,
                Err(_) => return,
            };

            let (mut ws_sender, mut ws_receiver) = ws_stream.split();
            let (tx_client, mut rx_client) = mpsc::channel::<ClipboardPayload>(50);

            if let Ok(mut list) = clients_ref.lock() {
                list.push(tx_client);
            }

            // 转发任务：发送给当前连入的浏览器插件
            tokio::spawn(async move {
                while let Some(payload) = rx_client.recv().await {
                    if let Ok(json) = serde_json::to_string(&payload) {
                        if ws_sender.send(Message::Text(json)).await.is_err() {
                            break;
                        }
                    }
                }
            });

            // 接收来自插件推送的剪贴板内容（插件端独立复制时共享给桌面端）
            while let Some(Ok(msg)) = ws_receiver.next().await {
                if let Message::Text(text) = msg {
                    if let Ok(payload) = serde_json::from_str::<ClipboardPayload>(&text) {
                        if payload.action == "SYNC_ENTRY" {
                            if let Ok(mut cb) = cb_ref.lock() {
                                let _ = cb.set_text(&payload.content);
                            }
                        }
                    }
                }
            }
        });
    }
}
