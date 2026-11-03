<?php

namespace App\Providers;

use App\Domain\Geo\Contracts\RuteadorInterface;
use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Drivers\OpenRouteServiceDriver;
use App\Domain\Geo\Drivers\OsrmDriver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(RuteadorInterface::class, function (): RuteadorInterface {
            return match ((string) config('ruteo.driver', 'ors')) {
                'osrm' => new OsrmDriver,
                'haversine' => new HaversineDriver,
                default => new OpenRouteServiceDriver,
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureInertiaErrorPages();
    }

    /**
     * Render the 404 screen inside the SPA for web visits, while keeping
     * JSON responses for the API and any request that expects JSON.
     */
    protected function configureInertiaErrorPages(): void
    {
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response): ?ExceptionResponse {
            $request = $response->request;

            if ($response->statusCode() !== 404) {
                return null;
            }

            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }

            return $response->render('errors/NotFound', [
                'path' => '/'.$request->path(),
            ]);
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
