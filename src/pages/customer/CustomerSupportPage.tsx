import React from "react";
import { HelpCircle, ShieldAlert, Phone, Mail, FileQuestion, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const CustomerSupportPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Editorial Header */}
      <div className="border-b border-[#DCD8CE] dark:border-[#24483C] pb-6">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#B49A63] bg-[#B49A63]/15 px-2.5 py-0.5 rounded-full">
          Client Care & Fraud Desk
        </span>
        <h1 className="font-serif text-3xl font-semibold text-[#102A23] dark:text-[#F7F4EC] mt-2">
          Help & Security Support
        </h1>
        <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] mt-1 font-sans">
          Instructions for portal features, disputing unrecognized charges, and contacting our private client risk team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reporting Guide Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#873C43]/15 text-[#873C43] flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            How to Report Suspicious Activity
          </h2>
          <ol className="space-y-2.5 text-xs text-[#5A6356] dark:text-[#DCD8CE] list-decimal list-inside leading-relaxed">
            <li>Go to <Link to="/customer/transactions" className="font-semibold text-[#102A23] dark:text-[#EEE8DA] underline">My Transactions</Link> or the <Link to="/customer/disputes" className="font-semibold text-[#102A23] dark:text-[#EEE8DA] underline">Disputes</Link> page.</li>
            <li>Locate the transaction you did not authorize or recognize.</li>
            <li>Click the <strong>Report Suspicious Activity</strong> button on the transaction row or voucher.</li>
            <li>Select the primary reason (e.g. Unauthorized Charge, Counterparty Mismatch) and optional notes.</li>
            <li>Submit the form to receive an auditable Reference Number (<code className="text-[#873C43]">DISP-...</code>).</li>
          </ol>
          <div className="pt-2">
            <Link
              to="/customer/disputes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#873C43] hover:underline"
            >
              Open Dispute Desk <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Contact Channels Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#B49A63]/15 text-[#B49A63] flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            Priority Assistance Channels
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/50 border border-[#DCD8CE]/40">
              <span className="font-semibold text-[#242923] dark:text-[#F7F4EC] block">24/7 Fraud & Dispute Hotline</span>
              <span className="text-[#5A6356] dark:text-[#DCD8CE] font-mono mt-0.5 block">+91 22 4918 0000 (Priority Routing)</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/50 border border-[#DCD8CE]/40">
              <span className="font-semibold text-[#242923] dark:text-[#F7F4EC] block">Security Operations Email</span>
              <span className="text-[#5A6356] dark:text-[#DCD8CE] font-mono mt-0.5 block">security@finverse.io</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/50 border border-[#DCD8CE]/40">
              <span className="font-semibold text-[#242923] dark:text-[#F7F4EC] block">Average Resolution Window</span>
              <span className="text-[#5A6356] dark:text-[#DCD8CE] mt-0.5 block">2 to 4 business hours for temporary hold confirmation.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupportPage;
