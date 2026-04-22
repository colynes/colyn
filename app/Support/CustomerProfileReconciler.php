<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CustomerProfileReconciler
{
    public function reconcile(User $user): ?Customer
    {
        $user->loadMissing('customer.defaultAddress');
        $customer = $user->customer;

        if (!$customer) {
            return null;
        }

        $orphan = Customer::query()
            ->with('defaultAddress')
            ->whereNull('user_id')
            ->where(function ($query) use ($user) {
                $query->where('email', $user->email);

                if (filled($user->phone)) {
                    $query->orWhere('phone', $user->phone);
                }
            })
            ->orderBy('id')
            ->first();

        if (!$orphan) {
            return $customer;
        }

        if ($this->hasCustomerActivity($orphan)) {
            return $customer;
        }

        DB::transaction(function () use ($user, $customer, $orphan): void {
            $updates = [
                'full_name' => $user->name ?: $customer->full_name,
            ];

            if ($this->canUseCustomerEmail($user->email, $customer->id, $orphan->id)) {
                $updates['email'] = $user->email;
            }

            $candidatePhone = $this->preferredPhone($user, $customer, $orphan);

            if (filled($candidatePhone) && $this->canUseCustomerPhone($candidatePhone, $customer->id, $orphan->id)) {
                $updates['phone'] = $candidatePhone;
            }

            if (Schema::hasColumn('customers', 'address')) {
                $candidateAddress = $customer->address ?: $orphan->address ?: $orphan->defaultAddress?->address_line1;

                if (filled($candidateAddress)) {
                    $updates['address'] = $candidateAddress;
                }
            }

            $customer->fill($updates)->save();

            if (Schema::hasTable('customer_addresses')) {
                $customer->addresses()
                    ->updateOrCreate(
                        ['is_default' => true],
                        [
                            'address_line1' => $customer->defaultAddress?->address_line1
                                ?: $orphan->defaultAddress?->address_line1
                                ?: ($updates['address'] ?? $customer->address ?? ''),
                            'address_line2' => $customer->defaultAddress?->address_line2 ?? $orphan->defaultAddress?->address_line2,
                            'city' => $customer->defaultAddress?->city ?? $orphan->defaultAddress?->city ?? $user->city,
                            'postal_code' => $customer->defaultAddress?->postal_code ?? $orphan->defaultAddress?->postal_code,
                            'phone' => $updates['phone'] ?? $customer->defaultAddress?->phone ?? $orphan->defaultAddress?->phone,
                        ]
                    );
            }

            $userUpdates = [];

            if (blank($user->phone) && !empty($updates['phone']) && Schema::hasColumn('users', 'phone')) {
                $userUpdates['phone'] = $updates['phone'];
            }

            if (blank($user->city) && filled($orphan->defaultAddress?->city) && Schema::hasColumn('users', 'city')) {
                $userUpdates['city'] = $orphan->defaultAddress?->city;
            }

            if (blank($user->country) && Schema::hasColumn('users', 'country')) {
                $userUpdates['country'] = 'Tanzania';
            }

            if ($userUpdates !== []) {
                $user->fill($userUpdates)->save();
            }

            if (Schema::hasTable('customer_addresses')) {
                $orphan->addresses()->delete();
            }

            $orphan->delete();
        });

        $user->unsetRelation('customer');
        $user->load('customer.defaultAddress');

        return $user->customer;
    }

    protected function hasCustomerActivity(Customer $customer): bool
    {
        return $customer->orders()->exists()
            || $customer->subscriptions()->exists()
            || $customer->subscriptionRequests()->exists();
    }

    protected function preferredPhone(User $user, Customer $customer, Customer $orphan): ?string
    {
        if (filled($user->phone)) {
            return $user->phone;
        }

        if (filled($orphan->phone) && $this->isPhoneDuplicated($customer, $orphan->phone)) {
            return $orphan->phone;
        }

        return $customer->phone ?: $orphan->phone;
    }

    protected function isPhoneDuplicated(Customer $customer, string $phone): bool
    {
        return Customer::query()
            ->where('phone', $phone)
            ->whereKeyNot($customer->id)
            ->exists();
    }

    protected function canUseCustomerEmail(?string $email, int $customerId, int $orphanId): bool
    {
        if (!filled($email)) {
            return false;
        }

        return !Customer::query()
            ->where('email', $email)
            ->whereKeyNot($customerId)
            ->whereKeyNot($orphanId)
            ->exists();
    }

    protected function canUseCustomerPhone(?string $phone, int $customerId, int $orphanId): bool
    {
        if (!filled($phone)) {
            return false;
        }

        return !Customer::query()
            ->where('phone', $phone)
            ->whereKeyNot($customerId)
            ->whereKeyNot($orphanId)
            ->exists();
    }
}
