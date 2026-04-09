<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f7f3ec;font-family:Arial,Helvetica,sans-serif;color:#241816;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ec;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#f8f2ea;">
                    <tr>
                        <td style="padding:28px 22px;">
                            <div style="font-size:26px;line-height:1.2;font-weight:700;color:#2f1d13;">Reset your password</div>

                            <p style="margin:22px 0 0;font-size:17px;line-height:1.75;color:#6b513a;">
                                Hello{{ filled($user->name ?? null) ? ' '.$user->name : '' }}, we received a request to reset the password for your Amani Brew account.
                            </p>

                            <p style="margin:22px 0 0;font-size:17px;line-height:1.75;color:#6b513a;">
                                Use the button below to choose a new password. This reset link will expire in {{ $expiresIn }} minutes.
                            </p>

                            <div style="margin:34px 0;text-align:center;">
                                <a href="{{ $resetUrl }}" style="display:inline-block;background:#8b232d;color:#ffffff;text-decoration:none;font-size:18px;font-weight:700;padding:18px 36px;border-radius:999px;">
                                    Reset Password
                                </a>
                            </div>

                            <div style="padding:20px 24px;border-radius:22px;background:#efe5d7;font-size:15px;line-height:1.8;color:#6b513a;">
                                If the button does not work, copy and paste this link into your browser:<br><br>
                                <a href="{{ $resetUrl }}" style="color:#8b232d;word-break:break-all;">{{ $resetUrl }}</a>
                            </div>

                            <p style="margin:28px 0 0;font-size:17px;line-height:1.75;color:#6b513a;">
                                If you did not request a password reset, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
