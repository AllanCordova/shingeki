<?php

namespace App\Services\Attack;

use App\Models\Attack\AttackDispatch;
use App\Services\Notification\UserNotificationService;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AttackDispatchCanceller
{
    public function __construct(
        private readonly AttackQueuePublisher $publisher,
        private readonly UserNotificationService $notifications,
    ) {}

    public function cancel(AttackDispatch $dispatch): AttackDispatch
    {
        $updated = AttackDispatch::query()
            ->whereKey($dispatch->id)
            ->whereNull('completed_at')
            ->whereNull('failed_at')
            ->whereNull('session_expired_at')
            ->whereNull('cancelled_at')
            ->update(['cancelled_at' => now()]);

        if ($updated === 0) {
            throw new ConflictHttpException('Only a running dispatch can be cancelled.');
        }

        $dispatch->refresh();
        $this->publisher->publishDispatchCancel($dispatch);
        $this->notifications->completeAttackDispatch($dispatch);

        return $dispatch;
    }

    public function signal(AttackDispatch $dispatch): void
    {
        $this->publisher->publishDispatchCancel($dispatch);
    }
}
