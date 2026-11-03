// Prevents an extra console window on Windows in release. Harmless on macOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

/// Show and focus the main window; if already visible, hide it (toggle).
fn toggle_window(window: &WebviewWindow) {
    match window.is_visible() {
        Ok(true) => {
            let _ = window.hide();
        }
        _ => {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn main() {
    // Default summon shortcut: Cmd+Shift+Space on macOS.
    let summon = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Space);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &summon {
                        if let Some(win) = app.get_webview_window("main") {
                            toggle_window(&win);
                        }
                    }
                })
                .build(),
        )
        .setup(move |app| {
            // Register the global summon shortcut at startup.
            app.global_shortcut().register(summon)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running OmniDesk");
}
