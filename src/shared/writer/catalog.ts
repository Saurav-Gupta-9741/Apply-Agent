/** The on-device writing models ApplyAgent can download (all Apache-2.0, Q4_K_M GGUF files from unsloth on Hugging
 * Face). Sizes and SHA-256 hashes come from the Hugging Face API (the LFS object id of each file) at the pinned
 * revision, so the bytes a user downloads are exactly the bytes that were tested. */

export interface WriterModel {
  id: string;
  name: string;
  /** Hugging Face repository. */
  repo: string;
  /** Pinned commit: the URL never changes under us. */
  revision: string;
  file: string;
  bytes: number;
  sha256: string;
  license: "apache-2.0";
}

export const CATALOG: readonly WriterModel[] = [
  {
    id: "qwen3.5-0.8b", name: "Qwen3.5-0.8B", repo: "unsloth/Qwen3.5-0.8B-GGUF", revision: "6ab461498e2023f6e3c1baea90a8f0fe38ab64d0",
    file: "Qwen3.5-0.8B-Q4_K_M.gguf", bytes: 532_517_120, sha256: "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517", license: "apache-2.0",
  },
  {
    id: "qwen3-1.7b", name: "Qwen3-1.7B", repo: "unsloth/Qwen3-1.7B-GGUF", revision: "d7f544eead698dbd1f15126ef60b45a1e1933222",
    file: "Qwen3-1.7B-Q4_K_M.gguf", bytes: 1_107_409_472, sha256: "b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897", license: "apache-2.0",
  },
  {
    id: "qwen3.5-2b", name: "Qwen3.5-2B", repo: "unsloth/Qwen3.5-2B-GGUF", revision: "f6d5376be1edb4d416d56da11e5397a961aca8ae",
    file: "Qwen3.5-2B-Q4_K_M.gguf", bytes: 1_280_835_840, sha256: "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223", license: "apache-2.0",
  },
  {
    id: "qwen3.5-4b", name: "Qwen3.5-4B", repo: "unsloth/Qwen3.5-4B-GGUF", revision: "e87f176479d0855a907a41277aca2f8ee7a09523",
    file: "Qwen3.5-4B-Q4_K_M.gguf", bytes: 2_740_937_888, sha256: "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4", license: "apache-2.0",
  },
];

export const DEFAULT_BASE_URL = "https://huggingface.co";

export function modelById(id: string | undefined): WriterModel | undefined {
  return CATALOG.find((m) => m.id === id);
}

/** The download address. Hugging Face redirects it to its CDN, which allows any origin (CORS), so no host permission
 * is needed. Only the file is requested: nothing about the user is sent. */
export function modelUrl(model: WriterModel, base = DEFAULT_BASE_URL): string {
  return `${base.replace(/\/+$/, "")}/${model.repo}/resolve/${model.revision}/${model.file}`;
}

/** "1.1 GB" (decimal gigabytes, as people read file sizes). */
export function gb(bytes: number): string {
  const v = bytes / 1e9;
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} GB`;
}
