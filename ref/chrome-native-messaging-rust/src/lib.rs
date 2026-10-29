//! Chrome & Firefox Native Messaging protocol handler for Rust

use serde::{de::DeserializeOwned, Serialize};
use std::io::{self, Read, Write};

pub fn read_json<T: DeserializeOwned>() -> io::Result<Option<T>> {
    let mut len_bytes = [0u8; 4];
    if io::stdin().read_exact(&mut len_bytes).is_err() {
        return Ok(None);
    }
    let len = u32::from_ne_bytes(len_bytes) as usize;
    let mut buf = vec![0u8; len];
    io::stdin().read_exact(&mut buf)?;
    let msg = serde_json::from_slice(&buf)?;
    Ok(Some(msg))
}

pub fn write_json<T: Serialize>(val: &T) -> io::Result<()> {
    let bytes = serde_json::to_vec(val)?;
    let len = bytes.len() as u32;
    let mut stdout = io::stdout().lock();
    stdout.write_all(&len.to_ne_bytes())?;
    stdout.write_all(&bytes)?;
    stdout.flush()?;
    Ok(())
}
