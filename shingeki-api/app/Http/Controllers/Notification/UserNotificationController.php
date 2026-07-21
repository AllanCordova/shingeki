<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Controllers\Concerns\ResolvesNotificationCounts;
use App\Http\Controllers\Controller;
use App\Http\Requests\Notification\ListUserNotifications;
use App\Models\User\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    use FormatsPagination;
    use ResolvesNotificationCounts;

    public function index(ListUserNotifications $request): JsonResponse
    {
        $user = $request->user();

        $notifications = UserNotification::query()
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(
                perPage: $request->perPage(),
                page: $request->page(),
            );

        return response()->json([
            'notifications' => $notifications
                ->getCollection()
                ->map(fn (UserNotification $notification) => $this->formatNotification($notification))
                ->values()
                ->all(),
            'pagination' => $this->formatPagination($notifications),
            ...$this->notificationCounts($user),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json($this->notificationCounts($request->user()));
    }

    public function markRead(Request $request, UserNotification $userNotification): JsonResponse
    {
        $this->assertOwnership($request, $userNotification);

        if ($userNotification->read_at === null) {
            $userNotification->update(['read_at' => now()]);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $this->formatNotification($userNotification->fresh()),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }

    public function destroy(Request $request, UserNotification $userNotification): JsonResponse
    {
        $this->assertOwnership($request, $userNotification);

        $userNotification->delete();

        return response()->json([
            'message' => 'Notification deleted.',
        ]);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'message' => 'All notifications deleted.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatNotification(UserNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type->value,
            'status' => $notification->status->value,
            'title' => $notification->title,
            'body' => $notification->body,
            'action_url' => $notification->action_url,
            'payload' => $notification->payload ?? new \stdClass,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
            'updated_at' => $notification->updated_at,
        ];
    }

    private function assertOwnership(Request $request, UserNotification $notification): void
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(404);
        }
    }
}
