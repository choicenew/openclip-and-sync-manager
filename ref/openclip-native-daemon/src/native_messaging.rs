use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};

#[derive(Serialize, Deserialize, Debug)]
pub struct NativeMessage {
    pub action: String,
    pub content: Option<String>,
}

pub fn read_message() -> io::Result<Option<NativeMessage>> {
    let mut length_bytes = [0u8; 4];
    let stdin = io::stdin();
    let mut handle = stdin.lock();

    if handle.read_exact(&mut length_bytes).is_err() {
        return Ok(None);
    }

    let length = u32::from_ne_bytes(length_bytes) as usize;
    let mut buffer = vec![0u8; length];
    handle.read_exact(&mut buffer)?;

    let msg: NativeMessage = serde_json::from_slice(&buffer)?;
    Ok(Some(msg))
}

pub fn send_message(msg: &NativeMessage) -> io::Result<()> {
    let json_bytes = serde_json::to_vec(msg)?;
    let length = json_bytes.len() as u32;

    let stdout = io::stdout();
    let mut handle = stdout.lock();
    handle.write_all(&length.to_ne_bytes())?;
    handle.write_all(&json_bytes)?;
    handle.flush()?;

    Ok(())
}
