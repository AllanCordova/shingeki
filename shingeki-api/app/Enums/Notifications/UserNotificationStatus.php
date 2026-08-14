<?php

namespace App\Enums\Notifications;

enum UserNotificationStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';
}
