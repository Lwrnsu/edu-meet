<?php

class JwtHelper
{
    public static function encode(array $payload, string $secret): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, $secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    public static function decode(string $token, string $secret): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new InvalidArgumentException('Invalid token format');
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;
        $signingInput = $headerB64 . '.' . $payloadB64;
        $expected = self::base64UrlEncode(hash_hmac('sha256', $signingInput, $secret, true));

        if (!hash_equals($expected, $signatureB64)) {
            throw new InvalidArgumentException('Invalid token signature');
        }

        $headerJson = self::base64UrlDecode($headerB64);
        $payloadJson = self::base64UrlDecode($payloadB64);
        $header = json_decode($headerJson, true);
        $payload = json_decode($payloadJson, true);

        if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256') {
            throw new InvalidArgumentException('Unsupported token algorithm');
        }

        if (!is_array($payload)) {
            throw new InvalidArgumentException('Invalid token payload');
        }

        if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
            throw new InvalidArgumentException('Token has expired');
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder > 0) {
            $data .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($data, '-_', '+/'), true);
        if ($decoded === false) {
            throw new InvalidArgumentException('Invalid token encoding');
        }

        return $decoded;
    }
}
