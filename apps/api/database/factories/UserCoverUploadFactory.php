<?php

namespace Database\Factories;

use App\Models\User\User;
use App\Models\User\UserCoverUpload;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserCoverUpload>
 */
class UserCoverUploadFactory extends Factory
{
    protected $model = UserCoverUpload::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'path' => '/storage/covers/'.fake()->uuid().'.jpg',
        ];
    }
}
