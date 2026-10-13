import { API_BASE_URL, request } from "./apiClient";
import { ReportConfig, ReportPreview } from "../types";

export const exportService = {
  async getReportPreview(
    config: ReportConfig,
    page: number = 1,
    pageSize: number = 15
  ): Promise<ReportPreview> {
    const params: Record<string, any> = {
      report_type: config.report_type,
      format: config.format,
      page,
      page_size: pageSize,
    };
    if (config.start_date) params.start_date = config.start_date;
    if (config.end_date) params.end_date = config.end_date;
    if (config.risk_category && config.risk_category !== "all") {
      params.risk_category = config.risk_category;
    }
    if (config.status && config.status !== "all") {
      params.status = config.status;
    }
    if (config.client_id) params.client_id = config.client_id;
    if (config.min_amount !== undefined && config.min_amount !== null) {
      params.min_amount = config.min_amount;
    }
    if (config.max_amount !== undefined && config.max_amount !== null) {
      params.max_amount = config.max_amount;
    }

    return request<ReportPreview>("/api/reports/preview", { params });
  },

  async downloadReport(config: ReportConfig): Promise<void> {
    const searchParams = new URLSearchParams();
    searchParams.append("report_type", config.report_type);
    searchParams.append("format", config.format);

    if (config.start_date) searchParams.append("start_date", config.start_date);
    if (config.end_date) searchParams.append("end_date", config.end_date);
    if (config.risk_category && config.risk_category !== "all") {
      searchParams.append("risk_category", config.risk_category);
    }
    if (config.status && config.status !== "all") {
      searchParams.append("status", config.status);
    }
    if (config.client_id) searchParams.append("client_id", config.client_id);
    if (config.min_amount !== undefined && config.min_amount !== null) {
      searchParams.append("min_amount", String(config.min_amount));
    }
    if (config.max_amount !== undefined && config.max_amount !== null) {
      searchParams.append("max_amount", String(config.max_amount));
    }

    const url = `${API_BASE_URL}/api/reports/export?${searchParams.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      let errText = "Failed to export report";
      try {
        const errJson = await res.json();
        errText = errJson.detail || errText;
      } catch {}
      throw new Error(errText);
    }

    const disposition = res.headers.get("Content-Disposition");
    let filename = `finverse_${config.report_type}_report.${config.format}`;
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
