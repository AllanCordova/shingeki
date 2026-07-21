<?php

namespace App\Enums\User;

enum UserNotificationStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';
}
