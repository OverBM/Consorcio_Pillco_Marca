@php($reglasCampo = \App\Support\RegistroCampos::reglas()[$campo] ?? [])
@if ($reglasCampo !== [])
  <ul class="field-policy" data-policy="{{ $campo }}" hidden>
    @foreach ($reglasCampo as $clave => $etiqueta)
      <li class="field-policy-item" data-rule="{{ $clave }}">{{ $etiqueta }}</li>
    @endforeach
  </ul>
@endif
