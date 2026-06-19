<?php

namespace App\Enums;

enum UserNotificationStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';
}
