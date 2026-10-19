<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Obra extends Model
{
    use Auditable;
    use SoftDeletes;

    protected $table = 'obras';

    protected $fillable = [
        'programa_id',
        'codigo',
        'nombre',
        'direccion',
        'distrito',
        'estado',
        'fase_ciclo',
        'fecha_inicio',
        'fecha_fin_prevista',
        'fecha_fin_real',
        'avance_fisico_pct',
        'presupuesto_base',
        'residente_id',
        'ubicacion',
        'latitud',
        'longitud',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_fin_prevista' => 'date',
            'fecha_fin_real' => 'date',
            'avance_fisico_pct' => 'decimal:2',
            'presupuesto_base' => 'decimal:2',
        ];
    }

    public function setLatitudAttribute($value): void
    {
        $currLng = $this->getLongitudAttribute() ?? '';
        $this->attributes['ubicacion'] = $value.','.$currLng;
    }

    public function setLongitudAttribute($value): void
    {
        $currLat = $this->getLatitudAttribute() ?? '';
        $this->attributes['ubicacion'] = $currLat.','.$value;
    }

    public function getLatitudAttribute(): ?float
    {
        if (! empty($this->attributes['ubicacion']) && str_contains($this->attributes['ubicacion'], ',')) {
            $parts = explode(',', $this->attributes['ubicacion']);

            return (float) $parts[0];
        }

        return null;
    }

    public function getLongitudAttribute(): ?float
    {
        if (! empty($this->attributes['ubicacion']) && str_contains($this->attributes['ubicacion'], ',')) {
            $parts = explode(',', $this->attributes['ubicacion']);

            return (float) ($parts[1] ?? 0);
        }

        return null;
    }

    public function programa(): BelongsTo
    {
        return $this->belongsTo(Programa::class, 'programa_id');
    }

    public function residente(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'residente_id');
    }

    public function almacenes(): HasMany
    {
        return $this->hasMany(Almacen::class, 'obra_id');
    }

    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'usuario_obra', 'obra_id', 'usuario_id')
            ->withPivot('rol_id');
    }

    public function frentes(): HasMany
    {
        return $this->hasMany(FrenteTrabajo::class, 'obra_id');
    }

    public function partidas(): HasMany
    {
        return $this->hasMany(Partida::class, 'obra_id');
    }

    public function getUbicacionGeoJsonAttribute(): ?array
    {
        $raw = DB::table('obras')
            ->selectRaw('ST_AsGeoJSON(ubicacion::geometry) as geojson')
            ->where('id', $this->id)
            ->value('geojson');

        return $raw ? json_decode($raw, true) : null;
    }
}
