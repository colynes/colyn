<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
        ]);

        $validator = Validator::make($request->only(['email', 'password']), [
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => __('messages.api.validation_failed'),
                'data' => [
                    'errors' => $validator->errors(),
                ],
            ], 422);
        }

        try {
            $credentials = $validator->validated();

            $user = User::query()
                ->with('customer')
                ->where('email', strtolower(trim((string) $credentials['email'])))
                ->first();

            if (! $user || ! Hash::check($credentials['password'], $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => __('messages.api.invalid_credentials'),
                    'data' => null,
                ], 401);
            }

            if (Hash::needsRehash($user->password)) {
                $user->forceFill([
                    'password' => Hash::make($credentials['password']),
                ])->save();
            }

            if (Schema::hasColumn('users', 'last_login_at')) {
                $user->forceFill([
                    'last_login_at' => now(),
                ])->save();
            }

            $user->tokens()
                ->whereNotNull('expires_at')
                ->where('expires_at', '<=', now())
                ->delete();

            $tokenExpiresAt = now()->addDays((int) config('sanctum.mobile_token_lifetime_days', 30));
            $token = $user->createToken('flutter-mobile', ['products:read'], $tokenExpiresAt)->plainTextToken;
            $roles = $user->getRoleNames()->values();

            return response()->json([
                'success' => true,
                'message' => __('messages.api.login_successful'),
                'data' => [
                    'token' => $token,
                    'token_type' => 'Bearer',
                    'expires_at' => $tokenExpiresAt->toIso8601String(),
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone ?: $user->customer?->phone,
                        'preferred_language' => $user->preferred_language,
                        'roles' => $roles,
                        'primary_role' => $roles->first(),
                        'customer' => $user->customer ? [
                            'id' => $user->customer->id,
                            'full_name' => $user->customer->full_name,
                            'phone' => $user->customer->phone,
                            'email' => $user->customer->email,
                            'address' => $user->customer->address,
                            'status' => $user->customer->status,
                        ] : null,
                    ],
                ],
            ], 200);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => __('messages.api.login_unavailable'),
                'data' => null,
            ], 500);
        }
    }
}
