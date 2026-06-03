const API = '/api';

// ══════════════════════════════════════════════════
// AUTENTICACIÓN
// ══════════════════════════════════════════════════
const _token  = sessionStorage.getItem('museo_token');
const _rol    = sessionStorage.getItem('museo_rol');
const _nombre = sessionStorage.getItem('museo_nombre');

if (!_token) window.location.href = 'login.html';

document.addEventListener('DOMContentLoaded', () => {
    if (_rol !== 'administrador') {
        document.querySelectorAll('[onclick*="personal"]').forEach(el => {
            const section = el.closest('.sidebar-section');
            if (section) section.style.display = 'none';
        });
    }
    const header = document.querySelector('.header-title');
    if (header) {
        const userInfo = document.createElement('div');
        userInfo.style.cssText = 'font-size:.8rem; font-weight:400; margin-left:auto; display:flex; align-items:center; gap:12px;';
        userInfo.innerHTML = `
            <span>👤 ${_nombre || ''}</span>
            <button onclick="cerrarSesion()" style="background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:#fff; padding:4px 12px; border-radius:6px; cursor:pointer; font-size:.8rem;">
                Cerrar sesión
            </button>
        `;
        header.appendChild(userInfo);
    }
});

function cerrarSesion() {
    sessionStorage.removeItem('museo_token');
    sessionStorage.removeItem('museo_rol');
    sessionStorage.removeItem('museo_nombre');
    window.location.href = 'login.html';
}

// ══════════════════════════════════════════════════
// API
// ══════════════════════════════════════════════════
async function api(path, method = 'GET', body = null) {
    const token = sessionStorage.getItem('museo_token');
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    if (res.status === 401 || res.status === 403) { cerrarSesion(); return; }
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
}

// ══════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════
function toast(msg, type = 'ok') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : type === 'warn' ? ' warning' : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function formatDate(d) {
    if (!d) return '—';
    const [anio, mes, dia] = d.split('-');
    return `${dia}/${mes}/${anio}`;
}

function badgeEstado(estado) {
    const map = {
        'estado_regular':         ['badge-regular',   'Estado Regular'],
        'revision_pendiente':     ['badge-pendiente', 'Revisión Pendiente'],
        'revision_y_tratamiento': ['badge-revision',  'Revisión y Tratamiento'],
        'tratamiento_urgente':    ['badge-urgente',   'Tratamiento Urgente'],
        'en_proceso':             ['badge-proceso',   'En Proceso'],
        'finalizado':             ['badge-finalizado','Finalizado'],
    };
    const [cls, label] = map[estado] || ['', estado];
    return `<span class="badge ${cls}">${label}</span>`;
}

function formData(formId) {
    const fd = new FormData(document.getElementById(formId));
    const obj = {};
    fd.forEach((v, k) => { if (v !== '') obj[k] = v; });
    return obj;
}

function navigate(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + id)?.classList.add('active');
    document.querySelector(`[onclick="navigate('${id}')"]`)?.classList.add('active');
    const loaders = {
        'obras-lista':        cargarObras,
        'deterioro-lista':    cargarDeterioro,
        'restauracion-lista': cargarRestauraciones,
        'personal-lista':     cargarPersonal,
        'obras-nueva':        () => cargarSelectores('form-obra'),
        'deterioro-reportar': () => cargarSelectores('form-deterioro'),
        'restauracion-nueva': () => cargarSelectores('form-restauracion'),
    };
    loaders[id]?.();
}

function abrirModal(id)  { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }

// ══════════════════════════════════════════════════
// PAGINACIÓN GENÉRICA
// ══════════════════════════════════════════════════
function renderPaginacion(containerId, paginaActual, totalPaginas, onCambiar) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="${containerId}-prev" onclick="(${onCambiar.toString()})(-1)">← Anterior</button>
        <span style="font-size:.85rem; color:#555">Página ${paginaActual + 1} de ${totalPaginas || 1}</span>
        <button class="btn btn-secondary btn-sm" id="${containerId}-next" onclick="(${onCambiar.toString()})(1)">Siguiente →</button>
    `;
    el.querySelector(`#${containerId}-prev`).disabled = paginaActual === 0;
    el.querySelector(`#${containerId}-next`).disabled = paginaActual >= (totalPaginas - 1);
}

// ══════════════════════════════════════════════════
// AUTOCOMPLETE
// ══════════════════════════════════════════════════
function crearAutocomplete(containerId, items, idFn, labelFn, searchFn, onSelect, placeholder = 'Buscar por ID...') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="autocomplete-wrapper">
            <input type="text" class="autocomplete-input" placeholder="${placeholder}" autocomplete="off">
            <input type="hidden" class="autocomplete-value">
            <div class="autocomplete-dropdown" style="display:none"></div>
            <div class="autocomplete-selected" style="display:none">
                <span class="autocomplete-selected-label"></span>
                <button type="button" class="autocomplete-clear" title="Limpiar">×</button>
            </div>
        </div>
    `;

    const input      = container.querySelector('.autocomplete-input');
    const hidden     = container.querySelector('.autocomplete-value');
    const dropdown   = container.querySelector('.autocomplete-dropdown');
    const selectedEl = container.querySelector('.autocomplete-selected');
    const labelEl    = container.querySelector('.autocomplete-selected-label');
    const clearBtn   = container.querySelector('.autocomplete-clear');

    function mostrarDropdown(texto) {
        const filtrados = texto.length === 0
            ? items.slice(0, 10)
            : items.filter(i => searchFn(i, texto)).slice(0, 10);

        if (!filtrados.length) {
            dropdown.innerHTML = '<div class="autocomplete-option autocomplete-empty">Sin resultados</div>';
        } else {
            dropdown.innerHTML = filtrados.map(i => `
                <div class="autocomplete-option" data-id="${idFn(i)}">
                    <span class="autocomplete-option-id">#${idFn(i)}</span>
                    <span class="autocomplete-option-label">${labelFn(i)}</span>
                </div>
            `).join('');
            dropdown.querySelectorAll('.autocomplete-option:not(.autocomplete-empty)').forEach(opt => {
                opt.addEventListener('click', () => {
                    const item = items.find(i => String(idFn(i)) === String(opt.dataset.id));
                    seleccionar(item);
                });
            });
        }
        dropdown.style.display = 'block';
    }

    function seleccionar(item) {
        if (!item) return;
        hidden.value = idFn(item);
        labelEl.textContent = `#${idFn(item)} — ${labelFn(item)}`;
        input.style.display = 'none';
        selectedEl.style.display = 'flex';
        dropdown.style.display = 'none';
        if (onSelect) onSelect(item);
    }

    function limpiar() {
        hidden.value = '';
        input.value  = '';
        input.style.display      = 'block';
        selectedEl.style.display = 'none';
        dropdown.style.display   = 'none';
        input.focus();
        if (onSelect) onSelect(null);
    }

    container.setValor = (id) => {
        if (!id) { limpiar(); return; }
        const item = items.find(i => String(idFn(i)) === String(id));
        if (item) seleccionar(item);
    };
    container.getValor = () => hidden.value;

    input.addEventListener('input', () => mostrarDropdown(input.value.trim()));
    input.addEventListener('focus', () => mostrarDropdown(input.value.trim()));
    clearBtn.addEventListener('click', limpiar);
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) dropdown.style.display = 'none';
    });
}

function iniciarAutocompleteObra(containerId) {
    crearAutocomplete(containerId, _obras, o => o.id, o => o.titulo,
        (o, txt) => String(o.id).includes(txt) || o.titulo.toLowerCase().includes(txt.toLowerCase()),
        null, 'Buscar por ID de obra...');
}

function iniciarAutocompleteDeteriorado(containerId) {
    crearAutocomplete(containerId, _deterioradas, d => d.id, d => d.obra?.titulo || '',
        (d, txt) => String(d.id).includes(txt) || (d.obra?.titulo || '').toLowerCase().includes(txt.toLowerCase()),
        null, 'Buscar por código de deterioro...');
}

// ══════════════════════════════════════════════════
// CATÁLOGOS Y SELECTORES
// ══════════════════════════════════════════════════
let _tecnicas = [], _tipos = [], _personal = [], _obras = [], _deterioradas = [];

async function cargarCatalogos() {
    try {
        const [tec, tip, per, obraPag, det] = await Promise.all([
            api('/catalogos/tecnicas'),
            api('/catalogos/tipos-obras'),
            api('/personal'),
            api('/obras?page=0&size=9999'),
            api('/obras-deterioradas?page=0&size=9999'),
        ]);
        _tecnicas    = tec;
        _tipos       = tip;
        _personal    = per;
        _obras       = obraPag.content;
        _deterioradas= det.content;
    } catch (e) { console.warn('Catálogos:', e.message); }
}

function poblarSelect(sel, items, valFn, labelFn, placeholder = '') {
    if (!sel) return;
    sel.innerHTML = placeholder ? `<option value="">${placeholder}</option>` : '';
    items.forEach(i => {
        const o = document.createElement('option');
        o.value = valFn(i);
        o.textContent = labelFn(i);
        sel.appendChild(o);
    });
}

async function cargarSelectores(formId) {
    const f = document.getElementById(formId);
    if (!f) return;

    // Inicializar autocomplete inmediatamente con datos en memoria
    if (formId === 'form-deterioro')    iniciarAutocompleteObra('ac-obra-deterioro');
    if (formId === 'form-restauracion') iniciarAutocompleteDeteriorado('ac-deterioro-restauracion');

    try {
        const [tec, tip, per, obraPag, det] = await Promise.allSettled([
            api('/catalogos/tecnicas'),
            api('/catalogos/tipos-obras'),
            api('/personal'),
            api('/obras?page=0&size=9999'),
            api('/obras-deterioradas?page=0&size=9999'),
        ]);
        _tecnicas    = tec.status    === 'fulfilled' ? tec.value             : _tecnicas;
        _tipos       = tip.status    === 'fulfilled' ? tip.value             : _tipos;
        _personal    = per.status    === 'fulfilled' ? per.value             : _personal;
        _obras       = obraPag.status=== 'fulfilled' ? obraPag.value.content : _obras;
        _deterioradas= det.status    === 'fulfilled' ? det.value.content     : _deterioradas;
    } catch (e) { toast('Error cargando datos del formulario', 'error'); return; }

    poblarSelect(f.querySelector('[name=idTecnica]'),       _tecnicas, t => t.id, t => t.nombre,                        'Seleccionar técnica...');
    poblarSelect(f.querySelector('[name=idTipo]'),          _tipos,    t => t.id, t => `${t.tipoObra} (${t.material})`, 'Seleccionar tipo...');
    poblarSelect(f.querySelector('[name=idPersonal]'),      _personal, p => p.id, p => `${p.nombre} ${p.apellido}`,     'Sin asignar');
    poblarSelect(f.querySelector('[name=idPersonalMuseo]'), _personal, p => p.id, p => `${p.nombre} ${p.apellido}`,     'Sin asignar');

    // Reinicializar autocomplete con datos actualizados
    if (formId === 'form-deterioro')    iniciarAutocompleteObra('ac-obra-deterioro');
    if (formId === 'form-restauracion') iniciarAutocompleteDeteriorado('ac-deterioro-restauracion');
}

function cargarSelectoresFiltros() {
    poblarSelect(document.getElementById('b-tecnica'),         _tecnicas, t => t.id, t => t.nombre,                        'Todas');
    poblarSelect(document.getElementById('b-tipo'),            _tipos,    t => t.id, t => `${t.tipoObra} (${t.material})`, 'Todos');
    poblarSelect(document.getElementById('filtro-tecnica-det'),_tecnicas, t => t.id, t => t.nombre,                        'Todas');
}

// ══════════════════════════════════════════════════
// OBRAS
// ══════════════════════════════════════════════════
let _paginaObras = 0, _totalObras = 0, _filtroTitulo = '', _filtroAutor = '';

async function cargarObras() {
    const tb = document.getElementById('tabla-obras');
    tb.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
    try {
        const params = new URLSearchParams({ page: _paginaObras, size: 20 });
        if (_filtroTitulo) params.set('titulo', _filtroTitulo);
        if (_filtroAutor)  params.set('autor',  _filtroAutor);
        const res = await api('/obras?' + params);
        _totalObras = res.totalPages;
        actualizarPaginacionObras();
        renderTablaObras(res.content, 'tabla-obras', 8);
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="loading">${e.message}</td></tr>`; }
}

function actualizarPaginacionObras() {
    document.getElementById('info-pagina').textContent = `Página ${_paginaObras + 1} de ${_totalObras || 1}`;
    document.getElementById('btn-prev').disabled = _paginaObras === 0;
    document.getElementById('btn-next').disabled = _paginaObras >= _totalObras - 1;
}

function cambiarPagina(delta) {
    const nueva = _paginaObras + delta;
    if (nueva < 0 || nueva >= _totalObras) return;
    _paginaObras = nueva;
    cargarObras();
}

function renderTablaObras(obras, tbId, cols) {
    const tb = document.getElementById(tbId);
    if (!obras.length) { tb.innerHTML = `<tr><td colspan="${cols}" class="loading">Sin resultados</td></tr>`; return; }
    tb.innerHTML = obras.map(o => `
        <tr>
            <td><strong>#${o.id}</strong></td>
            <td>${o.titulo}</td>
            <td>${o.autor || '—'}</td>
            <td>${o.fechaCreacion ? o.fechaCreacion.split('-')[0] : '—'}</td>
            <td>${o.tecnica?.nombre || '—'}</td>
            <td>${o.ubicacion || '—'}</td>
            <td>${formatDate(o.fechaUltimaRevision)}</td>
            <td>
                <div class="acciones-btns">
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="verDetalleObra(${o.id})" title="Ver detalle">👁</button>
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="editarObra(${o.id})" title="Editar">✏️</button>
                    ${o.linkDrive ? `<a href="${o.linkDrive}" target="_blank" class="btn btn-secondary btn-sm btn-icon" title="Drive">📎</a>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function buscarObras() {
    _filtroTitulo = document.getElementById('f-titulo')?.value || '';
    _filtroAutor  = document.getElementById('f-autor')?.value  || '';
    _paginaObras  = 0;
    cargarObras();
}

function resetObras() {
    _filtroTitulo = ''; _filtroAutor = ''; _paginaObras = 0;
    document.getElementById('f-titulo').value = '';
    document.getElementById('f-autor').value  = '';
    cargarObras();
}

async function submitObra(e) {
    e.preventDefault();
    const data = formData('form-obra');
    if (data.id)        data.id        = parseInt(data.id);
    if (data.idTipo)    data.idTipo    = parseInt(data.idTipo);
    if (data.idTecnica) data.idTecnica = parseInt(data.idTecnica);
    try {
        await api('/obras', 'POST', data);
        toast('✅ Obra registrada exitosamente');
        e.target.reset();
        await cargarCatalogos();
        navigate('obras-lista');
    } catch (e) { toast(e.message, 'error'); }
}

async function editarObra(id) {
    try {
        const obra = await api('/obras/' + id);
        const f = document.getElementById('form-editar-obra');
        f.querySelector('[name=id]').value                   = obra.id;
        f.querySelector('[name=titulo]').value               = obra.titulo              || '';
        f.querySelector('[name=autor]').value                = obra.autor               || '';
        f.querySelector('[name=fechaCreacion]').value        = obra.fechaCreacion       || '';
        f.querySelector('[name=fechaUltimaRevision]').value  = obra.fechaUltimaRevision || '';
        f.querySelector('[name=ubicacion]').value            = obra.ubicacion           || '';
        f.querySelector('[name=dimensiones]').value          = obra.dimensiones         || '';
        f.querySelector('[name=integridad]').value           = obra.integridad          || '';
        f.querySelector('[name=asociacionHistorica]').value  = obra.asociacionHistorica || '';
        f.querySelector('[name=lugarEjecucion]').value       = obra.lugarEjecucion      || '';
        f.querySelector('[name=restricciones]').value        = obra.restricciones       || '';
        f.querySelector('[name=anotaciones]').value          = obra.anotaciones         || '';
        f.querySelector('[name=linkDrive]').value            = obra.linkDrive           || '';
        poblarSelect(f.querySelector('[name=idTipo]'),    _tipos,    t => t.id, t => `${t.tipoObra} (${t.material})`);
        poblarSelect(f.querySelector('[name=idTecnica]'), _tecnicas, t => t.id, t => t.nombre);
        if (obra.tipo)    f.querySelector('[name=idTipo]').value    = obra.tipo.id;
        if (obra.tecnica) f.querySelector('[name=idTecnica]').value = obra.tecnica.id;
        abrirModal('modal-obra');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitEditarObra(e) {
    e.preventDefault();
    const data = formData('form-editar-obra');
    const id = data.id; delete data.id;
    if (data.idTipo)    data.idTipo    = parseInt(data.idTipo);
    if (data.idTecnica) data.idTecnica = parseInt(data.idTecnica);
    try {
        await api('/obras/' + id, 'PUT', data);
        toast('✅ Obra actualizada');
        cerrarModal('modal-obra');
        cargarObras();
    } catch (err) { toast(err.message, 'error'); }
}

// ══════════════════════════════════════════════════
// BÚSQUEDA AVANZADA (con paginación)
// ══════════════════════════════════════════════════
let _paginaBusqueda = 0, _totalBusqueda = 0;
let _filtrosBusqueda = {};

async function ejecutarBusqueda() {
    _paginaBusqueda = 0;
    _filtrosBusqueda = {
        titulo:    document.getElementById('b-titulo').value,
        autor:     document.getElementById('b-autor').value,
        anio:      document.getElementById('b-anio').value,
        idTecnica: document.getElementById('b-tecnica').value,
        idTipo:    document.getElementById('b-tipo').value,
    };
    await cargarPaginaBusqueda();
}

async function cargarPaginaBusqueda() {
    const params = new URLSearchParams({ page: _paginaBusqueda, size: 20 });
    const f = _filtrosBusqueda;
    if (f.titulo)    params.set('titulo',    f.titulo);
    if (f.autor)     params.set('autor',     f.autor);
    if (f.anio)      params.set('anio',      f.anio);
    if (f.idTecnica) params.set('idTecnica', f.idTecnica);
    if (f.idTipo)    params.set('idTipo',    f.idTipo);
    try {
        const res = await api('/obras/buscar?' + params);
        _totalBusqueda = res.totalPages;
        document.getElementById('resultados-busqueda').style.display = 'block';
        const tb = document.getElementById('tabla-busqueda');
        if (!res.content.length) {
            tb.innerHTML = '<tr><td colspan="6" class="loading">Sin resultados</td></tr>';
        } else {
            tb.innerHTML = res.content.map(o => `
                <tr>
                    <td>#${o.id}</td><td>${o.titulo}</td><td>${o.autor || '—'}</td>
                    <td>${o.fechaCreacion ? o.fechaCreacion.split('-')[0] : '—'}</td>
                    <td>${o.tecnica?.nombre || '—'}</td>
                    <td><button class="btn btn-secondary btn-sm" onclick="editarObra(${o.id})">✏️ Editar</button></td>
                </tr>
            `).join('');
        }
        // Paginación búsqueda
        const pag = document.getElementById('paginacion-busqueda');
        if (pag) {
            pag.style.display = 'flex';
            document.getElementById('info-pagina-busqueda').textContent =
                `Página ${_paginaBusqueda + 1} de ${_totalBusqueda || 1}`;
            document.getElementById('btn-prev-busqueda').disabled = _paginaBusqueda === 0;
            document.getElementById('btn-next-busqueda').disabled = _paginaBusqueda >= _totalBusqueda - 1;
        }
    } catch (e) { toast(e.message, 'error'); }
}

function cambiarPaginaBusqueda(delta) {
    const nueva = _paginaBusqueda + delta;
    if (nueva < 0 || nueva >= _totalBusqueda) return;
    _paginaBusqueda = nueva;
    cargarPaginaBusqueda();
}

function limpiarBusqueda() {
    ['b-titulo','b-autor','b-anio','b-tecnica','b-tipo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    _filtrosBusqueda = {};
    document.getElementById('resultados-busqueda').style.display = 'none';
}

// ══════════════════════════════════════════════════
// DETERIOROS (con paginación)
// ══════════════════════════════════════════════════
let _paginaDet = 0, _totalDet = 0;
let _filtrosDet = {};
let _modoDet = 'todos'; // 'todos' | 'filtro' | 'sinRestaurar'

async function cargarDeterioro() {
    _paginaDet = 0; _modoDet = 'todos'; _filtrosDet = {};
    await cargarPaginaDeterioro();
}

async function cargarPaginaDeterioro() {
    const tb = document.getElementById('tabla-deterioro');
    tb.innerHTML = '<tr><td colspan="7" class="loading">Cargando...</td></tr>';
    try {
        let res;
        const f = _filtrosDet;

        if (_modoDet === 'sinRestaurar') {
            res = await api(`/obras-deterioradas/sin-restauracion-finalizada?page=${_paginaDet}&size=20`);
        } else if (_modoDet === 'filtro') {
            // ✅ Usar el endpoint correcto para filtros
            const params = new URLSearchParams({ page: _paginaDet, size: 20 });
            if (f.estado)    params.set('estado',    f.estado);
            if (f.autor)     params.set('autor',     f.autor);
            if (f.idTecnica) params.set('idTecnica', f.idTecnica);
            if (f.anio)      params.set('anio',      f.anio);
            res = await api('/obras-deterioradas/filtrar?' + params);
        } else {
            // Modo 'todos' — sin filtros
            res = await api(`/obras-deterioradas?page=${_paginaDet}&size=20`);
        }

        _totalDet = res.totalPages;
        renderDeterioro(res.content);
        actualizarPaginacionDet();
    } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="loading">${e.message}</td></tr>`; }
}

function actualizarPaginacionDet() {
    const pag = document.getElementById('paginacion-deterioro');
    if (!pag) return;
    document.getElementById('info-pagina-det').textContent = `Página ${_paginaDet + 1} de ${_totalDet || 1}`;
    document.getElementById('btn-prev-det').disabled = _paginaDet === 0;
    document.getElementById('btn-next-det').disabled = _paginaDet >= _totalDet - 1;
}

function cambiarPaginaDet(delta) {
    const nueva = _paginaDet + delta;
    if (nueva < 0 || nueva >= _totalDet) return;
    _paginaDet = nueva;
    cargarPaginaDeterioro();
}

function renderDeterioro(list) {
    const tb = document.getElementById('tabla-deterioro');
    if (!list.length) { tb.innerHTML = '<tr><td colspan="7" class="loading">Sin registros</td></tr>'; return; }
    tb.innerHTML = list.map(d => `
        <tr>
            <td><strong>Cód. ${d.id}</strong></td>
            <td>${d.obra?.titulo || '—'}</td>
            <td>${badgeEstado(d.estado)}</td>
            <td>${formatDate(d.fechaIdentificacion)}</td>
            <td>${d.personal ? d.personal.nombre + ' ' + d.personal.apellido : '—'}</td>
            <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="${d.descripcion}">${d.descripcion}</td>
            <td>
                <div class="acciones-btns">
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="verDetalleDeteriorado(${d.id})" title="Ver detalle">👁</button>
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="editarDeteriorado(${d.id})" title="Editar">✏️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function filtrarDeterioro() {
    const sinRestaurar = document.getElementById('filtro-sin-restaurar').checked;
    _paginaDet = 0;
    if (sinRestaurar) {
        _modoDet = 'sinRestaurar';
    } else {
        _modoDet = 'filtro';
        _filtrosDet = {
            estado:    document.getElementById('filtro-estado-det').value,
            autor:     document.getElementById('filtro-autor-det').value,
            idTecnica: document.getElementById('filtro-tecnica-det').value,
            anio:      document.getElementById('filtro-anio-det').value,
        };
    }
    await cargarPaginaDeterioro();
}

async function submitDeteriorado(e) {
    e.preventDefault();
    const data = formData('form-deterioro');
    const acObra = document.getElementById('ac-obra-deterioro');
    const idObra = acObra ? acObra.getValor() : null;
    if (!idObra) { toast('Debes seleccionar una obra válida', 'error'); return; }
    data.idObra = parseInt(idObra);
    if (data.idPersonal) data.idPersonal = parseInt(data.idPersonal);
    else delete data.idPersonal;
    try {
        await api('/obras-deterioradas', 'POST', data);
        toast('✅ Deterioro reportado exitosamente');
        e.target.reset();
        iniciarAutocompleteObra('ac-obra-deterioro');
        await cargarCatalogos();
        navigate('deterioro-lista');
    } catch (e) { toast(e.message, 'error'); }
}

async function editarDeteriorado(id) {
    try {
        const d = await api('/obras-deterioradas/' + id);
        const f = document.getElementById('form-editar-deterioro');
        f.querySelector('[name=id]').value                   = d.id;
        f.querySelector('[name=descripcion]').value          = d.descripcion        || '';
        f.querySelector('[name=estado]').value               = d.estado             || '';
        f.querySelector('[name=fechaIdentificacion]').value  = d.fechaIdentificacion|| '';
        poblarSelect(f.querySelector('[name=idPersonal]'), _personal, p => p.id, p => `${p.nombre} ${p.apellido}`, 'Sin asignar');
        if (d.personal) f.querySelector('[name=idPersonal]').value = d.personal.id;
        iniciarAutocompleteObra('ac-obra-edit-deterioro');
        if (d.obra) setTimeout(() => document.getElementById('ac-obra-edit-deterioro')?.setValor(d.obra.id), 50);
        abrirModal('modal-deterioro');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitEditarDeteriorado(e) {
    e.preventDefault();
    const data = formData('form-editar-deterioro');
    const id = data.id; delete data.id;
    const acObra = document.getElementById('ac-obra-edit-deterioro');
    const idObra = acObra ? acObra.getValor() : null;
    if (!idObra) { toast('Debes seleccionar una obra válida', 'error'); return; }
    data.idObra = parseInt(idObra);
    if (data.idPersonal) data.idPersonal = parseInt(data.idPersonal);
    else delete data.idPersonal;
    try {
        await api('/obras-deterioradas/' + id, 'PUT', data);
        toast('✅ Deterioro actualizado');
        cerrarModal('modal-deterioro');
        await cargarCatalogos();
        cargarPaginaDeterioro();
    } catch (err) { toast(err.message, 'error'); }
}

// ══════════════════════════════════════════════════
// RESTAURACIONES (con paginación)
// ══════════════════════════════════════════════════
let _paginaRest = 0, _totalRest = 0;
let _filtrosRest = {};
let _modoRest = 'todos'; // 'todos' | 'fecha' | 'codObra'

async function cargarRestauraciones() {
    _paginaRest = 0; _modoRest = 'todos'; _filtrosRest = {};
    await cargarPaginaRestauraciones();
}

async function cargarPaginaRestauraciones() {
    const tb = document.getElementById('tabla-restauraciones');
    tb.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
    try {
        let res;
        const f = _filtrosRest;
        if (_modoRest === 'codObra') {
            res = await api(`/restauraciones/por-obra-deteriorada/${f.codObra}?page=${_paginaRest}&size=20`);
        } else if (_modoRest === 'fecha') {
            res = await api(`/restauraciones/filtrar-fecha?desde=${f.desde}&hasta=${f.hasta}&page=${_paginaRest}&size=20`);
        } else {
            res = await api(`/restauraciones?page=${_paginaRest}&size=20`);
        }
        _totalRest = res.totalPages;
        renderRestauraciones(res.content);
        actualizarPaginacionRest();
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="loading">${e.message}</td></tr>`; }
}

function actualizarPaginacionRest() {
    const pag = document.getElementById('paginacion-restauraciones');
    if (!pag) return;
    document.getElementById('info-pagina-rest').textContent = `Página ${_paginaRest + 1} de ${_totalRest || 1}`;
    document.getElementById('btn-prev-rest').disabled = _paginaRest === 0;
    document.getElementById('btn-next-rest').disabled = _paginaRest >= _totalRest - 1;
}

function cambiarPaginaRest(delta) {
    const nueva = _paginaRest + delta;
    if (nueva < 0 || nueva >= _totalRest) return;
    _paginaRest = nueva;
    cargarPaginaRestauraciones();
}

function renderRestauraciones(list) {
    const tb = document.getElementById('tabla-restauraciones');
    if (!list.length) { tb.innerHTML = '<tr><td colspan="8" class="loading">Sin registros</td></tr>'; return; }
    tb.innerHTML = list.map(r => `
        <tr>
            <td><strong>#${r.id}</strong></td>
            <td>Cód. ${r.obraDeteriorada?.id || '—'} — ${r.obraDeteriorada?.obra?.titulo || ''}</td>
            <td>${r.tipoRestauracion === 'intensivo' ? '🔴 Intensivo' : '🟡 Mantenimiento'}</td>
            <td>${badgeEstado(r.estado)}</td>
            <td>${formatDate(r.fechaRestauracion)}</td>
            <td>${r.responsable || '—'}</td>
            <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="${r.observaciones || ''}">${r.observaciones || '—'}</td>
            <td>
                <div class="acciones-btns">
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="verDetalleRestauracion(${r.id})" title="Ver detalle">👁</button>
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="editarRestauracion(${r.id})" title="Editar">✏️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function filtrarRestauraciones() {
    const desde  = document.getElementById('filtro-desde').value;
    const hasta  = document.getElementById('filtro-hasta').value;
    const codOb  = document.getElementById('filtro-cod-obra').value;
    _paginaRest  = 0;
    if (codOb) {
        _modoRest = 'codObra'; _filtrosRest = { codObra: codOb };
    } else if (desde && hasta) {
        _modoRest = 'fecha'; _filtrosRest = { desde, hasta };
    } else {
        _modoRest = 'todos'; _filtrosRest = {};
    }
    await cargarPaginaRestauraciones();
}

async function submitRestauracion(e) {
    e.preventDefault();
    const data = formData('form-restauracion');
    const acDet = document.getElementById('ac-deterioro-restauracion');
    const idDet = acDet ? acDet.getValor() : null;
    if (!idDet) { toast('Debes seleccionar una obra deteriorada válida', 'error'); return; }
    data.idObraDeteriorada = parseInt(idDet);
    if (data.idPersonalMuseo) data.idPersonalMuseo = parseInt(data.idPersonalMuseo);
    else delete data.idPersonalMuseo;
    try {
        await api('/restauraciones', 'POST', data);
        toast('✅ Restauración registrada');
        e.target.reset();
        iniciarAutocompleteDeteriorado('ac-deterioro-restauracion');
        navigate('restauracion-lista');
    } catch (e) { toast(e.message, 'error'); }
}

async function editarRestauracion(id) {
    try {
        const r = await api('/restauraciones/' + id);
        const f = document.getElementById('form-editar-restauracion');
        f.querySelector('[name=id]').value                = r.id;
        f.querySelector('[name=tipoRestauracion]').value  = r.tipoRestauracion  || '';
        f.querySelector('[name=estado]').value            = r.estado            || '';
        f.querySelector('[name=fechaRestauracion]').value = r.fechaRestauracion || '';
        f.querySelector('[name=responsable]').value       = r.responsable       || '';
        f.querySelector('[name=observaciones]').value     = r.observaciones     || '';
        poblarSelect(f.querySelector('[name=idPersonalMuseo]'), _personal, p => p.id, p => `${p.nombre} ${p.apellido}`, 'Sin asignar');
        if (r.personalMuseo) f.querySelector('[name=idPersonalMuseo]').value = r.personalMuseo.id;
        iniciarAutocompleteDeteriorado('ac-deterioro-edit-restauracion');
        if (r.obraDeteriorada) setTimeout(() => document.getElementById('ac-deterioro-edit-restauracion')?.setValor(r.obraDeteriorada.id), 50);
        abrirModal('modal-restauracion');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitEditarRestauracion(e) {
    e.preventDefault();
    const data = formData('form-editar-restauracion');
    const id = data.id; delete data.id;
    const acDet = document.getElementById('ac-deterioro-edit-restauracion');
    const idDet = acDet ? acDet.getValor() : null;
    if (!idDet) { toast('Debes seleccionar una obra deteriorada válida', 'error'); return; }
    data.idObraDeteriorada = parseInt(idDet);
    if (data.idPersonalMuseo) data.idPersonalMuseo = parseInt(data.idPersonalMuseo);
    else delete data.idPersonalMuseo;
    try {
        await api('/restauraciones/' + id, 'PUT', data);
        toast('✅ Restauración actualizada');
        cerrarModal('modal-restauracion');
        cargarPaginaRestauraciones();
    } catch (err) { toast(err.message, 'error'); }
}

// ══════════════════════════════════════════════════
// PERSONAL
// ══════════════════════════════════════════════════
async function cargarPersonal() {
    const tb = document.getElementById('tabla-personal');
    tb.innerHTML = '<tr><td colspan="6" class="loading">Cargando...</td></tr>';
    try {
        const list = await api('/personal');
        if (!list.length) { tb.innerHTML = '<tr><td colspan="6" class="loading">Sin personal registrado</td></tr>'; return; }
        tb.innerHTML = list.map(p => `
            <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.nombre}</td><td>${p.apellido}</td>
                <td>${p.email}</td><td>${p.celular}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="editarPersonal(${p.id})">✏️ Editar</button></td>
            </tr>
        `).join('');
    } catch (e) { tb.innerHTML = `<tr><td colspan="6" class="loading">${e.message}</td></tr>`; }
}

function abrirModalPersonal() {
    document.getElementById('modal-personal-titulo').textContent = '➕ Añadir Personal';
    document.getElementById('form-personal').reset();
    document.querySelector('[name=modo]').value = 'crear';
    document.getElementById('campo-cedula').style.display = 'flex';
    document.querySelector('[name=id]').disabled = false;
    document.getElementById('hint-password') && (document.getElementById('hint-password').style.display = 'none');
    document.getElementById('label-password') && (document.getElementById('label-password').textContent = 'Contraseña *');
    abrirModal('modal-personal');
}

async function editarPersonal(id) {
    try {
        const p = await api('/personal/' + id);
        const f = document.getElementById('form-personal');
        document.getElementById('modal-personal-titulo').textContent = '✏️ Editar Personal';
        f.querySelector('[name=_id_viejo]').value = p.id;
        f.querySelector('[name=modo]').value      = 'editar';
        f.querySelector('[name=id]').value        = p.id;
        f.querySelector('[name=nombre]').value    = p.nombre;
        f.querySelector('[name=apellido]').value  = p.apellido;
        f.querySelector('[name=email]').value     = p.email;
        f.querySelector('[name=celular]').value   = p.celular;
        if (p.rol) f.querySelector('[name=rol]').value = p.rol;
        document.getElementById('hint-password') && (document.getElementById('hint-password').style.display = 'block');
        document.getElementById('label-password') && (document.getElementById('label-password').textContent = 'Nueva Contraseña');
        document.getElementById('campo-cedula').style.display = 'flex';
        abrirModal('modal-personal');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitPersonal(e) {
    e.preventDefault();
    const data = formData('form-personal');
    const modo = data.modo; delete data.modo;
    if (modo === 'crear' && data.password !== data.confirmarPassword) {
        toast('Las contraseñas no coinciden', 'error'); return;
    }
    try {
        if (modo === 'crear') {
            data.id = parseInt(data.id);
            await api('/personal', 'POST', data);
            toast('✅ Personal registrado');
        } else {
            const idViejo = parseInt(document.querySelector('#form-personal [name=_id_viejo]').value);
            data.id = parseInt(data.id);
            if (!data.password) { delete data.password; delete data.confirmarPassword; }
            await api('/personal/' + idViejo, 'PUT', data);
            toast('✅ Personal actualizado');
        }
        cerrarModal('modal-personal');
        cargarPersonal();
        await cargarCatalogos();
    } catch (err) { toast(err.message, 'error'); }
}

// ══════════════════════════════════════════════════
// DETALLES
// ══════════════════════════════════════════════════
async function verDetalleObra(id) {
    try {
        const o = await api('/obras/' + id);
        document.getElementById('detalle-obra-body').innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-campo full"><span class="detalle-label">Título</span><span class="detalle-valor">${o.titulo || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Autor</span><span class="detalle-valor">${o.autor || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Año de Creación</span><span class="detalle-valor">${o.fechaCreacion ? o.fechaCreacion.split('-')[0] : '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Tipo de Obra</span><span class="detalle-valor">${o.tipo ? `${o.tipo.tipoObra} (${o.tipo.material})` : '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Técnica</span><span class="detalle-valor">${o.tecnica?.nombre || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Fecha Última Revisión</span><span class="detalle-valor">${formatDate(o.fechaUltimaRevision)}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Ubicación</span><span class="detalle-valor">${o.ubicacion || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Dimensiones</span><span class="detalle-valor">${o.dimensiones || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Integridad</span><span class="detalle-valor">${o.integridad || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Asociación Histórica</span><span class="detalle-valor">${o.asociacionHistorica || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Lugar de Ejecución</span><span class="detalle-valor">${o.lugarEjecucion || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Restricciones</span><span class="detalle-valor">${o.restricciones || '—'}</span></div>
                <div class="detalle-campo full"><span class="detalle-label">Anotaciones</span><span class="detalle-valor texto-largo">${o.anotaciones || '—'}</span></div>
                <div class="detalle-campo full"><span class="detalle-label">Link Drive</span><span class="detalle-valor">${o.linkDrive ? `<a href="${o.linkDrive}" target="_blank">${o.linkDrive}</a>` : '—'}</span></div>
            </div>`;
        abrirModal('modal-detalle-obra');
    } catch (e) { toast(e.message, 'error'); }
}

async function verDetalleDeteriorado(id) {
    try {
        const d = await api('/obras-deterioradas/' + id);
        document.getElementById('detalle-deterioro-body').innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-campo"><span class="detalle-label">Código</span><span class="detalle-valor">Cód. ${d.id}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Obra</span><span class="detalle-valor">${d.obra?.titulo || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Estado</span><span class="detalle-valor">${badgeEstado(d.estado)}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Fecha Identificación</span><span class="detalle-valor">${formatDate(d.fechaIdentificacion)}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Personal que Reportó</span><span class="detalle-valor">${d.personal ? `${d.personal.nombre} ${d.personal.apellido}` : '—'}</span></div>
                <div class="detalle-campo full"><span class="detalle-label">Descripción del Deterioro</span><span class="detalle-valor texto-largo">${d.descripcion || '—'}</span></div>
            </div>`;
        abrirModal('modal-detalle-deterioro');
    } catch (e) { toast(e.message, 'error'); }
}

async function verDetalleRestauracion(id) {
    try {
        const r = await api('/restauraciones/' + id);
        document.getElementById('detalle-restauracion-body').innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-campo"><span class="detalle-label">ID</span><span class="detalle-valor">#${r.id}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Obra Deteriorada</span><span class="detalle-valor">Cód.${r.obraDeteriorada?.id || '—'} — ${r.obraDeteriorada?.obra?.titulo || ''}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Tipo de Restauración</span><span class="detalle-valor">${r.tipoRestauracion === 'intensivo' ? '🔴 Intensivo' : '🟡 Mantenimiento'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Estado</span><span class="detalle-valor">${badgeEstado(r.estado)}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Fecha Restauración</span><span class="detalle-valor">${formatDate(r.fechaRestauracion)}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Responsable</span><span class="detalle-valor">${r.responsable || '—'}</span></div>
                <div class="detalle-campo"><span class="detalle-label">Personal Museo</span><span class="detalle-valor">${r.personalMuseo ? `${r.personalMuseo.nombre} ${r.personalMuseo.apellido}` : '—'}</span></div>
                <div class="detalle-campo full"><span class="detalle-label">Observaciones</span><span class="detalle-valor texto-largo">${r.observaciones || '—'}</span></div>
            </div>`;
        abrirModal('modal-detalle-restauracion');
    } catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════
async function init() {
    cargarObras();
    await cargarCatalogos();
    cargarSelectoresFiltros();
}

init();