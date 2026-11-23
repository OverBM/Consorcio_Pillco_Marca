import{_ as e,c as t,d as n,f as r,g as i,h as a,l as o,m as s,n as c,o as l,p as u,r as d,s as f,t as p,u as m,v as h}from"./preferencias-DuIy_z4n.js";var g=`
<button class="a11y-launcher" type="button" data-a11y-launcher aria-label="Accesibilidad" title="Accesibilidad" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11y-panel">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="4.5" r="2" />
    <path d="M4.5 9h15M12 6.5V13M8.5 21 12 13l3.5 8" />
  </svg>
</button>
<div class="a11y-panel" id="a11y-panel" data-a11y-panel role="dialog" aria-label="Accesibilidad" tabindex="-1" hidden>
  <div class="a11y-head">
    <div>
      <p class="a11y-kicker">Accesibilidad</p>
      <p class="a11y-title">Ajusta la página a tu medida</p>
    </div>
    <button class="a11y-close" type="button" data-a11y-cerrar aria-label="Cerrar accesibilidad">×</button>
  </div>

  <div class="a11y-read">
    <div class="a11y-row-head">
      <span>Lectura por voz</span>
      <span class="a11y-tag" data-a11y-soporte>ES</span>
    </div>
    <button class="a11y-primary" type="button" data-a11y-leer>Leer la página</button>
    <div class="a11y-inline" data-a11y-controles hidden>
      <button type="button" data-a11y-pausar>Pausar</button>
      <button type="button" data-a11y-detener>Detener</button>
    </div>
    <div class="a11y-inline" data-a11y-parrafos hidden>
      <button type="button" data-a11y-siguiente>Párrafo siguiente</button>
    </div>
    <p class="a11y-status" data-a11y-estado aria-live="polite">Escucha el contenido de esta página.</p>
    <label class="a11y-field" for="a11y-velocidad">
      <span>Velocidad</span>
      <select id="a11y-velocidad" data-a11y-velocidad aria-label="Velocidad de lectura">
        <option value="0.85">Lenta</option>
        <option value="1">Normal</option>
        <option value="1.2">Rápida</option>
      </select>
    </label>
    <label class="a11y-field" for="a11y-voz">
      <span>Voz</span>
      <select id="a11y-voz" data-a11y-voz aria-label="Voz de lectura">
        <option value="">Voz del sistema</option>
      </select>
    </label>
  </div>

  <div class="a11y-group">
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-solo>
      <span>Leer solo lo seleccionado</span><i aria-hidden="true"></i>
    </button>
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-contraste>
      <span>Alto contraste</span><i aria-hidden="true"></i>
    </button>
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-enlaces>
      <span>Subrayar enlaces</span><i aria-hidden="true"></i>
    </button>
    <button class="a11y-switch" type="button" role="switch" aria-checked="false" data-a11y-movimiento>
      <span>Reducir movimiento</span><i aria-hidden="true"></i>
    </button>
  </div>

  <div class="a11y-size">
    <div class="a11y-row-head">
      <span>Tamaño del texto</span>
    </div>
    <div class="a11y-size-buttons">
      <button type="button" data-a11y-escala-opcion="100" aria-pressed="true" aria-label="Tamaño de texto 100 por ciento">100%</button>
      <button type="button" data-a11y-escala-opcion="112" aria-pressed="false" aria-label="Tamaño de texto 112 por ciento">112%</button>
      <button type="button" data-a11y-escala-opcion="125" aria-pressed="false" aria-label="Tamaño de texto 125 por ciento">125%</button>
      <button type="button" data-a11y-escala-opcion="140" aria-pressed="false" aria-label="Tamaño de texto 140 por ciento">140%</button>
    </div>
  </div>

  <button class="a11y-reset" type="button" data-a11y-reset>Restablecer ajustes</button>
  <p class="a11y-note">Con “Leer solo lo seleccionado”, al seleccionar texto se lee automáticamente. Los ajustes se guardan en este navegador.</p>
</div>
<div class="a11y-toast" data-a11y-toast role="status" aria-live="polite" hidden>
  <span aria-hidden="true">✓</span> Ajustes restablecidos.
</div>
`;function _(){if(document.querySelector(`.a11y`))return;let _=document.createElement(`div`);_.className=`a11y`,_.setAttribute(`data-a11y-ignorar`,``),_.innerHTML=g,document.body.append(_);let v=e=>{let t=_.querySelector(e);if(!t)throw Error(`Falta el elemento ${e} de accesibilidad`);return t},y=v(`[data-a11y-launcher]`),b=v(`[data-a11y-panel]`),x=v(`[data-a11y-cerrar]`),S=v(`[data-a11y-leer]`),C=v(`[data-a11y-pausar]`),w=v(`[data-a11y-detener]`),T=v(`[data-a11y-siguiente]`),E=v(`[data-a11y-estado]`),D=v(`[data-a11y-soporte]`),O=v(`[data-a11y-velocidad]`),k=v(`[data-a11y-voz]`),A=v(`[data-a11y-controles]`),j=v(`[data-a11y-parrafos]`),M=v(`[data-a11y-solo]`),N=v(`[data-a11y-contraste]`),P=v(`[data-a11y-enlaces]`),F=v(`[data-a11y-movimiento]`),I=Array.from(_.querySelectorAll(`[data-a11y-escala-opcion]`)),L=v(`[data-a11y-reset]`),R=v(`[data-a11y-toast]`),z=!1,B=null,V,H=()=>{b.hidden=!z,y.setAttribute(`aria-expanded`,String(z))},U=()=>{z=!0,H(),b.focus({preventScroll:!0})},W=()=>{z=!1,H(),i(),y.focus({preventScroll:!0})},G=(e,t)=>{e.setAttribute(`aria-checked`,String(t))},K=e=>{f()!==`inactivo`&&l(),t({...n(),...e})},q=t=>{let r=t!==`inactivo`,i=n();A.hidden=!r,j.hidden=!r||i.soloSeleccion,S.disabled=!e(),D.textContent=e()?`ES`:`No disponible`,S.textContent=r?`Detener lectura`:i.soloSeleccion?`Leer selección`:`Leer la página`,C.textContent=t===`pausado`?`Reanudar`:`Pausar`,E.textContent=e()?B||(t===`leyendo`?`Leyendo la página…`:t===`pausado`?`Lectura en pausa.`:i.soloSeleccion?`Selecciona un texto y pulsa Leer selección.`:`Escucha el contenido de esta página.`):`Este navegador no puede leer en voz alta.`},J=()=>{let e=n();G(M,e.soloSeleccion),G(N,e.contraste),G(P,e.subrayarEnlaces),G(F,e.reducirMovimiento),I.forEach(t=>{let n=Number(t.dataset.a11yEscalaOpcion)===e.escalaTexto;t.classList.toggle(`is-active`,n),t.setAttribute(`aria-pressed`,String(n))}),O.value=String(e.velocidadVoz),k.value=e.vozURI,q(f())},Y=()=>{let e=n(),t=h();k.replaceChildren();let r=document.createElement(`option`);r.value=``,r.textContent=`Voz del sistema`,k.append(r);for(let e of t){let t=document.createElement(`option`);t.value=e.uri,t.textContent=`${e.nombre} (${e.idioma})`,k.append(t)}k.value=e.vozURI};y.addEventListener(`click`,()=>{z?W():U()}),x.addEventListener(`click`,W),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&z&&W()}),document.addEventListener(`pointerdown`,e=>{z&&e.target instanceof Node&&!_.contains(e.target)&&(z=!1,H())}),M.addEventListener(`click`,()=>{let e=n();B=null,K({soloSeleccion:!e.soloSeleccion})}),N.addEventListener(`click`,()=>{let e=n();t({...e,contraste:!e.contraste})}),P.addEventListener(`click`,()=>{let e=n();t({...e,subrayarEnlaces:!e.subrayarEnlaces})}),F.addEventListener(`click`,()=>{let e=n();t({...e,reducirMovimiento:!e.reducirMovimiento})}),I.forEach(e=>{e.addEventListener(`click`,()=>{let r=Number(e.dataset.a11yEscalaOpcion);p.includes(r)&&t({...n(),escalaTexto:r})})}),L.addEventListener(`click`,()=>{B=null,l(),t(u()),Y(),R.hidden=!1,V!==void 0&&window.clearTimeout(V),V=window.setTimeout(()=>{R.hidden=!0},3500)}),O.addEventListener(`change`,()=>{K({velocidadVoz:Number(O.value)})}),k.addEventListener(`change`,()=>{K({vozURI:k.value})}),S.addEventListener(`pointerdown`,e=>e.preventDefault()),S.addEventListener(`click`,()=>{let e=n();if(f()!==`inactivo`){l();return}B=null,!m({velocidad:e.velocidadVoz,vozURI:e.vozURI,soloSeleccion:e.soloSeleccion})&&e.soloSeleccion&&(B=`Selecciona un texto en la página y vuelve a intentarlo.`,q(f()))}),C.addEventListener(`click`,()=>{f()===`pausado`?s():r()}),w.addEventListener(`click`,()=>{l()}),T.addEventListener(`click`,()=>{B=null,a()}),document.addEventListener(c,()=>{J(),n().reducirMovimiento&&document.querySelectorAll(`video`).forEach(e=>e.pause())}),document.addEventListener(d,()=>{B=null,q(f())}),e()&&typeof window.speechSynthesis.addEventListener==`function`&&window.speechSynthesis.addEventListener(`voiceschanged`,Y),o(_),Y(),H(),J()}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,_,{once:!0}):_();