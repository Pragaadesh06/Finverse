import React, { useState } from "react";
import { User, Shield, Key, CheckCircle, Smartphone, Lock, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { customerService } from "../../services/customerService";

export const CustomerProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.name || "");
  const [twoFa, setTwoFa] = useState(Boolean(user?.twoFactorEnabled));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await customerService.updateProfile({
        full_name: fullName,
        two_factor_enabled: twoFa,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn">
      {/* Editorial Header */}
      <div className="border-b border-[#DCD8CE] dark:border-[#24483C] pb-6">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#B49A63] bg-[#B49A63]/15 px-2.5 py-0.5 rounded-full">
          Account Governance
        </span>
        <h1 className="font-serif text-3xl font-semibold text-[#102A23] dark:text-[#F7F4EC] mt-2">
          Profile & Security Settings
        </h1>
        <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] mt-1 font-sans">
          Manage your verified customer credentials, multi-factor authentication, and security preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Credentials */}
        <div className="bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC] flex items-center gap-2">
            <User className="w-4 h-4 text-[#B49A63]" />
            Personal Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#5A6356] dark:text-[#DCD8CE] mb-1 font-medium">
                Full Legal Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#5A6356] dark:text-[#DCD8CE] mb-1 font-medium">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full p-2.5 rounded-xl bg-[#EEE8DA]/50 dark:bg-[#102A23]/30 border border-[#DCD8CE] dark:border-[#24483C] text-[#5A6356] cursor-not-allowed"
              />
              <span className="text-[10px] text-[#5A6356] mt-1 block">Verified institutional email</span>
            </div>

            <div>
              <label className="block text-[#5A6356] dark:text-[#DCD8CE] mb-1 font-medium">
                Customer Account Number
              </label>
              <input
                type="text"
                disabled
                value={user?.customerAccountId || "ACC-5120"}
                className="w-full p-2.5 rounded-xl bg-[#EEE8DA]/50 dark:bg-[#102A23]/30 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[#5A6356] dark:text-[#DCD8CE] mb-1 font-medium">
                Access Role
              </label>
              <div className="p-2.5 rounded-xl bg-[#EEE8DA]/50 dark:bg-[#102A23]/30 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] font-semibold text-xs capitalize">
                {user?.role || "Customer"}
              </div>
            </div>
          </div>
        </div>

        {/* Security & 2FA */}
        <div className="bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#B49A63]" />
            Security & Authentication
          </h2>

          <div className="flex items-center justify-between p-4 rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/50 border border-[#DCD8CE]/60 dark:border-[#24483C]">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[#242923] dark:text-[#F7F4EC] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#B49A63]" />
                Two-Factor Verification (OTP via Email)
              </span>
              <p className="text-[11px] text-[#5A6356] dark:text-[#DCD8CE]">
                Require a cryptographic one-time passcode for every account login and wire authorization.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={twoFa}
                onChange={(e) => setTwoFa(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-[#DCD8CE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E7D52]"></div>
            </label>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-[#738875]/15 border border-[#738875]/30 text-xs text-[#2E7D52] dark:text-[#8EBE95] flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Security preferences updated successfully.
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2.5 rounded-xl border border-[#873C43]/30 text-[#873C43] hover:bg-[#873C43]/10 text-xs font-medium transition flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Log Out Securely
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#193C32] dark:bg-[#EEE8DA] text-white dark:text-[#102A23] text-xs font-semibold hover:bg-[#102A23] dark:hover:bg-white transition shadow-sm"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerProfilePage;
