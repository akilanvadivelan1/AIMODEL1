// Prevents an extra console window on Windows in release. Harmless on macOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tabs;

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use serde::Serialize;

use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const WIDGET_LABEL: &str = "widget";
const MAIN_LABEL: &str = "main";

/// Size of the collapsed widget (just the logo).
const LOGO_SIZE: f64 = 56.0;
/// Gap between the widget and the right edge of the screen.
const EDGE_MARGIN: f64 = 16.0;
/// Gap below the top of the screen, so the widget sits under the menu bar.
const MENU_BAR_OFFSET: f64 = 40.0;

/// True while the widget has text, a pending request, or an answer on screen.
/// In that case clicking another app should not hide it.
static WIDGET_STICKY: AtomicBool = AtomicBool::new(false);

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

    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &summon {
                        toggle_widget(app);
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
            focus_browser_tab
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
