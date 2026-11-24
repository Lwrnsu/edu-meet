<?php

require_once __DIR__ . '/../config/Database.php';

abstract class BaseModel {
    protected function db(): PDO {
        return Database::connect();
    }

    abstract public function toArray(): array;

    abstract public function save(): self;

    abstract public function delete(): bool;
}