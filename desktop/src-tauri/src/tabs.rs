//! TabBrain, Mac side: read the tabs the user has open in their browsers.
//!
//! macOS lets one app ask a browser for its tabs through AppleScript. The first time,
//! macOS shows an "OmniDesk wants to control Google Chrome" prompt and the user decides.
//! Nothing is read until the user picks tabs and sends a question.
//!
//! Everything that can be tested without a Mac lives here as plain functions.

use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Kind {
    /// Chrome, Brave, Edge, Arc, Vivaldi share one AppleScript vocabulary.
    Chromium,
    Safari,
}

/// Only these browsers are ever scripted. The name goes into a script, so it must come from here.
const BROWSERS: &[(&str, Kind)] = &[
    ("Google Chrome", Kind::Chromium),
    ("Arc", Kind::Chromium),
    ("Brave Browser", Kind::Chromium),
    ("Microsoft Edge", Kind::Chromium),
    ("Vivaldi", Kind::Chromium),
    ("Safari", Kind::Safari),
];

pub fn browser_names() -> Vec<&'static str> {
    BROWSERS.iter().map(|(n, _)| *n).collect()
}

pub fn kind_of(browser: &str) -> Option<Kind> {
    BROWSERS.iter().find(|(n, _)| *n == browser).map(|(_, k)| *k)
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct RawTab {
    pub window_id: i64,
    pub tab_index: u32,
    pub title: String,
    pub url: String,
}

/// AppleScript that prints one line per tab: windowId TAB tabIndex TAB title TAB url.
pub fn list_script(browser: &str, kind: Kind) -> String {
    let title_prop = match kind {
        Kind::Chromium => "title",
        Kind::Safari => "name",
    };
    format!(
        "tell application \"{browser}\"\n\
         set out to \"\"\n\
         repeat with w in windows\n\
         set wid to id of w\n\
         set ti to 0\n\
         repeat with t in tabs of w\n\
         set ti to ti + 1\n\
         set out to out & wid & tab & ti & tab & ({title_prop} of t) & tab & (URL of t) & linefeed\n\
         end repeat\n\
         end repeat\n\
         return out\n\
         end tell"
    )
}

/// JavaScript that returns the readable text of the page. It has no backslashes or double
/// quotes so it can sit inside an AppleScript string as is.
const PAGE_JS: &str = "(function(){var e=document.querySelector('article')||document.querySelector('main')||document.body;var s=window.getSelection?String(window.getSelection()):'';return (s&&s.length>200?s:(e.innerText||'')).slice(0,40000);})()";

/// AppleScript that runs PAGE_JS in one tab. Window ids are stable even if windows are reordered.
pub fn read_script(browser: &str, kind: Kind, window_id: i64, tab_index: u32) -> String {
    match kind {
        Kind::Chromium => format!(
            "tell application \"{browser}\"\n\
             return (execute (tab {tab_index} of (window id {window_id})) javascript \"{PAGE_JS}\")\n\
             end tell"
        ),
        Kind::Safari => format!(
            "tell application \"{browser}\"\n\
             return (do JavaScript \"{PAGE_JS}\" in (tab {tab_index} of (window id {window_id})))\n\
             end tell"
        ),
    }
}

/// AppleScript that brings one tab to the front.
pub fn focus_script(browser: &str, kind: Kind, window_id: i64, tab_index: u32) -> String {
    match kind {
        Kind::Chromium => format!(
            "tell application \"{browser}\"\n\
             set w to window id {window_id}\n\
             set active tab index of w to {tab_index}\n\
             set index of w to 1\n\
             activate\n\
             end tell"
        ),
        Kind::Safari => format!(
            "tell application \"{browser}\"\n\
             set w to window id {window_id}\n\
             set current tab of w to (tab {tab_index} of w)\n\
             set index of w to 1\n\
             activate\n\
             end tell"
        ),
    }
}

pub fn parse_tabs(output: &str) -> Vec<RawTab> {
    output
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(4, '\t');
            let window_id = parts.next()?.trim().parse::<i64>().ok()?;
            let tab_index = parts.next()?.trim().parse::<u32>().ok()?;
            let title = parts.next()?.trim().to_string();
            let url = parts.next()?.trim().to_string();
            if url.is_empty() {
                return None;
            }
            Some(RawTab { window_id, tab_index, title, url })
        })
        .collect()
}

/// Only normal web pages can be read. Browser settings pages, new tab pages and files cannot.
pub fn is_readable_url(url: &str) -> bool {
    let u = url.to_ascii_lowercase();
    u.starts_with("https://") || u.starts_with("http://")
}

/// Collapse runs of whitespace and cut the text to at most `max_chars` characters.
pub fn clean_text(raw: &str, max_chars: usize) -> String {
    let mut out = String::with_capacity(raw.len().min(max_chars + 8));
    let mut count = 0usize;
    let mut last_space = true;
    for ch in raw.chars() {
        if ch.is_whitespace() || ch == '\u{200b}' {
            if !last_space {
                out.push(' ');
                count += 1;
                last_space = true;
            }
        } else {
            out.push(ch);
            count += 1;
            last_space = false;
        }
        if count >= max_chars {
            break;
        }
    }
    out.trim().to_string()
}

/// Turn a raw AppleScript error into something a person can act on.
pub fn explain_error(browser: &str, stderr: &str) -> String {
    let s = stderr.to_ascii_lowercase();
    if s.contains("-1743") || s.contains("not authorized") || s.contains("not allowed assistive") {
        return format!(
            "macOS has not allowed OmniDesk to control {browser}. Open System Settings, Privacy & Security, Automation, and turn on {browser} under OmniDesk."
        );
    }
    if s.contains("javascript through applescript is turned off")
        || s.contains("allow javascript from apple events")
    {
        return if browser == "Safari" {
            "Turn on Develop, then Allow JavaScript from Apple Events, in Safari's menu bar. If you do not see Develop, enable it in Safari Settings, Advanced.".to_string()
        } else {
            format!("In {browser}, open the View menu, then Developer, then turn on Allow JavaScript from Apple Events.")
        };
    }
    if s.contains("-1728") || s.contains("can't get") || s.contains("invalid index") {
        return "That tab is gone. Refresh the list and pick it again.".to_string();
    }
    if s.contains("timed out") {
        return format!("{browser} took too long to answer. It may be busy or showing a prompt.");
    }
    let short: String = stderr.trim().chars().take(200).collect();
    format!("Could not read the tab: {short}")
}

/// Run an AppleScript with a time limit. Returns stdout, or a plain-language error.
pub fn run_osascript(script: &str, browser: &str, limit: Duration) -> Result<String, String> {
    let mut child = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not start macOS scripting: {e}"))?;

    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start.elapsed() > limit {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(explain_error(browser, "timed out"));
                }
                std::thread::sleep(Duration::from_millis(40));
            }
            Err(e) => return Err(format!("Could not wait for macOS scripting: {e}")),
        }
    }

    let mut stdout = String::new();
    let mut stderr = String::new();
    if let Some(mut o) = child.stdout.take() {
        let _ = o.read_to_string(&mut stdout);
    }
    if let Some(mut e) = child.stderr.take() {
        let _ = e.read_to_string(&mut stderr);
    }
    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(stdout)
    } else {
        Err(explain_error(browser, &stderr))
    }
}

/// True if an app with this exact name is running. Asking a closed browser for tabs would open it.
pub fn is_running(name: &str) -> bool {
    Command::new("pgrep")
        .arg("-x")
        .arg(name)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_tab_lines() {
        let out = "101\t1\tLaptop review\thttps://a.com/x\n101\t2\tTitle\twith tab\thttps://b.com\n\nbad line\n102\t1\tNo url\t\n";
        let tabs = parse_tabs(out);
        assert_eq!(tabs.len(), 2);
        assert_eq!(tabs[0], RawTab { window_id: 101, tab_index: 1, title: "Laptop review".into(), url: "https://a.com/x".into() });
        // A tab character inside a title keeps the rest in the url field, so the url is not lost.
        assert_eq!(tabs[1].tab_index, 2);
    }

    #[test]
    fn only_web_pages_are_readable() {
        assert!(is_readable_url("https://example.com"));
        assert!(is_readable_url("HTTP://example.com"));
        assert!(!is_readable_url("chrome://settings"));
        assert!(!is_readable_url("file:///etc/passwd"));
        assert!(!is_readable_url("about:blank"));
        assert!(!is_readable_url("javascript:alert(1)"));
    }

    #[test]
    fn cleans_and_cuts_text() {
        assert_eq!(clean_text("  a \n\n b\t\tc  ", 100), "a b c");
        assert_eq!(clean_text("abcdefghij", 4), "abcd");
        assert_eq!(clean_text("héllo wörld", 5), "héllo");
        assert_eq!(clean_text("", 5), "");
    }

    #[test]
    fn only_known_browsers() {
        assert_eq!(kind_of("Google Chrome"), Some(Kind::Chromium));
        assert_eq!(kind_of("Safari"), Some(Kind::Safari));
        assert_eq!(kind_of("Chrome\" & (do shell script \"x\") & \""), None);
        assert_eq!(kind_of("Firefox"), None);
    }

    #[test]
    fn scripts_have_the_right_shape() {
        let list = list_script("Safari", Kind::Safari);
        assert!(list.contains("name of t"));
        assert!(list_script("Arc", Kind::Chromium).contains("title of t"));
        let read = read_script("Google Chrome", Kind::Chromium, 77, 3);
        assert!(read.contains("tab 3 of (window id 77)"));
        assert!(read.contains("execute"));
        let read_s = read_script("Safari", Kind::Safari, 5, 1);
        assert!(read_s.contains("do JavaScript"));
        // The page script must be safe inside an AppleScript string.
        assert!(!PAGE_JS.contains('\\'));
        assert!(!PAGE_JS.contains('"'));
        assert!(focus_script("Safari", Kind::Safari, 5, 2).contains("current tab"));
    }

    #[test]
    fn explains_common_errors() {
        assert!(explain_error("Google Chrome", "execution error: Not authorized to send Apple events to Google Chrome. (-1743)").contains("Automation"));
        assert!(explain_error("Google Chrome", "Executing JavaScript through AppleScript is turned off.").contains("View menu"));
        assert!(explain_error("Safari", "You must enable 'Allow JavaScript from Apple Events' in the Develop menu").contains("Develop"));
        assert!(explain_error("Arc", "execution error: Can't get tab 9 of window id 1. (-1728)").contains("gone"));
    }
}
