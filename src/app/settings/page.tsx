// Updated /settings page: Blood Test Info tab now uses dose (mg) and time since injection (days) instead of injection time. Form and table updated accordingly. Sepia theme, minimal style.
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";
import NavBar from "../../components/NavBar";

const TABS = [
  { label: "Account", value: "account" },
  { label: "Measurements", value: "measurements" },
  { label: "Blood Test Info", value: "blood" },
  { label: "Misc", value: "misc" },
];

const HORMONES = ["estradiol", "testosterone"];
const UNITS = ["pg/mL", "ng/dL", "pmol/L"];
const ETHERS = ["enanthate", "cypionate", "valerate", "undecanoate", "propionate", "other"];

export default function SettingsPage() {
  const [tab, setTab] = useState("account");
  const [userId, setUserId] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bloodTests, setBloodTests] = useState<any[]>([]);
  const [btForm, setBtForm] = useState({
    test_time: "",
    hormone: HORMONES[0],
    ether: ETHERS[0],
    dose: "",
    time_since_injection: "",
    value: "",
    units: UNITS[0],
    notes: "",
  });
  const [btError, setBtError] = useState<string | null>(null);
  const [btLoading, setBtLoading] = useState(false);
  const router = useRouter();

  // Fetch user ID and blood tests on mount
  useEffect(() => {
    let uuid: string | null = null;
    supabase.auth.getUser().then(async ({ data }) => {
      uuid = data?.user?.id ?? null;
      if (uuid) {
        const { data: userIdData } = await supabase
          .from("user_ids")
          .select("user_id")
          .eq("user_uuid", uuid)
          .single();
        setUserId(userIdData?.user_id || null);
        // Fetch blood tests
        const { data: btData } = await supabase
          .from("blood_tests")
          .select("*")
          .eq("user_uuid", uuid)
          .order("test_time", { ascending: false });
        setBloodTests(btData || []);
      }
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    const { data } = await supabase.auth.getUser();
    const uuid = data?.user?.id;
    if (!uuid) {
      setDeleteError("No user found.");
      return;
    }
    // Delete from user_ids first (cascade will delete user)
    const { error } = await supabase.from("user_ids").delete().eq("user_uuid", uuid);
    if (error) {
      setDeleteError("Failed to delete account. Try again or contact support.");
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function handleBloodTestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBtError(null);
    setBtLoading(true);
    const { data: user } = await supabase.auth.getUser();
    const uuid = user?.user?.id;
    if (!uuid) {
      setBtError("Not signed in");
      setBtLoading(false);
      return;
    }
    const { error } = await supabase.from("blood_tests").insert([
      {
        user_uuid: uuid,
        hormone: btForm.hormone,
        test_time: btForm.test_time,
        ether: btForm.ether,
        dose: btForm.dose,
        time_since_injection: btForm.time_since_injection,
        value: btForm.value,
        units: btForm.units,
        notes: btForm.notes,
      },
    ]);
    if (error) {
      setBtError("Failed to save blood test");
      setBtLoading(false);
      return;
    }
    // Refresh blood tests
    const { data: btData } = await supabase
      .from("blood_tests")
      .select("*")
      .eq("user_uuid", uuid)
      .order("test_time", { ascending: false });
    setBloodTests(btData || []);
    setBtForm({ test_time: "", hormone: HORMONES[0], ether: ETHERS[0], dose: "", time_since_injection: "", value: "", units: UNITS[0], notes: "" });
    setBtLoading(false);
  }

  async function handleDeleteBloodTest(id: string) {
    const { data: user } = await supabase.auth.getUser();
    const uuid = user?.user?.id;
    if (!uuid) return;
    await supabase.from("blood_tests").delete().eq("id", id).eq("user_uuid", uuid);
    // Refresh blood tests
    const { data: btData } = await supabase
      .from("blood_tests")
      .select("*")
      .eq("user_uuid", uuid)
      .order("test_time", { ascending: false });
    setBloodTests(btData || []);
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-transparent text-[#3b2f1c] font-mono">
        <div className="w-full max-w-2xl mt-16">
          <div className="flex gap-4 mb-8 border-b border-[#bfae8e]">
            {TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`py-2 px-4 font-bold text-lg border-b-2 transition-colors ${tab === t.value ? 'border-[#3b2f1c]' : 'border-transparent'} bg-transparent text-[#3b2f1c]`}
                style={{ fontFamily: "inherit" }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {tab === "account" && (
              <div>
                <h2 className="text-xl font-bold mb-4">Account</h2>
                <div className="mb-4">
                  <div className="mb-1">Your user ID:</div>
                  <div className="font-bold text-lg select-all p-2 border border-[#bfae8e] rounded bg-[#f4ecd8] text-[#3b2f1c] inline-block">{userId || "…"}</div>
                  <button
                    className="ml-2 px-2 py-1 border border-[#bfae8e] rounded text-sm bg-[#f4ecd8] hover:bg-[#ede3c2]"
                    onClick={() => userId && navigator.clipboard.writeText(userId)}
                    disabled={!userId}
                  >
                    copy
                  </button>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    className="px-4 py-2 border border-[#bfae8e] rounded bg-[#f4ecd8] hover:bg-[#ede3c2] font-bold"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </button>
                  <button
                    className="px-4 py-2 border border-[#bfae8e] rounded bg-[#f4ecd8] hover:bg-red-200 font-bold text-red-700"
                    onClick={() => setShowDelete(true)}
                  >
                    Delete Account
                  </button>
                </div>
                {showDelete && (
                  <div className="mt-6 p-4 border border-[#bfae8e] rounded bg-[#f4ecd8]">
                    <div className="mb-2 font-bold text-red-700">Are you sure you want to delete your account? This cannot be undone.</div>
                    <button
                      className="px-4 py-2 border border-[#bfae8e] rounded bg-red-100 hover:bg-red-200 font-bold text-red-700 mr-2"
                      onClick={handleDeleteAccount}
                    >
                      Yes, delete my account
                    </button>
                    <button
                      className="px-4 py-2 border border-[#bfae8e] rounded bg-[#f4ecd8] hover:bg-[#ede3c2] font-bold"
                      onClick={() => setShowDelete(false)}
                    >
                      Cancel
                    </button>
                    {deleteError && <div className="text-red-600 mt-2">{deleteError}</div>}
                  </div>
                )}
              </div>
            )}
            {tab === "measurements" && (
              <div>
                <h2 className="text-xl font-bold mb-4">Your Measurements</h2>
                <p className="text-base">(Coming soon: enter your height, weight, etc. for personalized analysis.)</p>
              </div>
            )}
            {tab === "blood" && (
              <div>
                <h2 className="text-xl font-bold mb-4">Blood Test Info</h2>
                <form onSubmit={handleBloodTestSubmit} className="flex flex-col gap-3 mb-8">
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex flex-col">
                      <span className="text-xs mb-1">Test Date/Time</span>
                      <input
                        className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base w-44"
                        type="datetime-local"
                        value={btForm.test_time}
                        onChange={e => setBtForm(f => ({ ...f, test_time: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs mb-1">Hormone</span>
                      <select
                        className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base"
                        value={btForm.hormone}
                        onChange={e => setBtForm(f => ({ ...f, hormone: e.target.value }))}
                      >
                        {HORMONES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs mb-1">Ether</span>
                      <select
                        className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base"
                        value={btForm.ether}
                        onChange={e => setBtForm(f => ({ ...f, ether: e.target.value }))}
                      >
                        {ETHERS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs mb-1">Dose (mg)</span>
                      <input
                        className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base w-24"
                        type="number"
                        placeholder="Dose"
                        value={btForm.dose}
                        onChange={e => setBtForm(f => ({ ...f, dose: e.target.value }))}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs mb-1">Time Since Injection (days)</span>
                      <input
                        className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base w-24"
                        type="number"
                        placeholder="Days"
                        value={btForm.time_since_injection}
                        onChange={e => setBtForm(f => ({ ...f, time_since_injection: e.target.value }))}
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs mb-1">Value</span>
                      <input
                        className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base w-24"
                        type="number"
                        placeholder="Value"
                        value={btForm.value}
                        onChange={e => setBtForm(f => ({ ...f, value: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs mb-1">Units</span>
                      <select
                        className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base"
                        value={btForm.units}
                        onChange={e => setBtForm(f => ({ ...f, units: e.target.value }))}
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea
                    className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-base"
                    placeholder="Notes (optional)"
                    value={btForm.notes}
                    onChange={e => setBtForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                  />
                  <button
                    className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] font-bold text-base hover:bg-[#ede3c2] transition disabled:opacity-60 w-32"
                    type="submit"
                    disabled={btLoading}
                  >
                    {btLoading ? "Saving…" : "Save"}
                  </button>
                  {btError && <div className="text-red-600 text-center">{btError}</div>}
                </form>
                <div>
                  <h3 className="text-lg font-bold mb-2">Previous Results</h3>
                  {bloodTests.length === 0 && <div className="text-base">No blood test results yet.</div>}
                  {bloodTests.length > 0 && (
                    <table className="w-full text-base border-collapse">
                      <thead>
                        <tr>
                          <th className="border-b border-[#bfae8e] pb-1">Test Date</th>
                          <th className="border-b border-[#bfae8e] pb-1">Hormone</th>
                          <th className="border-b border-[#bfae8e] pb-1">Ether</th>
                          <th className="border-b border-[#bfae8e] pb-1">Dose (mg)</th>
                          <th className="border-b border-[#bfae8e] pb-1">Time Since Injection (days)</th>
                          <th className="border-b border-[#bfae8e] pb-1">Value</th>
                          <th className="border-b border-[#bfae8e] pb-1">Units</th>
                          <th className="border-b border-[#bfae8e] pb-1">Notes</th>
                          <th className="border-b border-[#bfae8e] pb-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloodTests.map(bt => (
                          <tr key={bt.id}>
                            <td className="py-1 pr-2 align-top">{bt.test_time ? new Date(bt.test_time).toLocaleString() : ""}</td>
                            <td className="py-1 pr-2 align-top">{bt.hormone}</td>
                            <td className="py-1 pr-2 align-top">{bt.ether}</td>
                            <td className="py-1 pr-2 align-top">{bt.dose}</td>
                            <td className="py-1 pr-2 align-top">{bt.time_since_injection}</td>
                            <td className="py-1 pr-2 align-top">{bt.value}</td>
                            <td className="py-1 pr-2 align-top">{bt.units}</td>
                            <td className="py-1 pr-2 align-top">{bt.notes}</td>
                            <td className="py-1 align-top">
                              <button
                                className="px-2 py-1 border border-[#bfae8e] rounded text-sm bg-[#f4ecd8] hover:bg-red-200 text-red-700"
                                onClick={() => handleDeleteBloodTest(bt.id)}
                              >
                                delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            {tab === "misc" && (
              <div>
                <h2 className="text-xl font-bold mb-4">Miscellaneous</h2>
                <p className="text-base">(Coming soon: more settings and features.)</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
} 