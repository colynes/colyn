<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class BrandedResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $resetUrl = URL::route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false);

        return (new MailMessage)
            ->subject('Reset Your Amani Brew Password')
            ->view('emails.auth.reset-password', [
                'user' => $notifiable,
                'resetUrl' => url($resetUrl),
                'expiresIn' => Config::get('auth.passwords.'.Config::get('auth.defaults.passwords').'.expire', 60),
                'appName' => Config::get('app.name', 'AmaniBrew'),
                'logoUrl' => url('/images/amani_brew_mark.png'),
                'homeUrl' => url('/'),
            ]);
    }
}
