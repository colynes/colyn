<?php

namespace App\Services;

use App\Models\NotificationToken;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class FirebaseMessagingService
{
    public function sendToUser(User $user, array $payload): void
    {
        $tokens = $user->notificationTokens()->pluck('token');

        if ($tokens->isEmpty() || !$this->isConfigured()) {
            return;
        }

        $accessToken = $this->accessToken();

        if (!$accessToken) {
            return;
        }

        foreach ($tokens as $token) {
            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->post($this->messagesEndpoint(), [
                    'message' => $this->buildMessage($token, $payload),
                ]);

            if ($response->failed() && $this->shouldForgetToken($response->json(), $response->body())) {
                NotificationToken::query()->where('token', $token)->delete();
            }
        }
    }

    protected function buildMessage(string $token, array $payload): array
    {
        $title = (string) ($payload['title'] ?? 'Notification');
        $body = (string) ($payload['message'] ?? $payload['body'] ?? '');
        $link = $this->absoluteLink($payload['action_url'] ?? '/notifications');

        return [
            'token' => $token,
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => $this->stringifyPayload($payload + ['link' => $link]),
            'webpush' => [
                'fcm_options' => [
                    'link' => $link,
                ],
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                    'icon' => url('/images/amani_brew_mark.png'),
                    'badge' => url('/images/amani_brew_mark.png'),
                ],
            ],
        ];
    }

    protected function stringifyPayload(array $payload): array
    {
        return collect($payload)
            ->filter(fn ($value) => $value !== null)
            ->mapWithKeys(function ($value, $key) {
                if (is_bool($value)) {
                    return [$key => $value ? '1' : '0'];
                }

                if (is_array($value)) {
                    return [$key => json_encode($value)];
                }

                return [$key => (string) $value];
            })
            ->all();
    }

    protected function absoluteLink(?string $path): string
    {
        if (!$path) {
            return url('/notifications');
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return url($path);
    }

    protected function accessToken(): ?string
    {
        return Cache::remember('firebase.messaging.access_token', now()->addMinutes(50), function () {
            if (!$this->isConfigured()) {
                return null;
            }

            $header = $this->base64UrlEncode(json_encode([
                'alg' => 'RS256',
                'typ' => 'JWT',
            ]));

            $issuedAt = now()->timestamp;
            $claimSet = $this->base64UrlEncode(json_encode([
                'iss' => config('services.firebase.client_email'),
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => $issuedAt,
                'exp' => $issuedAt + 3600,
            ]));

            $unsignedToken = $header . '.' . $claimSet;
            $privateKey = str_replace('\n', "\n", (string) config('services.firebase.private_key'));

            try {
                openssl_sign($unsignedToken, $signature, $privateKey, 'sha256WithRSAEncryption');
            } catch (Throwable) {
                return null;
            }

            $jwt = $unsignedToken . '.' . $this->base64UrlEncode($signature);

            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if ($response->failed()) {
                return null;
            }

            return Arr::get($response->json(), 'access_token');
        });
    }

    protected function shouldForgetToken(array|string|null $payload, ?string $body = null): bool
    {
        $haystack = is_array($payload) ? json_encode($payload) : (string) $payload;
        $haystack .= ' ' . (string) $body;

        return str_contains($haystack, 'UNREGISTERED')
            || str_contains($haystack, 'registration-token-not-registered')
            || str_contains($haystack, 'Requested entity was not found')
            || str_contains($haystack, 'INVALID_ARGUMENT');
    }

    protected function isConfigured(): bool
    {
        return filled(config('services.firebase.project_id'))
            && filled(config('services.firebase.client_email'))
            && filled(config('services.firebase.private_key'));
    }

    protected function messagesEndpoint(): string
    {
        return 'https://fcm.googleapis.com/v1/projects/' . config('services.firebase.project_id') . '/messages:send';
    }

    protected function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
