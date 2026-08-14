<?php

namespace App\Services\TargetAccess\Signature;

use App\Enums\TargetAccess\SignatureStatus;
use App\Models\Identity\User;
use App\Models\TargetAccess\Signature;
use App\Models\Workspace\System;
use Illuminate\Support\Str;
use RuntimeException;

class SignatureService
{
    private const int TOKEN_LENGTH = 64;

    private const int EXPIRATION_DAYS = 30;

    public function __construct(
        private readonly SignatureStatusService $statusService,
        private readonly SignatureHtmlVerifier $htmlVerifier,
    ) {}

    public function generate(User $user, System $system, string $ipAddress): Signature
    {
        $this->revokeActiveForSystem($user, $system);

        return Signature::create([
            'user_id' => $user->id,
            'system_id' => $system->id,
            'ip_address' => $ipAddress,
            'token' => $this->generateToken(),
            'status' => SignatureStatus::Denied,
            'expiration' => now()->addDays(self::EXPIRATION_DAYS)->toDateString(),
        ]);
    }

    /**
     * @return array{signature: Signature, found_in_html: bool, permitted: bool}
     */
    public function validate(User $user, System $system): array
    {
        $signature = $this->findActiveSignature($user, $system);

        if ($signature === null) {
            throw new RuntimeException('No active signature token found for this system.');
        }

        if ($this->statusService->isExpired($signature)) {
            $signature->deny();

            throw new RuntimeException('Signature token has expired.');
        }

        $html = $this->htmlVerifier->fetchHtml($system->target_url);
        $foundInHtml = $this->htmlVerifier->containsToken($html, $signature->token);

        if ($foundInHtml) {
            $signature->permit();
        } else {
            $signature->deny();
        }

        return [
            'signature' => $signature->fresh(),
            'found_in_html' => $foundInHtml,
            'permitted' => $foundInHtml,
        ];
    }

    public function revoke(User $user, System $system): void
    {
        $signature = $this->findActiveSignature($user, $system);

        if ($signature === null) {
            throw new RuntimeException('No active signature token found for this system.');
        }

        $signature->revoke();
    }

    public function exists(User $user, System $system): bool
    {
        return $this->findActiveSignature($user, $system) !== null;
    }

    private function findActiveSignature(User $user, System $system): ?Signature
    {
        return Signature::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->where('token', '!=', '')
            ->latest()
            ->first();
    }

    private function revokeActiveForSystem(User $user, System $system): void
    {
        Signature::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->where('token', '!=', '')
            ->delete();
    }

    private function generateToken(): string
    {
        do {
            $token = Str::random(self::TOKEN_LENGTH);
        } while (Signature::query()->where('token', $token)->exists());

        return $token;
    }
}
