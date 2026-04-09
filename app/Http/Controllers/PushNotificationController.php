<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushNotificationController extends Controller
{
    public function config(): JsonResponse
    {
        return response()->json([
            'apiKey' => env('VITE_FIREBASE_API_KEY'),
            'authDomain' => env('VITE_FIREBASE_AUTH_DOMAIN'),
            'projectId' => env('VITE_FIREBASE_PROJECT_ID'),
            'messagingSenderId' => env('VITE_FIREBASE_SENDER_ID', env('VITE_FIREBASE_MESSAGING_SENDER_ID')),
            'appId' => env('VITE_FIREBASE_APP_ID'),
            'vapidKey' => env('VITE_FIREBASE_VAPID_KEY'),
        ]);
    }

    public function saveToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:4096'],
        ]);

        $request->user()->notificationTokens()->updateOrCreate(
            ['token' => $validated['token']],
            []
        );

        return response()->json(['success' => true]);
    }

    public function removeToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:4096'],
        ]);

        $request->user()->notificationTokens()
            ->where('token', $validated['token'])
            ->delete();

        return response()->json(['success' => true]);
    }
}
