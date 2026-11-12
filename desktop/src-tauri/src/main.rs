// Prevents an extra console window on Windows in release. Harmless on macOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod control;
mod tabs;

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const WIDGET_LABEL: &str = "widget";
const MAIN_LABEL: &str = "main";
const OVERLAY_LABEL: &str = "overlay";

/// Size of the collapsed widget (just the logo).
const LOGO_SIZE: f64 = 56.0;
/// Gap between the widget and the right edge of the screen.
const EDGE_MARGIN: f64 = 16.0;
/// Gap below the top of the screen, so the widget sits under the menu bar.
const MENU_BAR_OFFSET: f64 = 40.0;

/// True while the widget has text, a pending request, or an answer on screen.
/// In that case clicking another app should not hide it.
static WIDGET_STICKY: AtomicBool = AtomicBool::new(false);

/// True only while the user has started a screen control task. Without it, no clicks or typing happen.
static AGENT_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Resize the widget and pin its top right corner to the top right of the screen.
fn anchor_top_right(win: &WebviewWindow, width: f64, height: f64) -> tauri::Result<()> {
    let monitor = match win.primary_monitor()? {
        Some(m) => Some(m),
        None => win.current_monitor()?,
    };

    win.set_size(LogicalSize::new(width, height))?;

    if let Some(m) = monitor {
        let scale = m.scale_factor();
        let size = m.size().to_logical::<f64>(scale);
        let pos = m.position().to_logical::<f64>(scale);
        let x = pos.x + size.width - width - EDGE_MARGIN;
        let y = pos.y + MENU_BAR_OFFSET;
        win.set_position(LogicalPosition::new(x, y))?;
    }
    Ok(())
}

/// Called by the page whenever its content size changes.
#[tauri::command]
fn resize_widget(app: AppHandle, width: f64, height: f64) {
    if let Some(win) = app.get_webview_window(WIDGET_LABEL) {
        let w = width.clamp(LOGO_SIZE, 800.0);
        let h = height.clamp(LOGO_SIZE, 700.0);
        let _ = anchor_top_right(&win, w, h);
    }
}

#[tauri::command]
fn hide_widget(app: AppHandle) {
    WIDGET_STICKY.store(false, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window(WIDGET_LABEL) {
        let _ = win.hide();
    }
}

#[tauri::command]
fn set_widget_sticky(sticky: bool) {
    WIDGET_STICKY.store(sticky, Ordering::SeqCst);
}

/// Open a web page in the user's default browser. Only plain https links are allowed.
#[tauri::command]
fn open_external(url: String) {
    if !url.starts_with("https://") || url.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return;
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&url).spawn();
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let _ = std::process::Command::new("xdg-open").arg(&url).spawn();
    }
}


// ---------------------------------------------------------------------------
// TabBrain: read the tabs open in the user's browsers (macOS only).
// ---------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BrowserTab {
    browser: String,
    window_id: i64,
    tab_index: u32,
    title: String,
    url: String,
    /// False for settings pages, new tab pages and other things that have no readable text.
    readable: bool,
}

#[derive(Serialize)]
struct TabList {
    tabs: Vec<BrowserTab>,
    /// One plain-language message per browser that could not be listed.
    errors: Vec<String>,
}

/// List the open tabs of every supported browser that is running.
#[tauri::command]
async fn list_browser_tabs() -> Result<TabList, String> {
    if !cfg!(target_os = "macos") {
        return Err("Reading browser tabs works in the Mac app.".into());
    }
    tauri::async_runtime::spawn_blocking(|| -> Result<TabList, String> {
        let mut list = TabList { tabs: vec![], errors: vec![] };
        for name in tabs::browser_names() {
            if !tabs::is_running(name) {
                continue;
            }
            let Some(kind) = tabs::kind_of(name) else { continue };
            match tabs::run_osascript(&tabs::list_script(name, kind), name, Duration::from_secs(8)) {
                Ok(out) => {
                    for t in tabs::parse_tabs(&out) {
                        list.tabs.push(BrowserTab {
                            browser: name.to_string(),
                            window_id: t.window_id,
                            tab_index: t.tab_index,
                            readable: tabs::is_readable_url(&t.url),
                            title: t.title,
                            url: t.url,
                        });
                    }
                }
                Err(msg) => list.errors.push(format!("{name}: {msg}")),
            }
        }
        Ok(list)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Read the text of one tab. Only tabs the user picked are ever read.
#[tauri::command]
async fn read_browser_tab(browser: String, window_id: i64, tab_index: u32) -> Result<String, String> {
    let Some(kind) = tabs::kind_of(&browser) else {
        return Err("That browser is not supported.".into());
    };
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let script = tabs::read_script(&browser, kind, window_id, tab_index);
        let raw = tabs::run_osascript(&script, &browser, Duration::from_secs(10))?;
        let text = tabs::clean_text(&raw, 12_000);
        if text.is_empty() {
            Err("That tab has no readable text (it may still be loading).".to_string())
        } else {
            Ok(text)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Bring a tab to the front.
#[tauri::command]
async fn focus_browser_tab(browser: String, window_id: i64, tab_index: u32) -> Result<(), String> {
    let Some(kind) = tabs::kind_of(&browser) else {
        return Err("That browser is not supported.".into());
    };
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let script = tabs::focus_script(&browser, kind, window_id, tab_index);
        tabs::run_osascript(&script, &browser, Duration::from_secs(5)).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------------------------------------------------------------------------
// Screen control: the agent looks at the screen, then clicks and types for the user.
// ---------------------------------------------------------------------------

/// Option + Return approves the next action, Option + Delete skips it, Option + Escape stops.
/// These are global shortcuts so approving never moves focus away from the app being controlled.
fn agent_shortcuts() -> [Shortcut; 3] {
    [
        Shortcut::new(Some(Modifiers::ALT), Code::Enter),
        Shortcut::new(Some(Modifiers::ALT), Code::Backspace),
        Shortcut::new(Some(Modifiers::ALT), Code::Escape),
    ]
}

#[derive(Serialize)]
struct Permissions {
    screen: bool,
    accessibility: bool,
}

#[tauri::command]
fn agent_permissions() -> Permissions {
    #[cfg(target_os = "macos")]
    {
        Permissions {
            screen: control::mac::screen_allowed(),
            accessibility: control::mac::accessibility_allowed(),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Permissions { screen: false, accessibility: false }
    }
}

/// Ask macOS for Screen Recording and Accessibility, which puts OmniDesk in both lists.
#[tauri::command]
fn request_agent_permissions() {
    #[cfg(target_os = "macos")]
    control::mac::request_permissions();
}

/// Open the System Settings page where the user turns a permission on.
#[tauri::command]
fn open_privacy_settings(pane: String) {
    #[cfg(target_os = "macos")]
    control::mac::open_privacy_pane(&pane);
    #[cfg(not(target_os = "macos"))]
    let _ = pane;
}

#[derive(Deserialize)]
struct AgentStart {
    task: String,
    /// "ask" asks before every action. "auto" only asks before risky ones.
    mode: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AgentTask {
    task: String,
    mode: String,
    screen_w: f64,
    screen_h: f64,
    origin_x: f64,
    origin_y: f64,
}

/// Begin a screen control task. Hides the main window so it is not in the way.
#[tauri::command]
fn agent_start(app: AppHandle, req: AgentStart) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, req);
        return Err("Screen control works in the Mac app.".into());
    }
    #[cfg(target_os = "macos")]
    {
        let task = req.task.trim().to_string();
        if task.is_empty() || task.chars().count() > 1500 {
            return Err("Describe the task in a sentence or two.".into());
        }
        if req.mode != "ask" && req.mode != "auto" {
            return Err("Unknown mode.".into());
        }
        if AGENT_ACTIVE.load(Ordering::SeqCst) {
            return Err("A task is already running. Press Option + Escape to stop it.".into());
        }
        if !control::mac::screen_allowed() {
            return Err("Turn on Screen Recording for OmniDesk first.".into());
        }
        if !control::mac::accessibility_allowed() {
            return Err("Turn on Accessibility for OmniDesk first.".into());
        }
        let overlay = app.get_webview_window(OVERLAY_LABEL).ok_or("The control overlay is missing.")?;

        // The stop shortcut must work, or we do not start at all.
        let keys = agent_shortcuts();
        let gs = app.global_shortcut();
        for k in keys {
            if gs.register(k).is_err() {
                for done in keys {
                    let _ = gs.unregister(done);
                }
                return Err("Option + Return, Option + Delete or Option + Escape is taken by another app. Free it and try again.".into());
            }
        }

        let (w, h) = control::mac::display_size();
        let _ = overlay.set_position(LogicalPosition::new(0.0, 0.0));
        let _ = overlay.set_size(LogicalSize::new(w, h));
        let _ = overlay.set_ignore_cursor_events(true);
        let _ = overlay.show();
        let scale = overlay.scale_factor().unwrap_or(1.0);
        let origin = overlay
            .outer_position()
            .map(|p| p.to_logical::<f64>(scale))
            .unwrap_or_else(|_| LogicalPosition::new(0.0, 0.0));

        if let Some(main) = app.get_webview_window(MAIN_LABEL) {
            let _ = main.hide();
        }
        WIDGET_STICKY.store(false, Ordering::SeqCst);
        if let Some(widget) = app.get_webview_window(WIDGET_LABEL) {
            let _ = widget.hide();
        }

        AGENT_ACTIVE.store(true, Ordering::SeqCst);
        let payload = AgentTask { task, mode: req.mode, screen_w: w, screen_h: h, origin_x: origin.x, origin_y: origin.y };
        app.emit_to(OVERLAY_LABEL, "agent-task", payload).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[derive(Deserialize, Serialize, Clone)]
struct AgentReport {
    task: String,
    summary: String,
    success: bool,
    steps: Vec<String>,
}

/// Finish the task: release the shortcuts, hide the overlay, bring OmniDesk back with a report.
#[tauri::command]
fn agent_end(app: AppHandle, report: AgentReport) {
    AGENT_ACTIVE.store(false, Ordering::SeqCst);
    let gs = app.global_shortcut();
    for k in agent_shortcuts() {
        let _ = gs.unregister(k);
    }
    if let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = overlay.hide();
    }
    show_main(&app);
    let _ = app.emit_to(MAIN_LABEL, "agent-report", report);
}

#[derive(Serialize)]
struct Shot {
    /// JPEG, base64 encoded.
    image: String,
    width: f64,
    height: f64,
}

/// A screenshot of the main display. Only works while a task is running.
#[tauri::command]
async fn capture_screen() -> Result<Shot, String> {
    if !AGENT_ACTIVE.load(Ordering::SeqCst) {
        return Err("No screen control task is running.".into());
    }
    #[cfg(not(target_os = "macos"))]
    {
        return Err("Screen control works in the Mac app.".into());
    }
    #[cfg(target_os = "macos")]
    {
        use base64::{engine::general_purpose::STANDARD, Engine};
        tauri::async_runtime::spawn_blocking(|| -> Result<Shot, String> {
            let bytes = control::mac::screenshot_jpeg()?;
            let (width, height) = control::mac::display_size();
            Ok(Shot { image: STANDARD.encode(bytes), width, height })
        })
        .await
        .map_err(|e| e.to_string())?
    }
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum AgentAction {
    Click {
        x: f64,
        y: f64,
        #[serde(default)]
        right: bool,
        #[serde(default = "one")]
        count: u32,
    },
    Type { text: String },
    Keys { keys: String },
    Scroll {
        x: f64,
        y: f64,
        direction: String,
        #[serde(default = "three")]
        amount: i32,
    },
}

fn one() -> u32 {
    1
}
fn three() -> i32 {
    3
}

/// Do one action. Positions are on a 0 to 1000 grid over the screenshot.
#[tauri::command]
async fn agent_act(action: AgentAction) -> Result<(), String> {
    if !AGENT_ACTIVE.load(Ordering::SeqCst) {
        return Err("Stopped.".into());
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = action;
        return Err("Screen control works in the Mac app.".into());
    }
    #[cfg(target_os = "macos")]
    {
        tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
            if !control::mac::accessibility_allowed() {
                return Err("Accessibility is off for OmniDesk. Turn it on in System Settings.".into());
            }
            let (w, h) = control::mac::display_size();
            match action {
                AgentAction::Click { x, y, right, count } => {
                    control::mac::click(control::to_point(x, w), control::to_point(y, h), right, count)
                }
                AgentAction::Type { text } => {
                    if text.chars().count() > 2000 {
                        return Err("That text is too long to type at once.".into());
                    }
                    control::mac::type_text(&text)
                }
                AgentAction::Keys { keys } => control::mac::press(control::parse_chord(&keys)?),
                AgentAction::Scroll { x, y, direction, amount } => {
                    let n = amount.clamp(1, 15);
                    let (dx, dy) = match direction.as_str() {
                        "up" => (0, n),
                        "down" => (0, -n),
                        "left" => (n, 0),
                        "right" => (-n, 0),
                        _ => return Err("Scroll up, down, left or right.".into()),
                    };
                    control::mac::scroll(control::to_point(x, w), control::to_point(y, h), dx, dy)
                }
            }
        })
        .await
        .map_err(|e| e.to_string())?
    }
}

/// Bring the full OmniDesk window to the front.
#[tauri::command]
fn open_main_window(app: AppHandle) {
    WIDGET_STICKY.store(false, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window(WIDGET_LABEL) {
        let _ = win.hide();
    }
    show_main(&app);
}

fn show_main(app: &AppHandle) {
    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
}

/// Option + / : show the widget if it is hidden, hide it if it is showing.
fn toggle_widget(app: &AppHandle) {
    let Some(win) = app.get_webview_window(WIDGET_LABEL) else {
        return;
    };

    if win.is_visible().unwrap_or(false) {
        WIDGET_STICKY.store(false, Ordering::SeqCst);
        let _ = win.hide();
        return;
    }

    // Re-pin to the corner in case the screen setup changed since last time.
    let scale = win.scale_factor().unwrap_or(1.0);
    let size = win
        .inner_size()
        .map(|s| s.to_logical::<f64>(scale))
        .unwrap_or_else(|_| LogicalSize::new(LOGO_SIZE, LOGO_SIZE));
    let _ = anchor_top_right(&win, size.width, size.height);

    let _ = win.show();
    let _ = win.set_focus();
    // Tell the page it was just summoned.
    let _ = win.eval("window.dispatchEvent(new Event('omnidesk-summon'))");
}

fn main() {
    // Summon shortcut: Option + / on macOS (Option maps to ALT).
    let summon = Shortcut::new(Some(Modifiers::ALT), Code::Slash);
    let [approve, skip, stop] = agent_shortcuts();

    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if shortcut == &summon {
                        toggle_widget(app);
                    } else if shortcut == &approve {
                        let _ = app.emit("agent-approve", ());
                    } else if shortcut == &skip {
                        let _ = app.emit("agent-skip", ());
                    } else if shortcut == &stop {
                        // Cut off input right away, even if the page is slow to react.
                        AGENT_ACTIVE.store(false, Ordering::SeqCst);
                        let _ = app.emit("agent-stop", ());
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            resize_widget,
            hide_widget,
            set_widget_sticky,
            open_main_window,
            open_external,
            list_browser_tabs,
            read_browser_tab,
            focus_browser_tab,
            agent_permissions,
            request_agent_permissions,
            open_privacy_settings,
            agent_start,
            agent_end,
            capture_screen,
            agent_act
        ])
        .setup(move |app| {
            // The small, borderless, see-through window pinned to the top right.
            let widget = WebviewWindowBuilder::new(
                app,
                WIDGET_LABEL,
                WebviewUrl::App("index.html".into()),
            )
            .title("OmniDesk Quick Search")
            .inner_size(LOGO_SIZE, LOGO_SIZE)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .visible(false)
            .visible_on_all_workspaces(true)
            .accept_first_mouse(true)
            .build()?;

            let _ = anchor_top_right(&widget, LOGO_SIZE, LOGO_SIZE);

            // A see-through, click-through layer over the whole screen. It draws the AI's
            // pointer and the status card, and never takes focus or mouse clicks.
            let overlay = WebviewWindowBuilder::new(
                app,
                OVERLAY_LABEL,
                WebviewUrl::App("index.html".into()),
            )
            .title("OmniDesk Screen Control")
            .inner_size(800.0, 600.0)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .visible(false)
            .focused(false)
            .visible_on_all_workspaces(true)
            .build()?;
            let _ = overlay.set_ignore_cursor_events(true);

            // Clicking another app hides the widget, unless it is holding an answer.
            let w = widget.clone();
            widget.on_window_event(move |event| {
                if let WindowEvent::Focused(false) = event {
                    if !WIDGET_STICKY.load(Ordering::SeqCst) {
                        let _ = w.hide();
                    }
                }
            });

            // Closing the main window keeps OmniDesk running so the shortcut still works.
            if let Some(main) = app.get_webview_window(MAIN_LABEL) {
                let m = main.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = m.hide();
                    }
                });
            }

            app.global_shortcut().register(summon)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building OmniDesk");

    app.run(|app_handle, event| {
        // Clicking the Dock icon brings the main window back.
        #[cfg(target_os = "macos")]
        {
            if let tauri::RunEvent::Reopen { .. } = event {
                show_main(app_handle);
            }
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = (app_handle, event);
        }
    });
}
