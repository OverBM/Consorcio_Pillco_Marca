<?php

namespace App\Console\Commands;

use App\Http\Controllers\Web\DashboardViewController;
use Illuminate\Console\Command;

class PrecalentarPanel extends Command
{
    protected $signature = 'panel:precalentar';

    protected $description = 'Precalcula y cachea las tarjetas del panel general.';

    public function handle(DashboardViewController $panel): int
    {
        $panel->precalentarPanel();

        $this->info('Panel precalculado y cacheado.');

        return self::SUCCESS;
    }
}
