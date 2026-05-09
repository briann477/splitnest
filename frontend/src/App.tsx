import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Pencil,
  Plus,
  ReceiptText,
  Scale,
  Settings,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";

const API_URL = "http://localhost:8080/api";
const GROUP_ID = 1;

const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "House Supplies",
  "Rent",
  "Entertainment",
  "Other",
];

type Group = {
  id: number;
  name: string;
  description: string | null;
};

type Member = {
  id: number;
  group_id: number;
  name: string;
  email: string | null;
};

type ExpenseParticipant = {
  id: number;
  expense_id: number;
  member_id: number;
  member_name: string;
  share_amount: number;
};

type Expense = {
  id: number;
  group_id: number;
  paid_by_member_id: number;
  paid_by_name: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  participants: ExpenseParticipant[];
};

type MemberBalance = {
  member_id: number;
  member_name: string;
  paid: number;
  share: number;
  balance: number;
};

type SettlementSuggestion = {
  from_member_id: number;
  from_member_name: string;
  to_member_id: number;
  to_member_name: string;
  amount: number;
};

type SettlementHistory = {
  id: number;
  group_id: number;
  from_member_id: number;
  from_member_name: string;
  to_member_id: number;
  to_member_name: string;
  amount: number;
  status: string;
  settled_at: string | null;
  created_at: string;
};

type BalanceData = {
  balances: MemberBalance[];
  settlements: SettlementSuggestion[];
};

type AddExpenseForm = {
  title: string;
  category: string;
  amount: string;
  expense_date: string;
  notes: string;
  paid_by_member_id: string;
  participant_ids: number[];
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function Sidebar() {
  const menus = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Groups", icon: Users },
    { label: "Expenses", icon: ReceiptText },
    { label: "Balances", icon: Scale },
    { label: "Wallet", icon: Wallet },
    { label: "Settings", icon: Settings },
  ];

  return (
    <aside className="hidden h-screen w-72 border-r border-slate-200 bg-white/90 px-5 py-6 backdrop-blur-xl lg:fixed lg:flex lg:flex-col">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-lg font-black text-white shadow-lg shadow-emerald-500/20">
          SN
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950">
            SplitNest
          </h1>
          <p className="text-xs font-medium text-slate-500">Expense manager</p>
        </div>
      </div>

      <nav className="space-y-2">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <button
              key={menu.label}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                menu.active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon size={18} />
              {menu.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
          <CircleDollarSign size={20} />
        </div>
        <p className="text-sm font-bold text-slate-900">Smart split bill</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Semua utang dan patungan dihitung otomatis.
        </p>
      </div>
    </aside>
  );
}

function MobileTopbar() {
  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-sm font-black text-white shadow-lg shadow-emerald-500/20">
            SN
          </div>

          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-950">
              SplitNest
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Expense manager
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600">
          MVP
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone: "blue" | "green" | "red" | "purple";
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: StatCardProps) {
  const tones = {
    blue: "bg-sky-50 text-sky-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
    purple: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}
      >
        <Icon size={21} />
      </div>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </h2>
      <p className="mt-1 truncate text-sm text-slate-500">{description}</p>
    </div>
  );
}

type AddExpenseModalProps = {
  activeGroupID: number;
  members: Member[];
  isOpen: boolean;
  editingExpense: Expense | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
};
function AddExpenseModal({
  activeGroupID,
  members,
  isOpen,
  editingExpense,
  onClose,
  onCreated,
}: AddExpenseModalProps) {
  const [form, setForm] = useState<AddExpenseForm>({
    title: "",
    category: "Other",
    amount: "",
    expense_date: getTodayDate(),
    notes: "",
    paid_by_member_id: "",
    participant_ids: [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (editingExpense) {
      setForm({
        title: editingExpense.title,
        category: editingExpense.category || "Other",
        amount: String(editingExpense.amount),
        expense_date: editingExpense.expense_date.slice(0, 10),
        notes: editingExpense.notes ?? "",
        paid_by_member_id: String(editingExpense.paid_by_member_id),
        participant_ids: editingExpense.participants.map(
          (participant) => participant.member_id,
        ),
      });

      return;
    }

    if (members.length > 0) {
      setForm((current) => ({
        ...current,
        paid_by_member_id: current.paid_by_member_id || String(members[0].id),
        participant_ids:
          current.participant_ids.length > 0
            ? current.participant_ids
            : members.map((m) => m.id),
      }));
    }
  }, [isOpen, members, editingExpense]);

  if (!isOpen) return null;

  function toggleParticipant(memberID: number) {
    setForm((current) => {
      const exists = current.participant_ids.includes(memberID);

      return {
        ...current,
        participant_ids: exists
          ? current.participant_ids.filter((id) => id !== memberID)
          : [...current.participant_ids, memberID],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const amountNumber = Number(form.amount);
    const payerID = Number(form.paid_by_member_id);

    if (!form.title.trim()) {
      setError("Judul expense wajib diisi.");
      return;
    }

    if (!amountNumber || amountNumber <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }

    if (!payerID) {
      setError("Pilih siapa yang bayar duluan.");
      return;
    }

    if (form.participant_ids.length === 0) {
      setError("Pilih minimal satu peserta split.");
      return;
    }

    if (!form.participant_ids.includes(payerID)) {
      setError("Pembayar harus termasuk peserta split.");
      return;
    }

    try {
      setSubmitting(true);

      const url = editingExpense
        ? `${API_URL}/expenses/${editingExpense.id}`
        : `${API_URL}/groups/${activeGroupID}/expenses`;

      const method = editingExpense ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          amount: amountNumber,
          expense_date: form.expense_date,
          notes: form.notes.trim() || null,
          paid_by_member_id: payerID,
          participant_ids: form.participant_ids,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Gagal membuat expense.");
      }

      setForm({
        title: "",
        category: "Other",
        amount: "",
        expense_date: getTodayDate(),
        notes: "",
        paid_by_member_id: members[0] ? String(members[0].id) : "",
        participant_ids: members.map((member) => member.id),
      });

      await onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-600">
              {editingExpense ? "Edit Expense" : "New Expense"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Catat siapa yang bayar duluan dan siapa aja yang ikut patungan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Expense Name
              </span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Contoh: Makan malam"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Amount</span>
              <input
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
                type="number"
                min="0"
                placeholder="Contoh: 300000"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Paid By</span>
              <select
                value={form.paid_by_member_id}
                onChange={(event) =>
                  setForm({ ...form, paid_by_member_id: event.target.value })
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Date</span>
              <input
                value={form.expense_date}
                onChange={(event) =>
                  setForm({ ...form, expense_date: event.target.value })
                }
                type="date"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Catatan tambahan, opsional"
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                Participants
              </span>
              <span className="text-xs font-bold text-slate-400">
                {form.participant_ids.length} selected
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {members.map((member) => {
                const active = form.participant_ids.includes(member.id);

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editingExpense
                  ? "Update Expense"
                  : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type AddGroupModalProps = {
  isOpen: boolean;
  editingGroup: Group | null;
  onClose: () => void;
  onCreated: (groupID: number) => Promise<void>;
};

function AddGroupModal({
  isOpen,
  editingGroup,
  onClose,
  onCreated,
}: AddGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description ?? "");
      return;
    }

    setName("");
    setDescription("");
  }, [isOpen, editingGroup]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Group name wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);

      const url = editingGroup
        ? `${API_URL}/groups/${editingGroup.id}`
        : `${API_URL}/groups`;

      const method = editingGroup ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Gagal membuat group.");
      }

      setName("");
      setDescription("");

      await onCreated(editingGroup ? editingGroup.id : json.data.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-600">
              {editingGroup ? "Edit Group" : "New Group"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {editingGroup ? "Edit Group" : "Tambah Group"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Buat group baru untuk trip, kontrakan, event, atau patungan lain.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Group Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Trip Bali"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Deskripsi group, opsional"
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 pt-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editingGroup
                  ? "Update Group"
                  : "Save Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type AddMemberModalProps = {
  activeGroupID: number;
  isOpen: boolean;
  editingMember: Member | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

function AddMemberModal({
  activeGroupID,
  isOpen,
  editingMember,
  onClose,
  onCreated,
}: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (editingMember) {
      setName(editingMember.name);
      setEmail(editingMember.email ?? "");
      return;
    }

    setName("");
    setEmail("");
  }, [isOpen, editingMember]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Member name wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);

      const url = editingMember
        ? `${API_URL}/members/${editingMember.id}`
        : `${API_URL}/groups/${activeGroupID}/members`;

      const method = editingMember ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Gagal menambah member.");
      }

      setName("");
      setEmail("");

      await onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-600">
              {editingMember ? "Edit Member" : "New Member"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {editingMember ? "Edit Member" : "Tambah Member"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tambahkan anggota ke group aktif agar bisa ikut split bill.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              Member Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Raka"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Opsional: raka@example.com"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 pt-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editingMember
                  ? "Update Member"
                  : "Save Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupID, setActiveGroupID] = useState<number>(GROUP_ID);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [settlementHistory, setSettlementHistory] = useState<
    SettlementHistory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [settlingKey, setSettlingKey] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");

  async function fetchData() {
    try {
      setLoading(true);

      const [
        groupsRes,
        groupRes,
        memberRes,
        expenseRes,
        balanceRes,
        settlementRes,
      ] = await Promise.all([
        fetch(`${API_URL}/groups`),
        fetch(`${API_URL}/groups/${activeGroupID}`),
        fetch(`${API_URL}/groups/${activeGroupID}/members`),
        fetch(`${API_URL}/groups/${activeGroupID}/expenses`),
        fetch(`${API_URL}/groups/${activeGroupID}/balances`),
        fetch(`${API_URL}/groups/${activeGroupID}/settlements`),
      ]);

      const groupsJson = await groupsRes.json();
      const groupJson = await groupRes.json();
      const memberJson = await memberRes.json();
      const expenseJson = await expenseRes.json();
      const balanceJson = await balanceRes.json();
      const settlementJson = await settlementRes.json();

      setGroups(groupsJson.data);
      setGroup(groupJson.data);
      setMembers(memberJson.data);
      setExpenses(expenseJson.data);
      setBalanceData(balanceJson.data);
      setSettlementHistory(settlementJson.data);
    } catch (error) {
      console.error("Failed to fetch SplitNest data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteGroup() {
    if (!group) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${group.name}"? This will delete all members, expenses, and settlements in this group.`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/groups/${group.id}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Failed to delete group.");
      }

      const groupsResponse = await fetch(`${API_URL}/groups`);
      const groupsJson = await groupsResponse.json();
      const remainingGroups = groupsJson.data as Group[];

      setGroups(remainingGroups);

      if (remainingGroups.length > 0) {
        setActiveGroupID(remainingGroups[0].id);
      } else {
        setGroup(null);
        setMembers([]);
        setExpenses([]);
        setBalanceData(null);
        setSettlementHistory([]);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete group.");
    }
  }

  async function deleteMember(memberID: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this member?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/members/${memberID}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Failed to delete member. This member may already be used in expenses or settlements.",
        );
      }

      await fetchData();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete member.",
      );
    }
  }

  async function deleteExpense(expenseID: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/expenses/${expenseID}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Failed to delete expense.");
      }

      await fetchData();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete expense.",
      );
    }
  }

  async function markAsSettled(settlement: SettlementSuggestion) {
    const key = `${settlement.from_member_id}-${settlement.to_member_id}-${settlement.amount}`;

    try {
      setSettlingKey(key);

      const response = await fetch(
        `${API_URL}/groups/${activeGroupID}/settlements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from_member_id: settlement.from_member_id,
            to_member_id: settlement.to_member_id,
            amount: settlement.amount,
          }),
        },
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.message || "Failed to mark settlement as settled.",
        );
      }

      await fetchData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to mark settlement as settled.",
      );
    } finally {
      setSettlingKey("");
    }
  }

  useEffect(() => {
    fetchData();
  }, [activeGroupID]);

  const filteredExpenses = useMemo(() => {
    const keyword = expenseSearch.toLowerCase().trim();

    if (!keyword) return expenses;

    return expenses.filter((expense) => {
      const titleMatch = expense.title.toLowerCase().includes(keyword);
      const payerMatch = expense.paid_by_name.toLowerCase().includes(keyword);
      const noteMatch = expense.notes?.toLowerCase().includes(keyword) ?? false;

      return titleMatch || payerMatch || noteMatch;
    });
  }, [expenses, expenseSearch]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();

    expenses.forEach((expense) => {
      const currentTotal = breakdown.get(expense.category) ?? 0;
      breakdown.set(expense.category, currentTotal + expense.amount);
    });

    return Array.from(breakdown.entries())
      .map(([category, total]) => ({
        category,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const totalExpense = useMemo(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const totalOwed = useMemo(() => {
    if (!balanceData) return 0;
    return balanceData.balances
      .filter((balance) => balance.balance > 0)
      .reduce((total, balance) => total + balance.balance, 0);
  }, [balanceData]);

  const totalDebt = useMemo(() => {
    if (!balanceData) return 0;
    return Math.abs(
      balanceData.balances
        .filter((balance) => balance.balance < 0)
        .reduce((total, balance) => total + balance.balance, 0),
    );
  }, [balanceData]);

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <Sidebar />
      <MobileTopbar />

      <main className="lg:ml-72">
        <section className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-8">
          <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-white bg-white/70 p-5 shadow-sm shadow-slate-200/70 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-emerald-600">
                Shared Expense Manager
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {group?.name ?? "SplitNest Dashboard"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {group?.description ??
                  "Track shared bills, split costs fairly, and settle balances transparently."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center">
              <select
                value={activeGroupID}
                onChange={(event) =>
                  setActiveGroupID(Number(event.target.value))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-400"
              >
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsAddGroupOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={18} />
                New Group
              </button>

              <button
                onClick={() => {
                  if (!group) return;
                  setEditingGroup(group);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={18} />
                Edit Group
              </button>

              <button
                onClick={deleteGroup}
                disabled={!group}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={18} />
                Delete Group
              </button>

              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Users size={18} />
                Add Member
              </button>

              <button
                onClick={() => {
                  if (members.length === 0) {
                    alert("Tambahkan member dulu sebelum membuat expense.");
                    return;
                  }

                  setIsAddExpenseOpen(true);
                }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg transition ${
                  members.length === 0
                    ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                    : "bg-slate-950 text-white shadow-slate-900/10 hover:-translate-y-0.5 hover:bg-slate-800"
                }`}
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>
          </header>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-semibold text-slate-500">
              Loading SplitNest data...
            </div>
          ) : (
            <>
              <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Total Expense"
                  value={formatRupiah(totalExpense)}
                  description="Semua pengeluaran group"
                  icon={CreditCard}
                  tone="blue"
                />
                <StatCard
                  title="Members"
                  value={String(members.length)}
                  description={
                    members.length > 0
                      ? members.map((member) => member.name).join(", ")
                      : "No members yet"
                  }
                  icon={Users}
                  tone="purple"
                />
                <StatCard
                  title="Total Receivable"
                  value={formatRupiah(totalOwed)}
                  description="Total uang yang harus diterima"
                  icon={BarChart3}
                  tone="green"
                />
                <StatCard
                  title="Total Debt"
                  value={formatRupiah(totalDebt)}
                  description="Total utang yang perlu diselesaikan"
                  icon={Scale}
                  tone="red"
                />
              </div>

              {members.length === 0 && (
                <div className="mb-8 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-700">
                        Group setup
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">
                        Add your first member
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Group ini belum punya member. Tambahkan anggota dulu
                        supaya bisa membuat expense dan menghitung split bill.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddMemberOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                    >
                      <Users size={18} />
                      Add First Member
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      Members
                    </h3>
                    <p className="text-sm text-slate-500">
                      Anggota group aktif
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAddMemberOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
                  >
                    <Users size={18} />
                    Add Member
                  </button>
                </div>

                {members.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                    <p className="font-bold text-slate-700">No members yet.</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Tambahkan member pertama untuk mulai membuat expense.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-4"
                      >
                        <div>
                          <p className="font-black text-slate-950">
                            {member.name}
                          </p>
                          <p className="text-sm font-semibold text-slate-500">
                            {member.email ?? "No email"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingMember(member)}
                            className="rounded-xl bg-sky-50 p-2 text-sky-500 transition hover:bg-sky-100"
                            title="Edit member"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => deleteMember(member.id)}
                            className="rounded-xl bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100"
                            title="Delete member"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-950">
                        Expenses
                      </h3>
                      <p className="text-sm text-slate-500">
                        Daftar pengeluaran group
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        value={expenseSearch}
                        onChange={(event) =>
                          setExpenseSearch(event.target.value)
                        }
                        placeholder="Search expense..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white sm:w-56"
                      />

                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
                        Equal Split
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredExpenses.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
                          <ReceiptText size={24} />
                        </div>

                        <p className="text-lg font-black text-slate-800">
                          No expenses yet
                        </p>

                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                          Tambahkan pengeluaran pertama untuk mulai menghitung
                          split bill dan balance group ini.
                        </p>

                        <button
                          onClick={() => {
                            if (members.length === 0) {
                              alert(
                                "Tambahkan member dulu sebelum membuat expense.",
                              );
                              return;
                            }

                            setIsAddExpenseOpen(true);
                          }}
                          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
                        >
                          <Plus size={18} />
                          Add First Expense
                        </button>
                      </div>
                    ) : (
                      filteredExpenses.map((expense) => (
                        <article
                          key={expense.id}
                          className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black text-slate-950">
                                  {expense.title}
                                </h4>

                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
                                  {expense.category}
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                Paid by{" "}
                                <span className="font-bold text-slate-700">
                                  {expense.paid_by_name}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-xl font-black text-slate-950">
                                {formatRupiah(expense.amount)}
                              </p>

                              <button
                                onClick={() => setEditingExpense(expense)}
                                className="rounded-xl bg-sky-50 p-2 text-sky-500 transition hover:bg-sky-100"
                                title="Edit expense"
                              >
                                <Pencil size={17} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-3">
                            {expense.participants.map((participant) => (
                              <div
                                key={participant.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <p className="text-sm font-bold text-slate-900">
                                  {participant.member_name}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                  {formatRupiah(participant.share_amount)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
                    <div className="mb-4">
                      <h3 className="text-xl font-black text-slate-950">
                        Category Breakdown
                      </h3>
                      <p className="text-sm text-slate-500">
                        Total pengeluaran berdasarkan kategori.
                      </p>
                    </div>

                    {categoryBreakdown.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center">
                        <p className="text-sm font-bold text-slate-500">
                          Belum ada data kategori.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {categoryBreakdown.map((item) => (
                          <div
                            key={item.category}
                            className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-black text-slate-950">
                                  {item.category}
                                </p>
                                <p className="text-sm text-slate-500">
                                  Expense category
                                </p>
                              </div>

                              <p className="font-black text-slate-950">
                                {formatRupiah(item.total)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
                    <div className="mb-5">
                      <h3 className="text-xl font-black text-slate-950">
                        Balance & Settlement
                      </h3>
                      <p className="text-sm text-slate-500">
                        Siapa yang harus bayar dan siapa yang menerima.
                      </p>
                    </div>

                    <div className="mb-5 space-y-3">
                      {balanceData?.balances.map((balance) => (
                        <div
                          key={balance.member_id}
                          className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-black text-slate-950">
                                {balance.member_name}
                              </p>
                              <p className="text-sm text-slate-500">
                                Paid {formatRupiah(balance.paid)} · Share{" "}
                                {formatRupiah(balance.share)}
                              </p>
                            </div>
                            <p
                              className={`text-right text-base font-black ${
                                balance.balance > 0
                                  ? "text-emerald-600"
                                  : balance.balance < 0
                                    ? "text-rose-600"
                                    : "text-slate-500"
                              }`}
                            >
                              {formatRupiah(balance.balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3xl bg-slate-950 p-5 text-white">
                      <p className="mb-4 text-sm font-bold text-slate-300">
                        Settlement Suggestions
                      </p>

                      <div className="space-y-3">
                        {balanceData?.settlements.length === 0 ? (
                          <p className="text-sm text-slate-300">
                            Semua balance sudah impas.
                          </p>
                        ) : (
                          balanceData?.settlements.map((settlement) => {
                            const key = `${settlement.from_member_id}-${settlement.to_member_id}-${settlement.amount}`;
                            const isSettling = settlingKey === key;

                            return (
                              <div
                                key={key}
                                className="rounded-2xl bg-white/10 p-4"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="font-bold">
                                      {settlement.from_member_name} →{" "}
                                      {settlement.to_member_name}
                                    </p>
                                    <p className="text-xs text-slate-300">
                                      Recommended settlement
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <p className="font-black text-emerald-300">
                                      {formatRupiah(settlement.amount)}
                                    </p>

                                    <button
                                      onClick={() => markAsSettled(settlement)}
                                      disabled={isSettling}
                                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <CheckCircle2 size={15} />
                                      {isSettling
                                        ? "Saving..."
                                        : "Mark as Settled"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
                    <div className="mb-4">
                      <h3 className="text-xl font-black text-slate-950">
                        Settlement History
                      </h3>
                      <p className="text-sm text-slate-500">
                        Pembayaran yang sudah dicatat lunas.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {settlementHistory.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center">
                          <p className="text-sm font-bold text-slate-500">
                            Belum ada settlement.
                          </p>
                        </div>
                      ) : (
                        settlementHistory.map((settlement) => (
                          <div
                            key={settlement.id}
                            className="flex items-center justify-between gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4"
                          >
                            <div>
                              <p className="font-black text-slate-950">
                                {settlement.from_member_name} →{" "}
                                {settlement.to_member_name}
                              </p>
                              <p className="text-xs font-semibold text-emerald-700">
                                Status: {settlement.status}
                              </p>
                            </div>
                            <p className="font-black text-emerald-700">
                              {formatRupiah(settlement.amount)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </main>

      <AddExpenseModal
        activeGroupID={activeGroupID}
        members={members}
        isOpen={isAddExpenseOpen || editingExpense !== null}
        editingExpense={editingExpense}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        onCreated={fetchData}
      />

      <AddGroupModal
        isOpen={isAddGroupOpen || editingGroup !== null}
        editingGroup={editingGroup}
        onClose={() => {
          setIsAddGroupOpen(false);
          setEditingGroup(null);
        }}
        onCreated={async (groupID) => {
          setActiveGroupID(groupID);
          await fetchData();
        }}
      />

      <AddMemberModal
        activeGroupID={activeGroupID}
        isOpen={isAddMemberOpen || editingMember !== null}
        editingMember={editingMember}
        onClose={() => {
          setIsAddMemberOpen(false);
          setEditingMember(null);
        }}
        onCreated={fetchData}
      />
    </div>
  );
}

export default App;
