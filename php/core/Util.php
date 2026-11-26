<?php
final class Util
{
    public static function ext(string $name): string
    {
        return strtolower(pathinfo($name, PATHINFO_EXTENSION));
    }

    public static function viewable(string $name): bool
    {
        return in_array(self::ext($name), VIEWABLE, true);
    }

    public static function isLate(array $task, ?string $at): bool
    {
        return !empty($task['due_date']) && $at && strtotime($at) > strtotime($task['due_date']);
    }

    public static function fmt($n): string
    {
        return rtrim(rtrim(number_format((float) $n, 2, '.', ''), '0'), '.');
    }
}
