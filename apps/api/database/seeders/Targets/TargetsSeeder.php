<?php

namespace Database\Seeders\Targets;

use App\Models\User\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TargetsSeeder extends Seeder
{
    use WithoutModelEvents;

    public const PROJECT_NAME = 'Pentest Lab';

    /**
     * @var list<string>
     */
    public const USER_EMAILS = [
        'test@example.com',
        'admin@admin.com',
    ];

    public function run(): void
    {
        $this->call([
            VulnerableTargetSeeder::class,
            JuiceShopSeeder::class,
        ]);
    }

    /**
     * @return list<User>
     */
    public static function users(): array
    {
        $users = [];

        foreach (self::USER_EMAILS as $email) {
            $user = User::query()->where('email', $email)->first();

            if ($user !== null) {
                $users[] = $user;
            }
        }

        return $users;
    }
}
