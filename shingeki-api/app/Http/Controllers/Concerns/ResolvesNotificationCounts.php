<?php

namespace App\Http\Controllers\Concerns;

use App\Enums\UserNotificationStatus;
use App\Models\User;
use App\Models\UserNotification;

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
