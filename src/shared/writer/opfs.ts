/** Where the writing models live: the browser's private storage for this extension (OPFS), folder "writer", one file
 * per model ("<id>.gguf") plus a small progress file ("<id>.json") while it downloads. Not visible to web pages. */

import type { DownloadProgress } from "./download";

export const WRITER_DIR = "writer";
export const modelFileName = (id: string) => `${id}.gguf`;
export const progressFileName = (id: string) => `${id}.json`;

export async function writerDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(WRITER_DIR, { create: true });
}

export async function readProgress(id: string): Promise<DownloadProgress | undefined> {
  try {
    const file = await (await (await writerDir()).getFileHandle(progressFileName(id))).getFile();
    return JSON.parse(await file.text()) as DownloadProgress;
  } catch {
    return undefined;
  }
}

export async function fileSize(id: string): Promise<number> {
  try {
    return (await (await (await writerDir()).getFileHandle(modelFileName(id))).getFile()).size;
  } catch {
    return 0;
  }
}

/** The finished model file (a disk-backed File: reading it does not load it all into memory). */
export async function modelFile(id: string): Promise<File | undefined> {
  try {
    return await (await (await writerDir()).getFileHandle(modelFileName(id))).getFile();
  } catch {
    return undefined;
  }
}

export async function removeModelFiles(id: string): Promise<void> {
  const dir = await writerDir();
  for (const name of [modelFileName(id), progressFileName(id)]) await dir.removeEntry(name).catch(() => undefined);
}
