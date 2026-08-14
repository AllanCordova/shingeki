<?php

namespace Database\Factories;

use App\Enums\Notifications\UserNotificationStatus;
use App\Enums\Notifications\UserNotificationType;
use App\Models\Identity\User;
use App\Models\Notifications\UserNotification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserNotification>
 */
class UserNotificationFactory extends Factory
{
    protected $model = UserNotification::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => UserNotificationType::AttackDispatch,
            'status' => UserNotificationStatus::Pending,
            'title' => 'Scan em andamento',
            'body' => 'Sistema',
        ];
    }
}
