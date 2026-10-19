<?php

use App\Http\Middleware\EnsureModuleAccess;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveApiUser;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'modulo' => EnsureModuleAccess::class,
        ]);
        $middleware->redirectGuestsTo(fn () => route('login'));

        // El resolutor de identidad debe ejecutarse antes de la autorización.
        $middleware->prependToPriorityList(AuthenticatesRequests::class, ResolveApiUser::class);
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
        $middleware->api(
            prepend: [
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
            ],
            append: [
                StartSession::class,
                ResolveApiUser::class,
            ],
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (InvalidArgumentException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['operacion' => [$e->getMessage()]],
            ], 422);
        });
    })->create();
