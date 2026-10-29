//! Reference implementation for arboard clipboard library

pub struct Clipboard;

impl Clipboard {
    pub fn new() -> Result<Self, String> {
        Ok(Clipboard)
    }

    pub fn get_text(&mut self) -> Result<String, String> {
        // Platform specific clipboard getter implementation
        Ok(String::new())
    }

    pub fn set_text(&mut self, text: &str) -> Result<(), String> {
        // Platform specific clipboard setter implementation
        let _ = text;
        Ok(())
    }
}
