// The CPU-only (WebAssembly) entry of onnxruntime-web has the same API as the package's main entry.
declare module "onnxruntime-web/wasm" {
  export * from "onnxruntime-common";
}
