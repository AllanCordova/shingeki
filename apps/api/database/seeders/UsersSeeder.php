<?php

namespace Database\Seeders;

use App\Enums\User\UserRole;
use App\Models\User\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsersSeeder extends Seeder
{
    use WithoutModelEvents;

    private const TOTAL = 100;

    /**
     * @var list<string>
     */
    private const FIRST_NAMES = [
        'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Felipe', 'Gabriela', 'Henrique',
        'Isabela', 'Joao', 'Karen', 'Lucas', 'Marina', 'Nicolas', 'Olivia', 'Pedro',
        'Quezia', 'Rafael', 'Sofia', 'Thiago', 'Ursula', 'Vitor', 'Wagner', 'Yasmin',
        'Amanda', 'Caio', 'Beatriz', 'Daniel', 'Eduarda', 'Fernando', 'Helena', 'Igor',
        'Julia', 'Kevin', 'Larissa', 'Mateus', 'Natalia', 'Otavio', 'Patricia', 'Renato',
        'Samara', 'Tales', 'Vanessa', 'William', 'Xavier', 'Zuleika', 'Alice', 'Bernardo',
        'Camila', 'Davi',
    ];

    /**
     * @var list<string>
     */
    private const LAST_NAMES = [
        'Almeida', 'Barbosa', 'Carvalho', 'Dias', 'Esteves', 'Ferreira', 'Gomes', 'Hahn',
        'Ibrahim', 'Junqueira', 'Klein', 'Lima', 'Moraes', 'Nogueira', 'Oliveira', 'Pinto',
        'Queiroz', 'Ribeiro', 'Santos', 'Teixeira', 'Uchoa', 'Vieira', 'Wanderley', 'Xavier',
        'Yamamoto', 'Zanetti', 'Araujo', 'Borges', 'Campos', 'Duarte', 'Freitas', 'Garcia',
        'Hoffmann', 'Inacio', 'Jesus', 'Kotake', 'Lopes', 'Martins', 'Nunes', 'Pereira',
    ];

    public function run(): void
    {
        $password = Hash::make('password');

        for ($index = 1; $index <= self::TOTAL; $index++) {
            $role = $this->roleForIndex($index);
            $name = $this->nameForIndex($index);
            $email = sprintf('demo.user%03d@example.com', $index);

            User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => $password,
                    'role' => $role,
                ],
            );
        }
    }

    private function roleForIndex(int $index): UserRole
    {
        // Mix: ~5 admins, ~25 specialists, ~70 users
        if ($index <= 5) {
            return UserRole::Admin;
        }

        if ($index <= 30) {
            return UserRole::Specialist;
        }

        return UserRole::User;
    }

    private function nameForIndex(int $index): string
    {
        $first = self::FIRST_NAMES[($index - 1) % count(self::FIRST_NAMES)];
        $last = self::LAST_NAMES[($index * 7) % count(self::LAST_NAMES)];

        return $first.' '.$last;
    }
}
