//! Screen control for the OmniDesk agent: take a screenshot, move the pointer, click, type.
//!
//! macOS only lets an app do this after the user turns on two switches in System Settings:
//! Screen Recording (to see the screen) and Accessibility (to click and type).
//!
//! The plain logic (key names, coordinates, text chunks, blocked shortcuts) lives at the top
//! so it can be tested anywhere. The part that talks to macOS is in the `mac` module.

pub const FLAG_SHIFT: u64 = 0x0002_0000;
pub const FLAG_CONTROL: u64 = 0x0004_0000;
pub const FLAG_ALT: u64 = 0x0008_0000;
pub const FLAG_COMMAND: u64 = 0x0010_0000;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct Chord {
    pub keycode: u16,
    pub flags: u64,
}

/// Key codes for a standard US keyboard layout.
pub fn key_code(name: &str) -> Option<u16> {
    let code = match name {
        "a" => 0, "s" => 1, "d" => 2, "f" => 3, "h" => 4, "g" => 5, "z" => 6, "x" => 7,
        "c" => 8, "v" => 9, "b" => 11, "q" => 12, "w" => 13, "e" => 14, "r" => 15, "y" => 16,
        "t" => 17, "1" => 18, "2" => 19, "3" => 20, "4" => 21, "6" => 22, "5" => 23, "=" => 24,
        "9" => 25, "7" => 26, "-" => 27, "8" => 28, "0" => 29, "]" => 30, "o" => 31, "u" => 32,
        "[" => 33, "i" => 34, "p" => 35, "l" => 37, "j" => 38, "'" => 39, "k" => 40, ";" => 41,
        "\\" => 42, "," => 43, "/" => 44, "n" => 45, "m" => 46, "." => 47, "`" => 50,
        "enter" | "return" => 36,
        "tab" => 48,
        "space" => 49,
        "delete" | "backspace" => 51,
        "escape" | "esc" => 53,
        "left" => 123, "right" => 124, "down" => 125, "up" => 126,
        "pageup" => 116, "pagedown" => 121, "home" => 115, "end" => 119,
        "f1" => 122, "f2" => 120, "f3" => 99, "f4" => 118, "f5" => 96, "f6" => 97,
        "f7" => 98, "f8" => 100, "f9" => 101, "f10" => 109, "f11" => 103, "f12" => 111,
        _ => return None,
    };
    Some(code)
}

/// Read a shortcut like "cmd+shift+t" or "enter".
pub fn parse_chord(spec: &str) -> Result<Chord, String> {
    let lower = spec.trim().to_ascii_lowercase();
    if lower.is_empty() {
        return Err("No keys were given.".into());
    }
    // A lone "+" key must still work, so only split when there is something around the plus.
    let parts: Vec<&str> = if lower == "+" { vec!["+"] } else { lower.split('+').map(str::trim).collect() };
    let (key, mods) = parts.split_last().ok_or("No keys were given.")?;
    let mut flags = 0u64;
    for m in mods {
        flags |= match *m {
            "cmd" | "command" | "meta" | "super" => FLAG_COMMAND,
            "ctrl" | "control" => FLAG_CONTROL,
            "alt" | "option" | "opt" => FLAG_ALT,
            "shift" => FLAG_SHIFT,
            other => return Err(format!("Unknown modifier key: {other}")),
        };
    }
    let keycode = key_code(key).ok_or_else(|| format!("Unknown key: {key}"))?;
    let chord = Chord { keycode, flags };
    if let Some(why) = forbidden(&chord) {
        return Err(why.into());
    }
    Ok(chord)
}

/// Shortcuts the agent may never press, because they quit apps, log out or delete files.
pub fn forbidden(c: &Chord) -> Option<&'static str> {
    let cmd = c.flags & FLAG_COMMAND != 0;
    let alt = c.flags & FLAG_ALT != 0;
    let ctrl = c.flags & FLAG_CONTROL != 0;
    match c.keycode {
        12 if cmd => Some("Quitting apps or logging out is not allowed."),
        53 if cmd && alt => Some("Force quit is not allowed."),
        51 if cmd => Some("Deleting files with the keyboard is not allowed."),
        12 if ctrl && cmd => Some("Locking the screen is not allowed."),
        _ => None,
    }
}

/// Turn a position on the 0 to 1000 grid into a point on a screen that is `extent` wide or tall.
pub fn to_point(norm: f64, extent: f64) -> f64 {
    let n = if norm.is_finite() { norm.clamp(0.0, 1000.0) } else { 500.0 };
    (n / 1000.0 * extent).min((extent - 1.0).max(0.0))
}

/// Split text into pieces that fit one keyboard event, never cutting a character in half.
pub fn chunk_text(text: &str, max_units: usize) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    let mut units = 0usize;
    for ch in text.chars() {
        let n = ch.len_utf16();
        if units + n > max_units && !cur.is_empty() {
            out.push(std::mem::take(&mut cur));
            units = 0;
        }
        cur.push(ch);
        units += n;
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

#[cfg(target_os = "macos")]
pub mod mac {
    use super::*;
    use core_graphics::display::CGDisplay;
    use core_graphics::event::{
        CGEvent, CGEventFlags, CGEventTapLocation, CGEventType, CGMouseButton, EventField,
        ScrollEventUnit,
    };
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
    use core_graphics::geometry::CGPoint;
    use std::process::Command;
    use std::thread::sleep;
    use std::time::Duration;

    use core_foundation::base::TCFType;
    use core_foundation::boolean::CFBoolean;
    use core_foundation::dictionary::{CFDictionary, CFDictionaryRef};
    use core_foundation::string::CFString;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGPreflightScreenCaptureAccess() -> bool;
        fn CGRequestScreenCaptureAccess() -> bool;
    }

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
        fn AXIsProcessTrustedWithOptions(options: CFDictionaryRef) -> bool;
    }

    /// Ask macOS for both permissions. This adds OmniDesk to both lists in System Settings
    /// (and shows the system prompts), so the user only has to flip the switches.
    pub fn request_permissions() {
        unsafe {
            if !CGPreflightScreenCaptureAccess() {
                let _ = CGRequestScreenCaptureAccess();
            }
            if !AXIsProcessTrusted() {
                // The value of kAXTrustedCheckOptionPrompt.
                let key = CFString::from_static_string("AXTrustedCheckOptionPrompt");
                let opts = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), CFBoolean::true_value().as_CFType())]);
                let _ = AXIsProcessTrustedWithOptions(opts.as_concrete_TypeRef());
            }
        }
    }

    pub fn screen_allowed() -> bool {
        unsafe { CGPreflightScreenCaptureAccess() }
    }

    pub fn accessibility_allowed() -> bool {
        unsafe { AXIsProcessTrusted() }
    }

    /// Size of the main display in points (not pixels).
    pub fn display_size() -> (f64, f64) {
        let b = CGDisplay::main().bounds();
        (b.size.width, b.size.height)
    }

    pub fn open_privacy_pane(which: &str) {
        let pane = match which {
            "screen" => "Privacy_ScreenCapture",
            _ => "Privacy_Accessibility",
        };
        let _ = Command::new("open")
            .arg(format!("x-apple.systempreferences:com.apple.preference.security?{pane}"))
            .spawn();
    }

    /// Take a screenshot of the main display as a JPEG about 1440 pixels wide.
    pub fn screenshot_jpeg() -> Result<Vec<u8>, String> {
        let path = std::env::temp_dir().join(format!(
            "omnidesk-shot-{}.jpg",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0)
        ));
        let status = Command::new("screencapture")
            .args(["-x", "-D", "1", "-t", "jpg"])
            .arg(&path)
            .status()
            .map_err(|e| format!("Could not take a screenshot: {e}"))?;
        if !status.success() {
            return Err("Could not take a screenshot. Check that Screen Recording is on for OmniDesk.".into());
        }
        // Smaller pictures are faster and cheaper. A failure here just means the full size is sent.
        let _ = Command::new("sips").args(["--resampleWidth", "1440"]).arg(&path).output();
        let bytes = std::fs::read(&path).map_err(|e| format!("Could not read the screenshot: {e}"));
        let _ = std::fs::remove_file(&path);
        bytes
    }

    fn source() -> Result<CGEventSource, String> {
        CGEventSource::new(CGEventSourceStateID::HIDSystemState)
            .map_err(|_| "macOS refused to create input events. Turn on Accessibility for OmniDesk.".to_string())
    }

    fn mouse(src: &CGEventSource, kind: CGEventType, p: CGPoint, button: CGMouseButton) -> Result<CGEvent, String> {
        CGEvent::new_mouse_event(src.clone(), kind, p, button).map_err(|_| "Could not create a mouse event.".to_string())
    }

    pub fn move_to(x: f64, y: f64) -> Result<(), String> {
        let src = source()?;
        mouse(&src, CGEventType::MouseMoved, CGPoint::new(x, y), CGMouseButton::Left)?.post(CGEventTapLocation::HID);
        Ok(())
    }

    pub fn click(x: f64, y: f64, right: bool, count: u32) -> Result<(), String> {
        let src = source()?;
        let p = CGPoint::new(x, y);
        let (down, up, button) = if right {
            (CGEventType::RightMouseDown, CGEventType::RightMouseUp, CGMouseButton::Right)
        } else {
            (CGEventType::LeftMouseDown, CGEventType::LeftMouseUp, CGMouseButton::Left)
        };
        mouse(&src, CGEventType::MouseMoved, p, CGMouseButton::Left)?.post(CGEventTapLocation::HID);
        sleep(Duration::from_millis(80));
        for i in 1..=count.clamp(1, 3) {
            let d = mouse(&src, down, p, button)?;
            d.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, i as i64);
            d.post(CGEventTapLocation::HID);
            sleep(Duration::from_millis(25));
            let u = mouse(&src, up, p, button)?;
            u.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, i as i64);
            u.post(CGEventTapLocation::HID);
            sleep(Duration::from_millis(60));
        }
        Ok(())
    }

    fn key(src: &CGEventSource, code: u16, down: bool, flags: u64) -> Result<CGEvent, String> {
        let ev = CGEvent::new_keyboard_event(src.clone(), code, down).map_err(|_| "Could not create a key event.".to_string())?;
        ev.set_flags(CGEventFlags::from_bits_truncate(flags));
        Ok(ev)
    }

    pub fn press(chord: Chord) -> Result<(), String> {
        let src = source()?;
        key(&src, chord.keycode, true, chord.flags)?.post(CGEventTapLocation::HID);
        sleep(Duration::from_millis(20));
        key(&src, chord.keycode, false, chord.flags)?.post(CGEventTapLocation::HID);
        sleep(Duration::from_millis(40));
        Ok(())
    }

    /// Type text into whatever has focus. Letters are sent as text, so any language and emoji work.
    pub fn type_text(text: &str) -> Result<(), String> {
        let src = source()?;
        let enter = Chord { keycode: 36, flags: 0 };
        for (i, line) in text.split('\n').enumerate() {
            if i > 0 {
                press(enter)?;
            }
            for piece in chunk_text(line, 16) {
                let down = key(&src, 0, true, 0)?;
                down.set_string(&piece);
                down.post(CGEventTapLocation::HID);
                let up = key(&src, 0, false, 0)?;
                up.set_string(&piece);
                up.post(CGEventTapLocation::HID);
                sleep(Duration::from_millis(12));
            }
        }
        Ok(())
    }

    /// Scroll at a point. Positive `dy` scrolls up, positive `dx` scrolls left, in lines.
    pub fn scroll(x: f64, y: f64, dx: i32, dy: i32) -> Result<(), String> {
        move_to(x, y)?;
        sleep(Duration::from_millis(60));
        let src = source()?;
        let ev = CGEvent::new_scroll_event(src, ScrollEventUnit::LINE, 2, dy, dx, 0)
            .map_err(|_| "Could not create a scroll event.".to_string())?;
        ev.post(CGEventTapLocation::HID);
        sleep(Duration::from_millis(80));
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_shortcuts() {
        assert_eq!(parse_chord("enter").unwrap(), Chord { keycode: 36, flags: 0 });
        assert_eq!(parse_chord("Cmd+L").unwrap(), Chord { keycode: 37, flags: FLAG_COMMAND });
        assert_eq!(
            parse_chord("cmd + shift + t").unwrap(),
            Chord { keycode: 17, flags: FLAG_COMMAND | FLAG_SHIFT }
        );
        assert_eq!(parse_chord("option+left").unwrap().flags, FLAG_ALT);
        assert_eq!(parse_chord("ctrl+a").unwrap().flags, FLAG_CONTROL);
        assert_eq!(parse_chord("PageDown").unwrap().keycode, 121);
        assert!(parse_chord("").is_err());
        assert!(parse_chord("cmd+").is_err());
        assert!(parse_chord("hyper+a").is_err());
        assert!(parse_chord("cmd+nonsense").is_err());
    }

    #[test]
    fn blocks_dangerous_shortcuts() {
        assert!(parse_chord("cmd+q").is_err());
        assert!(parse_chord("cmd+shift+q").is_err());
        assert!(parse_chord("cmd+option+escape").is_err());
        assert!(parse_chord("cmd+delete").is_err());
        assert!(parse_chord("cmd+shift+backspace").is_err());
        assert!(parse_chord("ctrl+cmd+q").is_err());
        // Ordinary shortcuts still work.
        assert!(parse_chord("cmd+w").is_ok());
        assert!(parse_chord("escape").is_ok());
        assert!(parse_chord("delete").is_ok());
        assert!(parse_chord("cmd+c").is_ok());
    }

    #[test]
    fn maps_the_grid_to_the_screen() {
        assert_eq!(to_point(0.0, 1440.0), 0.0);
        assert_eq!(to_point(500.0, 1440.0), 720.0);
        assert_eq!(to_point(1000.0, 1440.0), 1439.0);
        assert_eq!(to_point(2000.0, 900.0), 899.0);
        assert_eq!(to_point(-50.0, 900.0), 0.0);
        assert_eq!(to_point(f64::NAN, 900.0), 450.0);
    }

    #[test]
    fn chunks_text_safely() {
        assert_eq!(chunk_text("hello world", 5), vec!["hello", " worl", "d"]);
        assert_eq!(chunk_text("", 5), Vec::<String>::new());
        let emoji = chunk_text("a😀b😀c", 3);
        assert_eq!(emoji.concat(), "a😀b😀c");
        assert!(emoji.iter().all(|c| c.encode_utf16().count() <= 3));
    }
}
