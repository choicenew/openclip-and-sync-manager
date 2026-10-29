//! Reference implementation for tray-icon library

pub struct TrayIconBuilder;

impl TrayIconBuilder {
    pub fn new() -> Self {
        TrayIconBuilder
    }

    pub fn with_tooltip(self, _tooltip: &str) -> Self {
        self
    }

    pub fn build(self) -> Result<(), String> {
        Ok(())
    }
}
