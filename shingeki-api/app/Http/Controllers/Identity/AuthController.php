<?php

namespace App\Http\Controllers\Identity;

use App\Enums\Identity\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Identity\AuthLogin;
use App\Http\Requests\Identity\AuthRegister;
use App\Http\Requests\Identity\AuthUpdate;
use App\Http\Resources\Identity\UserResource;
use App\Models\Identity\User;
use App\Services\Identity\UserAvatarService;
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
            'role' => UserRole::User,
        ]);

        $token = $this->issueAuthToken($user);

        return response()->json([
            'message' => 'User registered successfully.',
            'user' => UserResource::make($user),
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

        $token = $this->issueAuthToken($user);

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => UserResource::make($user),
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
            'user' => UserResource::make($request->user()),
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
            'user' => UserResource::make($user->fresh()),
        ]);
    }

    private function issueAuthToken(User $user): string
    {
        $maxTokens = max(1, (int) config('security.auth.max_active_tokens', 5));
        $tokens = $user->tokens()->where('name', 'auth-token')->latest('id')->get();

        if ($tokens->count() >= $maxTokens) {
            $tokens->slice($maxTokens - 1)->each->delete();
        }

        return $user->createToken('auth-token')->plainTextToken;
    }
}
