use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[tauri::command]
fn compile_latex(tex_content: String, output_dir: String) -> Result<String, String> {
    fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    let tex_file_path = PathBuf::from(&output_dir).join("temp.tex");
    fs::write(&tex_file_path, tex_content).map_err(|e| e.to_string())?;

    let output = Command::new("pdflatex")
        .arg("-interaction=nonstopmode")
        .arg("-output-directory")
        .arg(&output_dir)
        .arg(&tex_file_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(PathBuf::from(&output_dir)
            .join("temp.pdf")
            .to_string_lossy()
            .to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_pdf_bytes(pdf_path: String) -> Result<Vec<u8>, String> {
    fs::read(pdf_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![compile_latex, get_pdf_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
