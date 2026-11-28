<?php

require_once __DIR__ . '/ApiException.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

class MailHelper
{
    public static function sendOtpMail(string $email, string $firstName, string $otp): void
    {
        $greeting = self::safeGreeting($firstName);
        $body = "Hello {$greeting},\n\n"
            . "Your verification code is: {$otp}\n\n"
            . "This code expires in 10 minutes. If you did not request it, you can ignore this email.\n";

        self::send($email, 'Your EduMeet verification code', $body, 'Unable to send the verification code email.');
    }

    public static function sendAccountCreatedMail(string $email, string $firstName, string $defaultPassword): void
    {
        $greeting = self::safeGreeting($firstName);
        $password = str_replace(["\r", "\n"], '', (string) $defaultPassword);
        $body = "Hello {$greeting},\n\n"
            . "Your Edu-Meet account is created!\n\n"
            . "Your default password is \"{$password}\"\n\n"
            . "Please change your default password upon logging in.\n\n"
            . "The password must be at least 8 characters long and include at\n"
            . "least one uppercase letter, one number (0-9), and one special\n"
            . "character such as @, #, !, %, or _.\n\n"
            . "Note: Don't share this information to anyone.\n";

        self::send(
            $email,
            'Your Edu-Meet account is created',
            $body,
            'Unable to send the account creation email.'
        );
    }

    private static function safeGreeting(string $firstName): string
    {
        $name = str_replace(["\r", "\n"], '', trim($firstName));
        return $name !== '' ? $name : 'there';
    }

    private static function send(string $toEmail, string $subject, string $body, string $failurePrefix): void
    {
        $to = strtolower(trim($toEmail));
        if ($to === '' || preg_match('/[\r\n]/', $to) === 1) {
            throw new ApiException("{$failurePrefix}", 500);
        }

        $mailConfig = require __DIR__ . '/../config/mail.php';
        $password = trim((string) ($mailConfig['password'] ?? ''));
        $fromEmail = trim((string) ($mailConfig['from_email'] ?? ''));
        if ($password === '' || $fromEmail === '' || filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false) {
            throw new ApiException(
                'Brevo mail is not configured. Set the SMTP key and a verified sender in php/config/mail.php.',
                500
            );
        }

        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = (string) ($mailConfig['host'] ?? 'smtp-relay.brevo.com');
            $mail->Port = (int) ($mailConfig['port'] ?? 587);
            $mail->SMTPAuth = true;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Username = (string) ($mailConfig['username'] ?? '');
            $mail->Password = $password;
            $mail->CharSet = 'UTF-8';

            $mail->setFrom($fromEmail, (string) ($mailConfig['from_name'] ?? 'EduMeet'));
            $mail->addAddress($to);
            $mail->Subject = $subject;
            $mail->Body = $body;

            $mail->send();
        } catch (MailException $e) {
            throw new ApiException("{$failurePrefix} Please try again.", 500);
        }
    }
}
