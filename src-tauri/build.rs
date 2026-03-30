fn main() {
    println!("cargo:rustc-link-lib=framework=LocalAuthentication");
    tauri_build::build()
}
