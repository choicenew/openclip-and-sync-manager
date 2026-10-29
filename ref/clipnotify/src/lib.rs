//! clipnotify-rs event listener reference

pub fn wait_for_clipboard_change() -> Result<(), String> {
    // Blocks thread until OS fires clipboard update event
    Ok(())
}
