<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
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

            $token = $user->createToken('flutter-mobile')->plainTextToken;
            $roles = $user->getRoleNames()->values();

            return response()->json([
                'success' => true,
                'message' => __('messages.api.login_successful'),
                'data' => [
                    'token' => $token,
                    'token_type' => 'Bearer',
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
