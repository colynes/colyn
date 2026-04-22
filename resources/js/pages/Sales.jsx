import React, { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import AutoDismissAlert from '@/components/ui/AutoDismissAlert';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, DollarSign, Goal, ShoppingCart, Target, X } from 'lucide-react';

const money = (value) => `Tzs ${new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(value || 0)}`;
const categoryColors = ['#4d3218', '#d1af77', '#c29b61', '#9e7e4d', '#dfc193'];

function ChartTooltip({ active, payload, label, formatter = money }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#eadcca] bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b6a46]">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-[#5b3a1d]">{entry.name}</span>
            <span className="font-bold text-[#2f2419]">{formatter(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, hint }) {
  return (
    <Card className="rounded-[1.75rem] border border-[#e8dcca] bg-white shadow-none">
      <CardContent className="space-y-6 p-7">
        <div className="icon-surface bg-[#f1ece6] text-[#4d3218]">
          <Icon className="h-8 w-8" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[2.1rem] font-semibold tracking-[-0.03em] text-[#352314]">{value}</p>
          <p className="mt-2 text-[1.05rem] text-[#6b513a]">{label}</p>
          {hint ? <p className="mt-2 text-sm text-[#866748]">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

const targetTypeOptions = [
  { value: 'daily', label: 'Daily Target' },
  { value: 'weekly', label: 'Weekly Target' },
  { value: 'monthly', label: 'Monthly Target' },
];

function buildDefaultTarget(filters = {}) {
  const referenceDate = filters.focus_date || filters.start_date || new Date().toISOString().slice(0, 10);
  const monthKey = filters.month || referenceDate.slice(0, 7);
  const rangeStart = filters.start_date || referenceDate;
  const rangeEnd = filters.end_date || referenceDate;

  if (filters.period === 'daily') {
    return {
      id: null,
      target_type: 'daily',
      target_amount: '',
      target_date: referenceDate,
      week_start: '',
      week_end: '',
      month_key: monthKey,
      notes: '',
    };
  }

  if (filters.period === 'monthly') {
    return {
      id: null,
      target_type: 'monthly',
      target_amount: '',
      target_date: '',
      week_start: '',
      week_end: '',
      month_key: monthKey,
      notes: '',
    };
  }

  return {
    id: null,
    target_type: 'weekly',
    target_amount: '',
    target_date: '',
    week_start: rangeStart,
    week_end: rangeEnd,
    month_key: monthKey,
    notes: '',
  };
}

function normalizeTargetForForm(target, filters = {}) {
  const fallback = buildDefaultTarget(filters);

  return {
    ...fallback,
    ...(target || {}),
    id: target?.id || null,
    target_amount: target?.target_amount !== undefined && target?.target_amount !== null ? String(target.target_amount) : fallback.target_amount,
    target_date: target?.target_date || fallback.target_date,
    week_start: target?.week_start || fallback.week_start,
    week_end: target?.week_end || fallback.week_end,
    month_key: target?.month_key || fallback.month_key,
    notes: target?.notes || '',
  };
}

function normalizeErrorBag(errorBag = {}) {
  return Object.entries(errorBag).reduce((carry, [key, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    const normalizedKey = key.replace(/^target\./, '');

    if (normalizedKey === 'target' || normalizedKey === 'targets') {
      carry.form = message;
      return carry;
    }

    carry[normalizedKey] = message;
    return carry;
  }, {});
}

function targetScopeLabel(target) {
  if (target.scope_label) {
    return target.scope_label;
  }

  if (target.target_type === 'daily') {
    return target.target_date || '-';
  }

  if (target.target_type === 'weekly') {
    return [target.week_start, target.week_end].filter(Boolean).join(' to ') || '-';
  }

  return target.month_key || '-';
}

function formatUpdatedAt(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-red-600">{message}</p>;
}

function TargetModal({ open, mode, filters, initialTarget, onClose, onSubmit, processing, errors = {} }) {
  const [formData, setFormData] = useState(() => normalizeTargetForForm(initialTarget, filters));

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(normalizeTargetForForm(initialTarget, filters));
  }, [open, initialTarget, filters]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setFormData((current) => {
      if (field !== 'target_type') {
        return {
          ...current,
          [field]: value,
        };
      }

      const fallback = normalizeTargetForForm({ target_type: value }, filters);

      return {
        ...current,
        target_type: value,
        target_date: value === 'daily' ? (current.target_date || fallback.target_date) : '',
        week_start: value === 'weekly' ? (current.week_start || fallback.week_start) : '',
        week_end: value === 'weekly' ? (current.week_end || fallback.week_end) : '',
        month_key: value === 'monthly' ? (current.month_key || fallback.month_key) : fallback.month_key,
      };
    });
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      id: formData.id,
      target_type: formData.target_type,
      target_amount: formData.target_amount,
      target_date: formData.target_date,
      week_start: formData.week_start,
      week_end: formData.week_end,
      month_key: formData.month_key,
      notes: formData.notes,
    });
  };

  const title = mode === 'edit' ? 'Edit Sales Target' : 'Create Sales Target';
  const description = mode === 'edit'
    ? 'Update a saved target. Changes are written directly to the database and reporting refreshes immediately.'
    : 'Create a daily, weekly, or monthly target. Saved targets leave this form and move into reporting automatically.';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcca] px-6 py-5">
          <div>
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#3a2513]">{title}</h2>
            <p className="mt-1 text-base text-[#76593d]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close target modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto px-6 py-6">
          <div className="rounded-2xl border border-[#eadcca] bg-[#fbf7f1] p-5">
            {errors.form ? <FieldError message={errors.form} /> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f3118]">Type</label>
                <select
                  value={formData.target_type}
                  onChange={(event) => updateField('target_type', event.target.value)}
                  className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                >
                  {targetTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <FieldError message={errors.target_type} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f3118]">Target Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(event) => updateField('target_amount', event.target.value)}
                  placeholder="Enter TZS amount"
                  className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                />
                <FieldError message={errors.target_amount} />
              </div>

              {formData.target_type === 'daily' ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#4f3118]">Target Date</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(event) => updateField('target_date', event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                  />
                  <FieldError message={errors.target_date} />
                </div>
              ) : null}

              {formData.target_type === 'weekly' ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4f3118]">Week Start</label>
                    <input
                      type="date"
                      value={formData.week_start}
                      onChange={(event) => updateField('week_start', event.target.value)}
                      className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                    />
                    <FieldError message={errors.week_start} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4f3118]">Week End</label>
                    <input
                      type="date"
                      value={formData.week_end}
                      onChange={(event) => updateField('week_end', event.target.value)}
                      className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                    />
                    <FieldError message={errors.week_end} />
                  </div>
                </>
              ) : null}

              {formData.target_type === 'monthly' ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#4f3118]">Month</label>
                  <input
                    type="month"
                    value={formData.month_key}
                    onChange={(event) => updateField('month_key', event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                  />
                  <FieldError message={errors.month_key} />
                </div>
              ) : null}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[#4f3118]">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder="Any context for this target"
                  className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-4 text-sm outline-none"
                />
                <FieldError message={errors.notes} />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#d9c4a9] py-3 text-sm font-semibold text-[#4f3118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 rounded-2xl bg-[#4f3118] py-3 text-sm font-semibold text-white"
            >
              {processing ? 'Saving...' : (mode === 'edit' ? 'Save Changes' : 'Save Target')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OverwriteDialog({ open, conflict, onCancel, onApprove, processing }) {
  if (!open || !conflict) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-lg rounded-[1.6rem] bg-white p-6 shadow-2xl">
        <h3 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Overwrite Existing Target?</h3>
        <p className="mt-3 text-sm leading-6 text-[#76593d]">
          A target already exists for this date or period. Approving will overwrite the saved target below with your new values.
        </p>

        <div className="mt-5 rounded-2xl border border-[#eadcca] bg-[#fbf7f1] p-4 text-sm text-[#4f3118]">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">{conflict.source_label}</span>
            <span className="font-semibold">{money(conflict.target_amount)}</span>
          </div>
          <p className="mt-2">Scope: {targetScopeLabel(conflict)}</p>
          <p className="mt-1">Notes: {conflict.notes || '-'}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-red-600 bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={processing}
            className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {processing ? 'Saving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sales({
  auth,
  metrics = {},
  targetActualTrend = [],
  categorySales = [],
  filters = {},
  productPerformance = [],
  topProducts = [],
  targets = [],
  weeklySummary = [],
  monthlySummary = [],
  performanceSummary = {},
}) {
  const { flash } = usePage().props;
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [activeTarget, setActiveTarget] = useState(null);
  const [period, setPeriod] = useState(filters.period || 'weekly');
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetErrors, setTargetErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [overwriteState, setOverwriteState] = useState({ open: false, conflict: null, payload: null });

  useEffect(() => {
    setPeriod(filters.period || 'weekly');
  }, [filters.period]);

  const activeNotice = notice || (flash?.error
    ? { type: 'error', text: flash.error }
    : (flash?.success ? { type: 'success', text: flash.success } : null));

  const targetRows = useMemo(
    () => targets.map((target) => ({
      ...target,
      range_label: targetScopeLabel(target),
      updated_label: formatUpdatedAt(target.updated_at),
    })),
    [targets],
  );

  const closeTargetModal = () => {
    if (savingTarget) {
      return;
    }

    setTargetsOpen(false);
    setEditorMode('create');
    setActiveTarget(null);
    setTargetErrors({});
  };

  const openCreateModal = () => {
    setNotice(null);
    setEditorMode('create');
    setActiveTarget(null);
    setTargetErrors({});
    setTargetsOpen(true);
  };

  const openEditModal = (target) => {
    setNotice(null);
    setEditorMode('edit');
    setActiveTarget(target);
    setTargetErrors({});
    setTargetsOpen(true);
  };

  const refreshAnalytics = () => {
    router.reload({
      only: ['metrics', 'targetActualTrend', 'targets', 'weeklySummary', 'monthlySummary', 'performanceSummary', 'topProducts', 'productPerformance'],
      preserveScroll: true,
      preserveState: true,
    });
  };

  const persistTarget = async (payload, overwrite = false) => {
    setSavingTarget(true);
    setTargetErrors({});

    try {
      const response = await window.axios.post('/sales/targets', {
        target: payload,
        overwrite,
      }, {
        headers: {
          Accept: 'application/json',
        },
        validateStatus: () => true,
      });

      const { status, data = {} } = response;

      if (status === 409) {
        setOverwriteState({
          open: true,
          conflict: data.conflict || null,
          payload,
        });
        return;
      }

      if (status === 422) {
        setTargetErrors(normalizeErrorBag(data.errors || {}));
        setNotice({ type: 'error', text: data.message || 'Please correct the highlighted fields and try again.' });
        return;
      }

      if (status < 200 || status >= 300) {
        setNotice({ type: 'error', text: data.message || 'We could not save the target right now.' });
        return;
      }

      setNotice({ type: 'success', text: data.message || 'Sales target saved successfully.' });
      setOverwriteState({ open: false, conflict: null, payload: null });
      setTargetsOpen(false);
      setEditorMode('create');
      setActiveTarget(null);
      refreshAnalytics();
    } catch (error) {
      setNotice({ type: 'error', text: 'We could not save the target right now. Please try again.' });
    } finally {
      setSavingTarget(false);
    }
  };

  const handleTargetSubmit = (payload) => {
    persistTarget(payload, false);
  };

  const handleOverwriteApprove = () => {
    if (!overwriteState.payload) {
      return;
    }

    persistTarget(overwriteState.payload, true);
  };

  const handleOverwriteCancel = () => {
    if (savingTarget) {
      return;
    }

    setOverwriteState({ open: false, conflict: null, payload: null });
  };

  return (
    <AppLayout user={auth?.user}>
      <TargetModal
        open={targetsOpen}
        mode={editorMode}
        filters={filters}
        initialTarget={activeTarget}
        onClose={closeTargetModal}
        onSubmit={handleTargetSubmit}
        processing={savingTarget}
        errors={targetErrors}
      />

      <OverwriteDialog
        open={overwriteState.open}
        conflict={overwriteState.conflict}
        onCancel={handleOverwriteCancel}
        onApprove={handleOverwriteApprove}
        processing={savingTarget}
      />

      <div className="space-y-8">
        <AutoDismissAlert message={activeNotice?.text} type={activeNotice?.type || 'success'} className="rounded-[1.35rem]" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Sales Analytics</h1>
            <p className="mt-2 text-[1.05rem] text-[#73563a]">Daily-resolved target vs actual performance dashboard</p>
          </div>

          <form method="get" action="/sales" className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-3 rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white"
            >
              <Goal className="h-5 w-5" />
              Create Target
            </button>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f4328]">View</label>
              <select
                name="period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="h-13 rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {(period === 'daily' || period === 'weekly') ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5f4328]">Reference Date</label>
                <input
                  type="date"
                  name="focus_date"
                  defaultValue={filters.focus_date || ''}
                  className="h-13 rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none"
                />
              </div>
            ) : null}

            {period === 'monthly' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5f4328]">Month</label>
                <input
                  type="month"
                  name="month"
                  defaultValue={filters.month || ''}
                  className="h-13 rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none"
                />
              </div>
            ) : null}

            {period === 'custom' ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5f4328]">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={filters.start_date || ''}
                    className="h-13 rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5f4328]">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={filters.end_date || ''}
                    className="h-13 rounded-[1.05rem] border border-[#dcccba] bg-white px-4 text-[1rem] text-[#3a2513] outline-none"
                  />
                </div>
              </>
            ) : null}

            <button
              type="submit"
              className="rounded-[1.05rem] border border-[#dcccba] bg-white px-5 py-3 text-[1rem] font-semibold text-[#4f3118]"
            >
              Apply
            </button>
          </form>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Target} value={money(metrics.total_target || 0)} label="Total Target" hint={`${performanceSummary.days_without_target || 0} day(s) without target`} />
          <StatCard icon={DollarSign} value={money(metrics.gross_revenue || 0)} label="Total Actual Sales" hint={`${new Intl.NumberFormat('en-TZ').format(metrics.total_orders || 0)} valid orders`} />
          <StatCard icon={ArrowUpRight} value={money(metrics.variance || 0)} label="Variance" hint={metrics.variance >= 0 ? 'Above target' : 'Below target'} />
          <StatCard icon={ShoppingCart} value={`${Number(metrics.achievement_percentage || 0).toFixed(1)}%`} label="Achievement" hint={`${performanceSummary.days_above_target || 0} day(s) above target`} />
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Target vs Actual by Date</h2>
              <p className="mt-2 text-sm text-[#7a5c3e]">Each date resolves its own target value using daily, then weekly, then monthly priority.</p>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={targetActualTrend} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" />
                    <XAxis dataKey="day" tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <YAxis tick={{ fill: '#74563a', fontSize: 15 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="target" name="Target" stroke="#c5a06a" strokeWidth={3} strokeDasharray="6 6" dot={{ fill: '#c5a06a', strokeWidth: 0, r: 4 }} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="#4b311d" strokeWidth={4} dot={{ fill: '#4b311d', strokeWidth: 0, r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Weekly Rollup</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklySummary} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#efe3d4" strokeDasharray="3 5" />
                    <XAxis dataKey="label" tick={{ fill: '#74563a', fontSize: 12 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <YAxis tick={{ fill: '#74563a', fontSize: 12 }} axisLine={{ stroke: '#9d7d5f' }} tickLine={{ stroke: '#9d7d5f' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="target" name="Target" fill="#c29b61" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#4b311d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Sales by Category</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="55%"
                      innerRadius={0}
                      outerRadius={120}
                      paddingAngle={1}
                      label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={entry.name} fill={categoryColors[index % categoryColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={money} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
            <CardContent className="p-7">
              <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Monthly Rollup</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-[#ede1cf]">
                    <tr>
                      {['Month', 'Target', 'Actual', 'Variance', 'Achievement'].map((header) => (
                        <th key={header} className="px-5 py-4 text-sm font-semibold text-[#2f2115]">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.length > 0 ? monthlySummary.map((row, index) => (
                      <tr key={`${row.period_start}-${row.period_end}`} className={index !== monthlySummary.length - 1 ? 'border-b border-[#eadcca]' : ''}>
                        <td className="px-5 py-4 text-sm font-medium text-[#352314]">{row.label}</td>
                        <td className="px-5 py-4 text-sm text-[#5f4328]">{money(row.target)}</td>
                        <td className="px-5 py-4 text-sm text-[#5f4328]">{money(row.actual)}</td>
                        <td className={`px-5 py-4 text-sm font-medium ${row.variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(row.variance)}</td>
                        <td className="px-5 py-4 text-sm text-[#5f4328]">{Number(row.achievement_percentage || 0).toFixed(1)}%</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-7 text-sm text-[#7a5c3e]">No monthly summary for this selection.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 px-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Configured Targets In Period</h2>
                <p className="mt-1 text-sm text-[#7a5c3e]">Saved targets come from the database and can be edited without reopening draft rows.</p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center rounded-[1rem] border border-[#d8c4aa] bg-white px-4 py-2.5 text-sm font-semibold text-[#4f3118]"
              >
                New Target
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Type', 'Period', 'Amount', 'Notes', 'Last Updated', 'Action'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {targetRows.length > 0 ? targetRows.map((target, index) => (
                    <tr key={target.id || `${target.target_type}-${index}`} className={index !== targetRows.length - 1 ? 'border-b border-[#eadcca]' : ''}>
                      <td className="px-8 py-6 text-[1rem] font-medium text-[#352314]">{target.source_label}</td>
                      <td className="px-8 py-6 text-[1rem] text-[#5f4328]">{target.range_label}</td>
                      <td className="px-8 py-6 text-[1rem] text-[#5f4328]">{money(target.target_amount)}</td>
                      <td className="px-8 py-6 text-[1rem] text-[#5f4328]">{target.notes || '-'}</td>
                      <td className="px-8 py-6 text-[1rem] text-[#5f4328]">{target.updated_label}</td>
                      <td className="px-8 py-6 text-[1rem] text-[#5f4328]">
                        <button
                          type="button"
                          onClick={() => openEditModal(target)}
                          className="inline-flex rounded-full border border-[#d8c4aa] px-4 py-2 text-sm font-semibold text-[#4f3118] transition hover:bg-[#fbf7f1]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-8 text-center text-[1rem] text-[#7a5c3e]">No targets found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-[#eadcca] bg-white shadow-none">
          <CardContent className="p-5">
            <h2 className="px-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Top Products</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['Product', 'Units Sold', 'Revenue', 'Target Share', 'Performance'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => {
                    const positive = product.performance >= 100;

                    return (
                      <tr key={product.id || product.name} className={index !== topProducts.length - 1 ? 'border-b border-[#eadcca]' : ''}>
                        <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{product.name}</td>
                        <td className="px-8 py-7 text-[1.05rem] text-[#352314]">{new Intl.NumberFormat('en-TZ').format(product.units_sold || 0)}</td>
                        <td className="px-8 py-7 text-[1.05rem] font-medium text-[#352314]">{money(product.revenue)}</td>
                        <td className="px-8 py-7 text-[1.05rem] text-[#5f4328]">{money(product.target)}</td>
                        <td className="px-8 py-7">
                          <span className={`inline-flex rounded-full px-4 py-2 text-[0.95rem] font-medium ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {Number(product.performance || 0).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}









