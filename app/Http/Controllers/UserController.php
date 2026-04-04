<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    protected const CANONICAL_ROLE_ALIASES = [
        'Administrator' => ['Administrator', 'administrator', 'Admin', 'admin'],
        'Manager' => ['Manager', 'manager'],
        'Staff' => ['Staff', 'staff'],
    ];

    protected function ensureAdministrator(): void
    {
        $user = auth()->user();

        $roleNames = collect($user?->getRoleNames() ?? [])
            ->map(fn ($role) => strtolower((string) $role));

        abort_unless($roleNames->intersect(['administrator', 'admin'])->isNotEmpty(), 403);
    }

    protected function backofficeRoleNames(): array
    {
        return collect(self::CANONICAL_ROLE_ALIASES)
            ->flatten()
            ->values()
            ->all();
    }

    protected function normalizeBackofficeRole(?string $roleName): ?string
    {
        $normalized = strtolower((string) $roleName);

        foreach (self::CANONICAL_ROLE_ALIASES as $canonical => $aliases) {
            if (collect($aliases)->map(fn ($alias) => strtolower($alias))->contains($normalized)) {
                return $canonical;
            }
        }

        return $roleName ?: null;
    }

    protected function expandRequestedRole(?string $roleName): array
    {
        $canonical = $this->normalizeBackofficeRole($roleName);

        return self::CANONICAL_ROLE_ALIASES[$canonical] ?? array_filter([(string) $roleName]);
    }

    protected function availableRoleOptions()
    {
        $roles = Role::query()
            ->whereIn('name', $this->backofficeRoleNames())
            ->get(['id', 'name']);

        return collect(self::CANONICAL_ROLE_ALIASES)
            ->map(function (array $aliases, string $canonical) use ($roles) {
                $role = $roles->first(fn (Role $role) => in_array($role->name, $aliases, true));

                return $role ? [
                    'id' => $role->id,
                    'name' => $canonical,
                    'db_name' => $role->name,
                ] : null;
            })
            ->filter()
            ->values();
    }

    public function index(Request $request)
    {
        $this->ensureAdministrator();

        $users = User::query()
            ->with('roles')
            ->whereHas('roles', fn ($query) => $query->whereIn('name', $this->backofficeRoleNames()))
            ->when($request->search, fn($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%"))
            ->when($request->filled('role'), fn($q) => $q->whereHas('roles', fn ($roleQuery) => $roleQuery->whereIn('name', $this->expandRequestedRole($request->string('role')->toString()))))
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString()
            ->through(function (User $user) {
                $roleName = $this->normalizeBackofficeRole($user->roles->first()?->name);
                $nameParts = preg_split('/\s+/', trim((string) $user->name)) ?: [];
                $initials = collect($nameParts)
                    ->filter()
                    ->take(2)
                    ->map(fn ($part) => strtoupper(substr($part, 0, 1)))
                    ->implode('');

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $roleName,
                    'status' => 'Active',
                    'last_login' => optional($user->updated_at ?? $user->created_at)->format('Y-m-d H:i'),
                    'created' => optional($user->created_at)->toDateString(),
                    'initials' => $initials ?: 'U',
                    'code' => 'USR-' . str_pad((string) $user->id, 3, '0', STR_PAD_LEFT),
                ];
            });

        return Inertia::render('Users', [
            'users'   => $users,
            'roles'   => $this->availableRoleOptions(),
            'filters' => $request->only(['search', 'role']),
            'pickupHours' => $this->pickupHours(),
        ]);
    }

    public function store(Request $request)
    {
        $this->ensureAdministrator();

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => 'required|min:8|confirmed',
            'role'     => 'required|in:Administrator,Manager,Staff',
        ]);

        $roleName = collect($this->availableRoleOptions())
            ->firstWhere('name', $validated['role'])['db_name'] ?? $validated['role'];

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($roleName);

        return back()->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user)
    {
        $this->ensureAdministrator();

        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'role'  => 'required|in:Administrator,Manager,Staff',
        ]);

        $roleName = collect($this->availableRoleOptions())
            ->firstWhere('name', $validated['role'])['db_name'] ?? $validated['role'];

        $user->update([
            'name'  => $validated['name'],
            'email' => $validated['email'],
        ]);

        $user->syncRoles([$roleName]);

        return back()->with('success', 'User updated successfully.');
    }

    public function destroy(User $user)
    {
        $this->ensureAdministrator();

        if ($user->id === auth()->id()) {
            return back()->with('error', 'Cannot delete yourself.');
        }
        $user->delete();
        return back()->with('success', 'User deleted.');
    }

    public function resetPassword(Request $request, User $user)
    {
        $this->ensureAdministrator();

        $request->validate(['password' => 'required|min:8|confirmed']);
        $user->update(['password' => Hash::make($request->password)]);
        return back()->with('success', 'Password reset successfully.');
    }

    public function updatePickupHours(Request $request)
    {
        $this->ensureAdministrator();

        abort_unless(Schema::hasTable('app_settings'), 422, 'Run the latest migrations before saving pickup hours.');

        $validated = $request->validate([
            'pickup_open_time' => ['required', 'date_format:H:i'],
            'pickup_close_time' => ['required', 'date_format:H:i', 'after:pickup_open_time'],
        ]);

        AppSetting::setValue('pickup_open_time', $validated['pickup_open_time']);
        AppSetting::setValue('pickup_close_time', $validated['pickup_close_time']);

        return back()->with('success', 'Pickup working hours saved successfully.');
    }

    protected function pickupHours(): array
    {
        if (!Schema::hasTable('app_settings')) {
            return [
                'open_time' => '08:00',
                'close_time' => '20:00',
            ];
        }

        return [
            'open_time' => AppSetting::getValue('pickup_open_time', '08:00'),
            'close_time' => AppSetting::getValue('pickup_close_time', '20:00'),
        ];
    }
}
