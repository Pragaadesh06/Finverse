import { API_BASE_URL, request } from "./apiClient";
import {
  ImportPreviewResponse,
  ImportConfirmResponse,
  ImportJobItem,
} from "../types";

export const importService = {
  async uploadAndPreview(
    file: File,
    datasetType: string = "transactions",
    customMapping?: Record<string, string>
  ): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("dataset_type", datasetType);
    if (customMapping) {
      formData.append("custom_mapping", JSON.stringify(customMapping));
    }

    const res = await fetch(`${API_BASE_URL}/api/imports/preview`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      let errDetail = `File upload failed (${res.status})`;
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errDetail;
      } catch {}
      throw new Error(errDetail);
    }

    return res.json();
  },

  async confirmImport(
    importId: string,
    policy: "partial" | "strict" = "partial",
    duplicatePolicy: "skip" | "reject" = "skip"
  ): Promise<ImportConfirmResponse> {
    return request<ImportConfirmResponse>("/api/imports/confirm", {
      method: "POST",
      body: JSON.stringify({
        import_id: importId,
        policy,
        duplicate_policy: duplicatePolicy,
      }),
    });
  },

  async listImportJobs(
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ items: ImportJobItem[]; total: number }> {
    return request<{ items: ImportJobItem[]; total: number }>("/api/imports", {
      params: { page, page_size: pageSize },
    });
  },

  async downloadErrorReport(importId: string): Promise<void> {
    const url = `${API_BASE_URL}/api/imports/${importId}/errors`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      let errDetail = "Failed to download error report";
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errDetail;
      } catch {}
      throw new Error(errDetail);
    }

    const disposition = res.headers.get("Content-Disposition");
    let filename = `import_${importId}_rejected_rows.csv`;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  },
};
