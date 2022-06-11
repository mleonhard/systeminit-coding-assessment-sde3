fn main() {
    // "Changes in included files do not trigger a rebuild"
    // https://github.com/Michael-F-Bryan/include_dir/issues/77
    println!("cargo:rerun-if-changed=src/dist");
}
