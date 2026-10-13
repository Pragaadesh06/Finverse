import React from "react";
import { Download, FileSpreadsheet, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { customerService } from "../../services/customerService";
import { useAuth } from "../../contexts/AuthContext";

export const CustomerExportPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Editorial Header */}
      <div className="border-b border-[#DCD8CE] dark:border-[#24483C] pb-6">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#B49A63] bg-[#B49A63]/15 px-2.5 py-0.5 rounded-full">
          Data Governance & Statements
        </span>
        <h1 className="font-serif text-3xl font-semibold text-[#102A23] dark:text-[#F7F4EC] mt-2">
          Export Account Records
        </h1>
        <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] mt-1 font-sans">
          Download your complete cryptographic payment ledger and account activity for personal records or accounting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Export Card */}
        <div className="md:col-span-2 bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] p-6 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[#193C32]/10 dark:bg-[#EEE8DA]/10 text-[#193C32] dark:text-[#EEE8DA]">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC]">
                Account Statement (CSV)
              </h2>
              <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] mt-1 leading-relaxed">
                Contains all verified debits, credits, timestamps, references, and counterparty entities associated with your account ({user?.customerAccountId || "ACC-5120"}).
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs border-y border-[#DCD8CE]/40 py-4">
            <div className="flex items-center gap-2 text-[#5A6356] dark:text-[#DCD8CE]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D52]" />
              <span>Full transaction date & UTC clearing timestamp</span>
            </div>
            <div className="flex items-center gap-2 text-[#5A6356] dark:text-[#DCD8CE]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D52]" />
              <span>Clean Indian Rupee (INR) amounts with transaction references</span>
            </div>
            <div className="flex items-center gap-2 text-[#5A6356] dark:text-[#DCD8CE]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D52]" />
              <span>Sanitized customer settlement status guide</span>
            </div>
            <div className="flex items-center gap-2 text-[#5A6356] dark:text-[#DCD8CE]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D52]" />
              <span>Automatic spreadsheet formula injection protection</span>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={customerService.getExportDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#193C32] dark:bg-[#EEE8DA] text-white dark:text-[#102A23] text-xs font-semibold hover:bg-[#102A23] dark:hover:bg-white transition shadow-sm"
            >
              <Download className="w-4 h-4 text-[#B49A63]" />
              Download Statement CSV
            </a>
          </div>
        </div>

        {/* Security & Ownership Info */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#EEE8DA]/40 dark:bg-[#102A23]/50 border border-[#DCD8CE] dark:border-[#24483C] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#193C32] dark:text-[#B49A63]">
              <Lock className="w-4 h-4" />
              Ownership Isolation Policy
            </div>
            <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] leading-relaxed">
              In accordance with banking privacy regulations, customer downloads strictly encapsulate records belonging directly to your account.
            </p>
            <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] leading-relaxed">
              Institutional intelligence data, other clients' information, and internal risk scores are categorically withheld from statement exports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerExportPage;
