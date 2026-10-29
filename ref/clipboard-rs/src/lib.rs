//! clipboard-rs core reference implementation

pub enum ClipboardContent {
    Text(String),
    Image(Vec<u8>),
    Html(String),
}

pub struct Clipboard;

impl Clipboard {
    pub fn new() -> Result<Self, String> {
        Ok(Clipboard)
    }

    pub fn read(&self) -> Result<ClipboardContent, String> {
        Ok(ClipboardContent::Text(String::new()))
    }

    pub fn write(&self, _content: ClipboardContent) -> Result<(), String> {
        Ok(())
    }
}
