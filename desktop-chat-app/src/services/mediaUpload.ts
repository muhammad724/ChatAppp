const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function uploadDrawing(blob: Blob): Promise<string> {
  if (apiUrl) {
    try {
      const body = new FormData();
      body.append("file", blob, `whiteboard-${Date.now()}.png`);
      body.append("type", "whiteboard");
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/uploads`, {
        method: "POST",
        body,
        credentials: "include"
      });
      if (response.ok) {
        const result = await response.json() as { url?: string; secure_url?: string };
        const url = result.url || result.secure_url;
        if (url) return url;
      }
    } catch {
      // Local desktop mode intentionally falls back to an embedded PNG.
    }
  }
  return blobToDataUrl(blob);
}
