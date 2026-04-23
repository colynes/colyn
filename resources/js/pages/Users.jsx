import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Card, CardContent } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Eye, EyeOff, Lock, Pencil, Plus, Search, Shield, Trash2, X } from 'lucide-react';

const roleTone = {
  administrator: 'bg-rose-100 text-rose-600',
  admin: 'bg-rose-100 text-rose-600',
  manager: 'bg-blue-100 text-blue-600',
  staff: 'bg-emerald-100 text-emerald-700',
};

const statusTone = {
  'Logged in': 'bg-emerald-100 text-emerald-700',
  Active: 'bg-slate-100 text-slate-700',
};

const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const TIME_MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'));

function splitTime(value, fallback) {
  const source = /^\d{2}:\d{2}$/.test(String(value || '')) ? String(value) : fallback;

  return source.split(':');
}

function TimeSelectField({ label, value, fallback, onChange, error }) {
  const [hour, minute] = splitTime(value, fallback);

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#3a2513]">{label}</label>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <select
          value={hour}
          onChange={(event) => onChange(`${event.target.value}:${minute}`)}
          className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-3 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
        >
          {TIME_HOURS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <span className="text-[1.1rem] font-semibold text-[#73563a]">:</span>
        <select
          value={minute}
          onChange={(event) => onChange(`${hour}:${event.target.value}`)}
          className="h-12 w-full rounded-xl border border-[#dcccba] bg-white px-3 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
        >
          {TIME_MINUTES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function UserModal({ user, roles, onClose }) {
  const isEditing = Boolean(user?.id);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || roles[0]?.name || '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    form.setData({
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || roles[0]?.name || '',
      password: '',
      password_confirmation: '',
    });
    form.clearErrors();
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [user, roles]);

  if (!user) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();

    const options = {
      preserveScroll: true,
      onSuccess: () => onClose(),
    };

    if (isEditing) {
      form.transform((data) => ({
        name: data.name,
        email: data.email,
        role: data.role,
      })).put(`/users/${user.id}`, options);
      return;
    }

    form.post('/users', options);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-7 py-6">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">
              {isEditing ? 'Edit Staff Member' : 'Add New Staff'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close user modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-7 pb-7">
          {Object.keys(form.errors).length > 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {form.errors.email || form.errors.name || form.errors.role || form.errors.password || 'We could not save this staff member. Please review the form and try again.'}
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Full Name</label>
            <input
              type="text"
              value={form.data.name}
              onChange={(e) => form.setData('name', e.target.value)}
              placeholder="Enter full name"
              required
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
            />
            {form.errors.name ? <p className="mt-2 text-xs text-red-500">{form.errors.name}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Email Address</label>
            <input
              type="email"
              value={form.data.email}
              onChange={(e) => form.setData('email', e.target.value)}
              placeholder="user@amanibrew.com"
              required
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
            />
            {form.errors.email ? <p className="mt-2 text-xs text-red-500">{form.errors.email}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Role</label>
            <select
              value={form.data.role}
              onChange={(e) => form.setData('role', e.target.value)}
              required
              className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
            {form.errors.role ? <p className="mt-2 text-xs text-red-500">{form.errors.role}</p> : null}
          </div>

          {!isEditing ? (
            <>
              <div>
                <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.data.password}
                    onChange={(e) => form.setData('password', e.target.value)}
                    placeholder="Enter password"
                    className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 pr-14 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7b5d3d] transition hover:text-[#4f3118]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {form.errors.password ? <p className="mt-2 text-xs text-red-500">{form.errors.password}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.data.password_confirmation}
                    onChange={(e) => form.setData('password_confirmation', e.target.value)}
                    placeholder="Confirm password"
                    className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 pr-14 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7b5d3d] transition hover:text-[#4f3118]"
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <div className="grid gap-3 pt-1 md:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-xl border border-[#d9c4a9] bg-white text-[1rem] font-semibold text-[#4f3118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={form.processing}
              className="h-14 rounded-xl bg-[#4f3118] text-[1rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              {form.processing ? 'Saving...' : isEditing ? 'Save Staff' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({ user, onClose }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm({
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    form.reset('password', 'password_confirmation');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [user]);

  if (!user) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();
    form.post(`/users/${user.id}/reset-password`, {
      preserveScroll: true,
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <div className="my-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-7 py-6">
          <div>
            <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#3a2513]">Reset Password</h2>
            <p className="mt-1 text-[0.95rem] text-[#76593d]">{user.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6d5036] transition hover:bg-[#f3ede5]"
            aria-label="Close password modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-7 pb-7">
          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.data.password}
                onChange={(e) => form.setData('password', e.target.value)}
                placeholder="Enter password"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 pr-14 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7b5d3d] transition hover:text-[#4f3118]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {form.errors.password ? <p className="mt-2 text-xs text-red-500">{form.errors.password}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1rem] font-semibold text-[#3a2513]">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.data.password_confirmation}
                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                placeholder="Confirm password"
                className="h-14 w-full rounded-xl border border-[#dcccba] bg-white px-5 pr-14 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7b5d3d] transition hover:text-[#4f3118]"
                aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="grid gap-3 pt-1 md:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-xl border border-[#d9c4a9] bg-white text-[1rem] font-semibold text-[#4f3118]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={form.processing}
              className="h-14 rounded-xl bg-[#4f3118] text-[1rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              {form.processing ? 'Saving...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users({ auth, users, roles = [], filters = {}, pickupHours }) {
  const rows = users?.data || [];
  const [activeUser, setActiveUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const pickupHoursForm = useForm({
    pickup_open_time: pickupHours?.open_time || '08:00',
    pickup_close_time: pickupHours?.close_time || '20:00',
  });

  const hasFilters = useMemo(
    () => Boolean((filters.search || '').trim() || (filters.role || '').trim()),
    [filters.search, filters.role],
  );

  const deleteUser = (user) => {
    router.delete(`/users/${user.id}`, {
      preserveScroll: true,
    });
  };

  const submitPickupHours = (event) => {
    event.preventDefault();
    pickupHoursForm.put('/users/pickup-hours', {
      preserveScroll: true,
    });
  };

  return (
    <AppLayout user={auth?.user}>
      <UserModal user={activeUser} roles={roles} onClose={() => setActiveUser(null)} />
      <PasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
      <ConfirmModal
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => deletingUser ? deleteUser(deletingUser) : null}
        title="Delete Staff Member"
        message={deletingUser ? `You are deleting staff member ${deletingUser.name}. This action cannot be undone.` : ''}
        confirmText="Delete"
        type="danger"
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Staff Management</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">Manage staff accounts and access permissions</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <LanguageSwitcher className="self-start" />

            <button
              type="button"
              onClick={() => setActiveUser({})}
              className="inline-flex items-center gap-3 self-start rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1.05rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              <Plus className="h-5 w-5" strokeWidth={2.25} />
              Add Staff
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-6">
              <div className="icon-surface-sm bg-[#f3ecdf] text-[#4f3118]">
                <Shield className="h-7 w-7" />
              </div>
              <p className="mt-5 text-[2.2rem] font-black text-[#352314]">{rows.length}</p>
              <p className="mt-1 text-[1rem] text-[#73563a]">Backoffice Accounts</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-6">
              <div className="icon-surface-sm bg-[#eef5e9] text-emerald-700">
                <Shield className="h-7 w-7" />
              </div>
              <p className="mt-5 text-[2.2rem] font-black text-[#352314]">
                {rows.filter((user) => ['administrator', 'admin'].includes(String(user.role || '').toLowerCase())).length}
              </p>
              <p className="mt-1 text-[1rem] text-[#73563a]">Administrators</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
            <CardContent className="p-6">
              <div className="icon-surface-sm bg-[#eef5e9] text-emerald-700">
                <Shield className="h-7 w-7" />
              </div>
              <p className="mt-5 text-[2.2rem] font-black text-[#352314]">
                {rows.filter((user) => ['staff', 'manager'].includes(String(user.role || '').toLowerCase())).length}
              </p>
              <p className="mt-1 text-[1rem] text-[#73563a]">Staff Members</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.4rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[1.45rem] font-semibold text-[#3a2513]">Pickup Working Hours</h2>
                <p className="mt-1 text-[0.95rem] text-[#73563a]">
                  Customers choosing pickup can only select times from the current time up to this closing hour.
                </p>
              </div>

              <form onSubmit={submitPickupHours} className="grid gap-3 sm:grid-cols-3">
                <TimeSelectField
                  label="Opening Time"
                  value={pickupHoursForm.data.pickup_open_time}
                  fallback="08:00"
                  onChange={(value) => pickupHoursForm.setData('pickup_open_time', value)}
                  error={pickupHoursForm.errors.pickup_open_time}
                />

                <TimeSelectField
                  label="Closing Time"
                  value={pickupHoursForm.data.pickup_close_time}
                  fallback="20:00"
                  onChange={(value) => pickupHoursForm.setData('pickup_close_time', value)}
                  error={pickupHoursForm.errors.pickup_close_time}
                />

                <button
                  type="submit"
                  disabled={pickupHoursForm.processing}
                  className="h-12 self-end rounded-xl bg-[#4f3118] px-5 text-[0.98rem] font-semibold text-white transition hover:bg-[#402612] disabled:opacity-50"
                >
                  {pickupHoursForm.processing ? 'Saving...' : 'Save Hours'}
                </button>
              </form>
            </div>
          </CardContent>
        </Card>

        <form method="get" action="/users" className="flex items-center gap-4 overflow-x-auto">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#866748]" strokeWidth={2} />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ''}
              placeholder="Search backoffice users by name or email..."
              className="h-14 w-full rounded-[1.05rem] border border-[#dcccba] bg-white pl-14 pr-4 text-[1rem] text-[#3a2513] outline-none transition placeholder:text-[#b09983] focus:border-[#b69066]"
            />
          </div>

          <div className="flex h-14 w-[52px] shrink-0 items-center justify-center rounded-[1.05rem] border border-[#dcccba] bg-white text-[#7a5b3d]">
            <Shield className="h-5 w-5" strokeWidth={2} />
          </div>

          <select
            name="role"
            defaultValue={filters.role || ''}
            className="h-14 w-[190px] shrink-0 rounded-[1.05rem] border border-[#dcccba] bg-white px-5 text-[1rem] text-[#3a2513] outline-none transition focus:border-[#b69066]"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
        </form>

        <Card className="overflow-hidden rounded-[1.35rem] border border-[#e0d1bf] bg-white shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#ede1cf]">
                  <tr>
                    {['User', 'Email', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map((header) => (
                      <th key={header} className="px-8 py-5 text-[1rem] font-semibold text-[#2f2115]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((user, index) => {
                    const roleKey = String(user.role || '').toLowerCase();

                    return (
                      <tr key={user.id} className={`${index !== rows.length - 1 ? 'border-b border-[#eadcca]' : ''} bg-white`}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efebe6] text-[1.1rem] font-medium text-[#6b5038]">
                              {user.initials}
                            </div>
                            <div>
                              <p className="text-[1.05rem] font-semibold text-[#352314]">{user.name}</p>
                              <p className="mt-1 text-[0.95rem] text-[#6f5238]">{user.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{user.email}</td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex rounded-full px-4 py-2 text-[1rem] font-medium ${roleTone[roleKey] || 'bg-[#f3ecdf] text-[#6d5036]'}`}>
                            {user.role || 'No role'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex rounded-full px-4 py-2 text-[1rem] font-medium ${statusTone[user.status] || 'bg-slate-100 text-slate-700'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{user.last_login || 'Never'}</td>
                        <td className="px-8 py-6 text-[1.05rem] text-[#5f4328]">{user.created}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-5 text-[#4f3118]">
                            <button
                              type="button"
                              onClick={() => setPasswordUser(user)}
                              className="transition hover:text-[#2f1c0d]"
                              aria-label={`Reset password for ${user.name}`}
                            >
                              <Lock className="h-5 w-5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveUser(user)}
                              className="transition hover:text-[#2f1c0d]"
                              aria-label={`Edit ${user.name}`}
                            >
                              <Pencil className="h-5 w-5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUser(user)}
                              className="transition hover:text-red-600"
                              aria-label={`Delete ${user.name}`}
                            >
                              <Trash2 className="h-5 w-5" strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center">
                        <p className="text-lg font-medium text-[#4d3218]">No staff members found.</p>
                        <p className="mt-2 text-sm text-[#7a5c3e]">Try another search or role filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {hasFilters ? (
          <div className="flex justify-end">
            <Link href="/users" className="text-sm font-semibold text-[#4f3118]">
              Clear filters
            </Link>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
