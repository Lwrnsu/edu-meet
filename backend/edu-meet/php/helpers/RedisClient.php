<?php

class RedisClient
{
    private $socket;

    public function __construct(string $host = '127.0.0.1', int $port = 6379, float $timeout = 2.0)
    {
        $this->socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
        if ($this->socket === false) {
            throw new RuntimeException("Redis connection failed: $errstr ($errno)");
        }
        stream_set_timeout($this->socket, 2);
    }

    public function __destruct()
    {
        if (is_resource($this->socket)) {
            fclose($this->socket);
        }
    }

    public function set(string $key, string $value, ?int $ttlSeconds = null): bool
    {
        $args = ['SET', $key, $value];
        if ($ttlSeconds !== null) {
            $args[] = 'EX';
            $args[] = (string) $ttlSeconds;
        }

        return $this->command($args) === 'OK';
    }

    public function get(string $key): ?string
    {
        $result = $this->command(['GET', $key]);

        return $result === null ? null : (string) $result;
    }

    public function del(string $key): int
    {
        return (int) $this->command(['DEL', $key]);
    }

    private function command(array $args)
    {
        $payload = '*' . count($args) . "\r\n";
        foreach ($args as $arg) {
            $arg = (string) $arg;
            $payload .= '$' . strlen($arg) . "\r\n" . $arg . "\r\n";
        }

        if (fwrite($this->socket, $payload) === false) {
            throw new RuntimeException('Failed to write to Redis');
        }

        return $this->readReply();
    }

    private function readReply()
    {
        $line = fgets($this->socket);
        if ($line === false) {
            throw new RuntimeException('Redis connection lost');
        }

        $type = $line[0];
        $data = rtrim(substr($line, 1), "\r\n");

        switch ($type) {
            case '+':
                return $data;
            case '-':
                throw new RuntimeException('Redis error: ' . $data);
            case ':':
                return (int) $data;
            case '$':
                $length = (int) $data;
                if ($length === -1) {
                    return null;
                }
                $buffer = '';
                $remaining = $length + 2;
                while ($remaining > 0) {
                    $chunk = fread($this->socket, $remaining);
                    if ($chunk === false || $chunk === '') {
                        throw new RuntimeException('Redis connection lost');
                    }
                    $buffer .= $chunk;
                    $remaining -= strlen($chunk);
                }

                return substr($buffer, 0, $length);
            default:
                throw new RuntimeException('Unexpected Redis reply');
        }
    }
}