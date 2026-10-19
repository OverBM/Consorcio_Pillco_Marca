<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Almacen extends Model
{
    use Auditable;
    use SoftDeletes;

    protected $table = 'almacenes';

    protected $fillable = [
        'obra_id',
        'codigo',
        'nombre',
        'radio_geocerca_m',
        'capacidad_referencial',
        'activo',
        'ubicacion',
        'latitud',
        'longitud',
    ];

    protected function casts(): array
    {
        return [
            'radio_geocerca_m' => 'integer',
            'capacidad_referencial' => 'decimal:2',
            'activo' => 'boolean',
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

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'usuario_almacen', 'almacen_id', 'usuario_id')
            ->withPivot('tipo');
    }

    public function ubicaciones(): HasMany
    {
        return $this->hasMany(UbicacionAlmacen::class, 'almacen_id');
    }

    public function stock(): HasMany
    {
        return $this->hasMany(StockAlmacen::class, 'almacen_id');
    }

    public function getUbicacionGeoJsonAttribute(): ?array
    {
        $raw = DB::table('almacenes')
            ->selectRaw('ST_AsGeoJSON(ubicacion::geometry) as geojson')
            ->where('id', $this->id)
            ->value('geojson');

        return $raw ? json_decode($raw, true) : null;
    }
}
