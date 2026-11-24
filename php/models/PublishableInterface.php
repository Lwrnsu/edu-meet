<?php

interface PublishableInterface {
    public function publish(): self;

    public function archive(): self;

    public function getStatus(): string;
}