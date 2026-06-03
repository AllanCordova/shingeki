<?php

namespace App\Http\Controllers;

use App\Http\Requests\AuthLogin;
use App\Http\Requests\AuthRegister;
use App\Http\Requests\AuthUpdate;
use App\Models\User;
use App\Services\User\UserAvatarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private readonly UserAvatarService $avatars,
    ) {}

    public function register(AuthRegister $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'role' => 'user',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully.',
            'user' => $this->formatUser($user),
            'token' => $token,
        ], 201);
    }

    public function login(AuthLogin $request): JsonResponse
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser($request->user()),
        ]);
    }

    public function update(AuthUpdate $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->safe()->only(['name', 'email', 'password']);

        if ($request->boolean('remove_avatar')) {
            $this->avatars->remove($user);
            $user = $user->fresh();
        }

        if ($request->hasFile('avatar')) {
            $data['avatar_path'] = $this->avatars->replaceFromFile($user, $request->file('avatar'));
        } elseif ($request->filled('avatar_upload_id')) {
            $data['avatar_path'] = $this->avatars->replaceFromLibraryUploadId(
                $user,
                $request->validated('avatar_upload_id'),
            );
        }

        if ($data !== []) {
            $user->update($data);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->formatUser($user->fresh()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_path' => $user->avatar_path,
            'role' => $user->role,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}
