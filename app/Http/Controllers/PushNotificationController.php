<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNotificationTokenRequest;
use Illuminate\Http\JsonResponse;

class PushNotificationController extends Controller
{
    public function saveToken(StoreNotificationTokenRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $request->user()
            ->notificationTokens()
            ->where('token', $validated['token'])
            ->delete();

        \App\Models\NotificationToken::query()
            ->where('token', $validated['token'])
            ->where('user_id', '!=', $request->user()->id)
            ->delete();

        $request->user()->notificationTokens()->updateOrCreate(
            ['token' => $validated['token']],
            []
        );

        return response()->json(['success' => true]);
    }

    public function removeToken(StoreNotificationTokenRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $request->user()->notificationTokens()
            ->where('token', $validated['token'])
            ->delete();

        return response()->json(['success' => true]);
    }
}
