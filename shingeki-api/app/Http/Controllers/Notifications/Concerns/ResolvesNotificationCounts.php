<?php

namespace App\Http\Controllers\Notifications\Concerns;

use App\Enums\Notifications\UserNotificationStatus;
use App\Models\Identity\User;
use App\Models\Notifications\UserNotification;

trait ResolvesNotificationCounts
{
    /**
     * @return array{unread_count: int, pending_count: int}
     */
    protected function notificationCounts(User $user): array
    {
        return [
            'unread_count' => UserNotification::query()
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->whereIn('status', [
                    UserNotificationStatus::Completed,
                    UserNotificationStatus::Failed,
                ])
                ->count(),
            'pending_count' => UserNotification::query()
                ->where('user_id', $user->id)
                ->where('status', UserNotificationStatus::Pending)
                ->count(),
        ];
    }
}
