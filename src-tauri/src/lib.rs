use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
}

/// Deterministic ID derived from the source file's absolute path.
/// Used to give each .tex file its own cached .pdf in the output dir.
fn path_id(source_path: &str) -> String {
    let mut hasher = DefaultHasher::new();
    source_path.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

#[tauri::command]
fn compile_latex(
    tex_content: String,
    output_dir: String,
    source_dir: String,
    source_path: String,
) -> Result<String, String> {
    fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    let id = path_id(&source_path);
    let tex_file_path = PathBuf::from(&output_dir).join(format!("{}.tex", id));
    fs::write(&tex_file_path, tex_content).map_err(|e| e.to_string())?;

    let output = Command::new("pdflatex")
        .current_dir(&source_dir)
        .arg("-interaction=nonstopmode")
        .arg("-output-directory")
        .arg(&output_dir)
        .arg(&tex_file_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(PathBuf::from(&output_dir)
            .join(format!("{}.pdf", id))
            .to_string_lossy()
            .to_string())
    } else {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(if !stdout.is_empty() { stdout } else { stderr })
    }
}

#[tauri::command]
fn get_pdf_bytes(pdf_path: String) -> Result<Vec<u8>, String> {
    fs::read(pdf_path).map_err(|e| e.to_string())
}

/// Returns the cached PDF bytes for a given source file, if one exists.
#[tauri::command]
fn get_cached_pdf(source_path: String, output_dir: String) -> Result<Option<Vec<u8>>, String> {
    let pdf_path = PathBuf::from(&output_dir).join(format!("{}.pdf", path_id(&source_path)));
    if pdf_path.exists() {
        Ok(Some(fs::read(pdf_path).map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            result.push(FileEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry.path().to_string_lossy().to_string(),
                is_dir: meta.is_dir(),
            });
        }
    }
    result.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(result)
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

/// Formats LaTeX content using latexindent (must be on PATH).
/// Reads content from stdin and returns the formatted output.
#[tauri::command]
fn format_latex(content: String) -> Result<String, String> {
    let mut child = Command::new("latexindent")
        .args(["-s", "-"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    child
        .stdin
        .take()
        .unwrap()
        .write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;

    let output = child.wait_with_output().map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(if !stderr.is_empty() { stderr } else { stdout })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_decorum::init())
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            main_window.create_overlay_titlebar().unwrap();
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            compile_latex,
            format_latex,
            get_pdf_bytes,
            get_cached_pdf,
            read_directory,
            read_file_content,
            write_file_content,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
