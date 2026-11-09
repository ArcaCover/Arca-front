/** Hands a file the API returned to the browser as a download, through a temporary object URL. */
export function saveFile({ blob, filename }: { blob: Blob; filename: string }): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Released a moment later: the browser has to start reading the URL before it goes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
