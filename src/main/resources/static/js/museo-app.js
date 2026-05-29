const API = '/api';

function toast(msg, type = 'ok') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : type === 'warn' ? ' warning' : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

async function api(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
}

function formatDate(d) {
    if (!d) return '—';
    const [anio, mes, dia] = d.split('-');
    return `${dia}/${mes}/${anio}`;
}

function badgeEstado(estado) {
    const map = {
        'estado_regular': ['badge-regular', 'Estado Regular'],
        'revision_pendiente': ['badge-pendiente', 'Revisión Pendiente'],
        'revision_y_tratamiento': ['badge-revision', 'Revisión y Tratamiento'],
        'tratamiento_urgente': ['badge-urgente', 'Tratamiento Urgente'],
        'en_proceso': ['badge-proceso', 'En Proceso'],
        'finalizado': ['badge-finalizado', 'Finalizado'],
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
        'obras-lista': cargarObras,
        'deterioro-lista': cargarDeterioro,
        'restauracion-lista': cargarRestauraciones,
        'personal-lista': cargarPersonal,
        'obras-nueva': () => cargarSelectores('form-obra'),
        'deterioro-reportar': () => cargarSelectores('form-deterioro'),
        'restauracion-nueva': () => cargarSelectores('form-restauracion'),
    };
    loaders[id]?.();
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }

let _tecnicas = [], _tipos = [], _personal = [], _obras = [], _deterioradas = [];

async function cargarCatalogos() {
    try {
        const [tec, tip, per, obraPag, det] = await Promise.all([
            api('/catalogos/tecnicas'),
            api('/catalogos/tipos-obras'),
            api('/personal'),
            api('/obras?page=0&size=9999'),
            api('/obras-deterioradas'),
        ]);
        _tecnicas = tec;
        _tipos = tip;
        _personal = per;
        _obras = obraPag.content;
        _deterioradas = det;
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

    try {
        const [tec, tip, per, obraPag, det] = await Promise.allSettled([
            api('/catalogos/tecnicas'),
            api('/catalogos/tipos-obras'),
            api('/personal'),
            api('/obras?page=0&size=9999'),
            api('/obras-deterioradas'),
        ]);
        _tecnicas = tec.status === 'fulfilled' ? tec.value : _tecnicas;
        _tipos = tip.status === 'fulfilled' ? tip.value : _tipos;
        _personal = per.status === 'fulfilled' ? per.value : _personal;
        _obras = obraPag.status === 'fulfilled' ? obraPag.value.content : _obras;
        _deterioradas = det.status === 'fulfilled' ? det.value : _deterioradas;
    } catch (e) { toast('Error cargando datos del formulario', 'error'); return; }

    poblarSelect(f.querySelector('[name=idTecnica]'), _tecnicas, t => t.id, t => t.nombre, 'Seleccionar técnica...');
    poblarSelect(f.querySelector('[name=idTipo]'), _tipos, t => t.id, t => `${t.tipoObra} (${t.material})`, 'Seleccionar tipo...');
    poblarSelect(f.querySelector('[name=idPersonal]'), _personal, p => p.id, p => `${p.nombre} ${p.apellido}`, 'Sin asignar');
    poblarSelect(f.querySelector('[name=idPersonalMuseo]'), _personal, p => p.id, p => `${p.nombre} ${p.apellido}`, 'Sin asignar');
    poblarSelect(f.querySelector('[name=idObra]'), _obras, o => o.id, o => `[${o.id}] ${o.titulo}`, 'Seleccionar obra...');
    poblarSelect(f.querySelector('[name=idObraDeteriorada]'), _deterioradas, d => d.id, d => `Cód. ${d.id} — ${d.obra?.titulo || ''}`, 'Seleccionar obra deteriorada...');
}

function cargarSelectoresFiltros() {
    poblarSelect(document.getElementById('b-tecnica'), _tecnicas, t => t.id, t => t.nombre, 'Todas');
    poblarSelect(document.getElementById('b-tipo'), _tipos, t => t.id, t => `${t.tipoObra} (${t.material})`, 'Todos');
    poblarSelect(document.getElementById('filtro-tecnica-det'), _tecnicas, t => t.id, t => t.nombre, 'Todas');
}

async function cargarObras() {
    const tb = document.getElementById('tabla-obras');
    tb.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
    try {
        const params = new URLSearchParams({ page: _paginaActual, size: 20 });
        if (_filtroTitulo) params.set('titulo', _filtroTitulo);
        if (_filtroAutor) params.set('autor', _filtroAutor);
        const res = await api('/obras?' + params);
        _totalPaginas = res.totalPages;
        actualizarPaginacion();
        renderTablaObras(res.content, 'tabla-obras', 8);
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="loading">${e.message}</td></tr>`; }
}

function renderTablaObras(obras, tbId, cols) {
    const tb = document.getElementById(tbId);
    if (!obras.length) {
        tb.innerHTML = `<tr><td colspan="${cols}" class="loading">Sin resultados</td></tr>`;
        return;
    }
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
    _filtroAutor = document.getElementById('f-autor')?.value || '';
    _paginaActual = 0;
    cargarObras();
}

let _paginaActual = 0;
let _totalPaginas = 0;
let _filtroTitulo = '';
let _filtroAutor = '';

function resetObras() {
    _filtroTitulo = '';
    _filtroAutor = '';
    _paginaActual = 0;
    document.getElementById('f-titulo').value = '';
    document.getElementById('f-autor').value = '';
    cargarObras();
}

function cambiarPagina(delta) {
    const nueva = _paginaActual + delta;
    if (nueva < 0 || nueva >= _totalPaginas) return;
    _paginaActual = nueva;
    cargarObras();
}

function actualizarPaginacion() {
    document.getElementById('info-pagina').textContent =
        `Página ${_paginaActual + 1} de ${_totalPaginas}`;
    document.getElementById('btn-prev').disabled = _paginaActual === 0;
    document.getElementById('btn-next').disabled = _paginaActual >= _totalPaginas - 1;
}

async function submitObra(e) {
    e.preventDefault();
    const data = formData('form-obra');
    if (data.idTipo) data.idTipo = parseInt(data.idTipo);
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
        f.querySelector('[name=id]').value = obra.id;
        f.querySelector('[name=titulo]').value = obra.titulo || '';
        f.querySelector('[name=autor]').value = obra.autor || '';
        f.querySelector('[name=fechaCreacion]').value = obra.fechaCreacion || '';
        f.querySelector('[name=fechaUltimaRevision]').value = obra.fechaUltimaRevision || '';
        f.querySelector('[name=ubicacion]').value = obra.ubicacion || '';
        f.querySelector('[name=dimensiones]').value = obra.dimensiones || '';
        f.querySelector('[name=integridad]').value = obra.integridad || '';
        f.querySelector('[name=asociacionHistorica]').value = obra.asociacionHistorica || '';
        f.querySelector('[name=lugarEjecucion]').value = obra.lugarEjecucion || '';
        f.querySelector('[name=restricciones]').value = obra.restricciones || '';
        f.querySelector('[name=anotaciones]').value = obra.anotaciones || '';
        f.querySelector('[name=linkDrive]').value = obra.linkDrive || '';
        poblarSelect(f.querySelector('[name=idTipo]'), _tipos, t => t.id, t => t.tipoObra);
        poblarSelect(f.querySelector('[name=idTecnica]'), _tecnicas, t => t.id, t => t.nombre);
        if (obra.tipo) f.querySelector('[name=idTipo]').value = obra.tipo.id;
        if (obra.tecnica) f.querySelector('[name=idTecnica]').value = obra.tecnica.id;
        abrirModal('modal-obra');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitEditarObra(e) {
    e.preventDefault();
    const data = formData('form-editar-obra');
    const id = data.id; delete data.id;
    if (data.idTipo) data.idTipo = parseInt(data.idTipo);
    if (data.idTecnica) data.idTecnica = parseInt(data.idTecnica);
    try {
        await api('/obras/' + id, 'PUT', data);
        toast('✅ Obra actualizada');
        cerrarModal('modal-obra');
        cargarObras();
    } catch (err) { toast(err.message, 'error'); }
}

async function ejecutarBusqueda() {
    const params = new URLSearchParams();
    const v = id => document.getElementById(id).value;
    if (v('b-titulo')) params.set('titulo', v('b-titulo'));
    if (v('b-autor')) params.set('autor', v('b-autor'));
    if (v('b-anio')) params.set('anio', v('b-anio'));
    if (v('b-tecnica')) params.set('idTecnica', v('b-tecnica'));
    if (v('b-tipo')) params.set('idTipo', v('b-tipo'));
    try {
        const obras = await api('/obras/buscar?' + params);
        const tb = document.getElementById('tabla-busqueda');
        document.getElementById('resultados-busqueda').style.display = 'block';
        if (!obras.length) {
            tb.innerHTML = '<tr><td colspan="6" class="loading">Sin resultados</td></tr>';
            return;
        }
        tb.innerHTML = obras.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.titulo}</td>
                <td>${o.autor || '—'}</td>
                <td>${o.fechaCreacion ? o.fechaCreacion.split('-')[0] : '—'}</td>
                <td>${o.tecnica?.nombre || '—'}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="editarObra(${o.id})">✏️ Editar</button></td>
            </tr>
        `).join('');
    } catch (e) { toast(e.message, 'error'); }
}

function limpiarBusqueda() {
    ['b-titulo', 'b-autor', 'b-anio', 'b-tecnica', 'b-tipo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('resultados-busqueda').style.display = 'none';
}

async function cargarDeterioro() {
    const tb = document.getElementById('tabla-deterioro');
    tb.innerHTML = '<tr><td colspan="7" class="loading">Cargando...</td></tr>';
    try {
        const list = await api('/obras-deterioradas');
        renderDeterioro(list);
    } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="loading">${e.message}</td></tr>`; }
}

function renderDeterioro(list) {
    const tb = document.getElementById('tabla-deterioro');
    if (!list.length) {
        tb.innerHTML = '<tr><td colspan="7" class="loading">Sin registros</td></tr>';
        return;
    }
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

    // Si el checkbox está activo, ignorar los demás filtros
    if (sinRestaurar) {
        try {
            const list = await api('/obras-deterioradas/sin-restauracion-finalizada');
            renderDeterioro(list);
        } catch (e) { toast(e.message, 'error'); }
        return;
    }

    // Si no, aplicar los filtros normales
    const estado    = document.getElementById('filtro-estado-det').value;
    const autor     = document.getElementById('filtro-autor-det').value;
    const idTecnica = document.getElementById('filtro-tecnica-det').value;
    const anio      = document.getElementById('filtro-anio-det').value;

    const params = new URLSearchParams();
    if (estado)    params.set('estado', estado);
    if (autor)     params.set('autor', autor);
    if (idTecnica) params.set('idTecnica', idTecnica);
    if (anio)      params.set('anio', anio);

    try {
        const list = await api('/obras-deterioradas/filtrar?' + params);
        renderDeterioro(list);
    } catch (e) { toast(e.message, 'error'); }
}

async function submitDeteriorado(e) {
    e.preventDefault();
    const data = formData('form-deterioro');
    if (data.idObra) data.idObra = parseInt(data.idObra);
    if (data.idPersonal) data.idPersonal = parseInt(data.idPersonal);
    else delete data.idPersonal;
    try {
        await api('/obras-deterioradas', 'POST', data);
        toast('✅ Deterioro reportado exitosamente');
        e.target.reset();
        await cargarCatalogos();
        navigate('deterioro-lista');
    } catch (e) { toast(e.message, 'error'); }
}

async function editarDeteriorado(id) {
    try {
        const d = await api('/obras-deterioradas/' + id);
        const f = document.getElementById('form-editar-deterioro');
        f.querySelector('[name=id]').value = d.id;
        f.querySelector('[name=descripcion]').value = d.descripcion || '';
        f.querySelector('[name=estado]').value = d.estado || '';
        f.querySelector('[name=fechaIdentificacion]').value = d.fechaIdentificacion || '';
        poblarSelect(f.querySelector('[name=idObra]'), _obras, o => o.id, o => `[${o.id}] ${o.titulo}`);
        poblarSelect(f.querySelector('[name=idPersonal]'), _personal, p => p.id, p => `${p.nombre} ${p.apellido}`, 'Sin asignar');
        if (d.obra) f.querySelector('[name=idObra]').value = d.obra.id;
        if (d.personal) f.querySelector('[name=idPersonal]').value = d.personal.id;
        abrirModal('modal-deterioro');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitEditarDeteriorado(e) {
    e.preventDefault();
    const data = formData('form-editar-deterioro');
    const id = data.id; delete data.id;
    if (data.idObra) data.idObra = parseInt(data.idObra);
    if (data.idPersonal) data.idPersonal = parseInt(data.idPersonal);
    else delete data.idPersonal;
    try {
        await api('/obras-deterioradas/' + id, 'PUT', data);
        toast('✅ Deterioro actualizado');
        cerrarModal('modal-deterioro');
        cargarDeterioro();
        await cargarCatalogos();
    } catch (err) { toast(err.message, 'error'); }
}

async function cargarRestauraciones() {
    const tb = document.getElementById('tabla-restauraciones');
    tb.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
    try {
        const list = await api('/restauraciones');
        renderRestauraciones(list);
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="loading">${e.message}</td></tr>`; }
}

function renderRestauraciones(list) {
    const tb = document.getElementById('tabla-restauraciones');
    if (!list.length) {
        tb.innerHTML = '<tr><td colspan="8" class="loading">Sin registros</td></tr>';
        return;
    }
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
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;
    const codOb = document.getElementById('filtro-cod-obra').value;
    try {
        let list;
        if (codOb) {
            list = await api('/restauraciones/por-obra-deteriorada/' + codOb);
        } else if (desde && hasta) {
            list = await api(`/restauraciones/filtrar-fecha?desde=${desde}&hasta=${hasta}`);
        } else {
            list = await api('/restauraciones');
        }
        renderRestauraciones(list);
    } catch (e) { toast(e.message, 'error'); }
}

async function submitRestauracion(e) {
    e.preventDefault();
    const data = formData('form-restauracion');
    if (data.idObraDeteriorada) data.idObraDeteriorada = parseInt(data.idObraDeteriorada);
    if (data.idPersonalMuseo) data.idPersonalMuseo = parseInt(data.idPersonalMuseo);
    else delete data.idPersonalMuseo;
    try {
        await api('/restauraciones', 'POST', data);
        toast('✅ Restauración registrada');
        e.target.reset();
        navigate('restauracion-lista');
    } catch (e) { toast(e.message, 'error'); }
}

async function editarRestauracion(id) {
    try {
        const r = await api('/restauraciones/' + id);
        const f = document.getElementById('form-editar-restauracion');
        f.querySelector('[name=id]').value = r.id;
        f.querySelector('[name=tipoRestauracion]').value = r.tipoRestauracion || '';
        f.querySelector('[name=estado]').value = r.estado || '';
        f.querySelector('[name=fechaRestauracion]').value = r.fechaRestauracion || '';
        f.querySelector('[name=responsable]').value = r.responsable || '';
        f.querySelector('[name=observaciones]').value = r.observaciones || '';
        poblarSelect(f.querySelector('[name=idObraDeteriorada]'), _deterioradas, d => d.id, d => `Cód.${d.id} — ${d.obra?.titulo || ''}`);
        poblarSelect(f.querySelector('[name=idPersonalMuseo]'), _personal, p => p.id, p => `${p.nombre} ${p.apellido}`, 'Sin asignar');
        if (r.obraDeteriorada) f.querySelector('[name=idObraDeteriorada]').value = r.obraDeteriorada.id;
        if (r.personalMuseo) f.querySelector('[name=idPersonalMuseo]').value = r.personalMuseo.id;
        abrirModal('modal-restauracion');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitEditarRestauracion(e) {
    e.preventDefault();
    const data = formData('form-editar-restauracion');
    const id = data.id; delete data.id;
    if (data.idObraDeteriorada) data.idObraDeteriorada = parseInt(data.idObraDeteriorada);
    if (data.idPersonalMuseo) data.idPersonalMuseo = parseInt(data.idPersonalMuseo);
    else delete data.idPersonalMuseo;
    try {
        await api('/restauraciones/' + id, 'PUT', data);
        toast('✅ Restauración actualizada');
        cerrarModal('modal-restauracion');
        cargarRestauraciones();
    } catch (err) { toast(err.message, 'error'); }
}

async function cargarPersonal() {
    const tb = document.getElementById('tabla-personal');
    tb.innerHTML = '<tr><td colspan="6" class="loading">Cargando...</td></tr>';
    try {
        const list = await api('/personal');
        if (!list.length) {
            tb.innerHTML = '<tr><td colspan="6" class="loading">Sin personal registrado</td></tr>';
            return;
        }
        tb.innerHTML = list.map(p => `
            <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.nombre}</td>
                <td>${p.apellido}</td>
                <td>${p.email}</td>
                <td>${p.celular}</td>
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
    abrirModal('modal-personal');
}

async function editarPersonal(id) {
    try {
        const p = await api('/personal/' + id);
        const f = document.getElementById('form-personal');
        document.getElementById('modal-personal-titulo').textContent = '✏️ Editar Personal';
        f.querySelector('[name=_id_viejo]').value = p.id;
        f.querySelector('[name=modo]').value = 'editar';
        f.querySelector('[name=id]').value = p.id;
        f.querySelector('[name=nombre]').value = p.nombre;
        f.querySelector('[name=apellido]').value = p.apellido;
        f.querySelector('[name=email]').value = p.email;
        f.querySelector('[name=celular]').value = p.celular;
        document.getElementById('campo-cedula').style.display = 'flex';
        abrirModal('modal-personal');
    } catch (err) { toast(err.message, 'error'); }
}

async function submitPersonal(e) {
    e.preventDefault();
    const data = formData('form-personal');
    const modo = data.modo; delete data.modo;
    try {
        if (modo === 'crear') {
            data.id = parseInt(data.id);
            await api('/personal', 'POST', data);
            toast('✅ Personal registrado');
        } else {
            const idViejo = parseInt(document.querySelector('#form-personal [name=_id_viejo]').value);
            data.id = parseInt(data.id); // id nuevo (puede ser diferente)
            await api('/personal/' + idViejo, 'PUT', data);
            toast('✅ Personal actualizado');
        }
        cerrarModal('modal-personal');
        cargarPersonal();
        await cargarCatalogos();
    } catch (err) { toast(err.message, 'error'); }
}

// ══ DETALLE OBRA ══
async function verDetalleObra(id) {
    try {
        const o = await api('/obras/' + id);
        document.getElementById('detalle-obra-body').innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-campo full">
                    <span class="detalle-label">Título</span>
                    <span class="detalle-valor">${o.titulo || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Autor</span>
                    <span class="detalle-valor">${o.autor || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Año de Creación</span>
                    <span class="detalle-valor">${o.fechaCreacion ? o.fechaCreacion.split('-')[0] : '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Tipo de Obra</span>
                    <span class="detalle-valor">${o.tipo ? `${o.tipo.tipoObra} (${o.tipo.material})` : '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Técnica</span>
                    <span class="detalle-valor">${o.tecnica?.nombre || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Fecha Última Revisión</span>
                    <span class="detalle-valor">${formatDate(o.fechaUltimaRevision)}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Ubicación</span>
                    <span class="detalle-valor">${o.ubicacion || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Dimensiones</span>
                    <span class="detalle-valor">${o.dimensiones || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Integridad</span>
                    <span class="detalle-valor">${o.integridad || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Asociación Histórica</span>
                    <span class="detalle-valor">${o.asociacionHistorica || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Lugar de Ejecución</span>
                    <span class="detalle-valor">${o.lugarEjecucion || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Restricciones</span>
                    <span class="detalle-valor">${o.restricciones || '—'}</span>
                </div>
                <div class="detalle-campo full">
                    <span class="detalle-label">Anotaciones</span>
                    <span class="detalle-valor texto-largo">${o.anotaciones || '—'}</span>
                </div>
                <div class="detalle-campo full">
                    <span class="detalle-label">Link Drive</span>
                    <span class="detalle-valor">
                        ${o.linkDrive ? `<a href="${o.linkDrive}" target="_blank">${o.linkDrive}</a>` : '—'}
                    </span>
                </div>
            </div>
        `;
        abrirModal('modal-detalle-obra');
    } catch (e) { toast(e.message, 'error'); }
}

// ══ DETALLE DETERIORO ══
async function verDetalleDeteriorado(id) {
    try {
        const d = await api('/obras-deterioradas/' + id);
        document.getElementById('detalle-deterioro-body').innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-campo">
                    <span class="detalle-label">Código</span>
                    <span class="detalle-valor">Cód. ${d.id}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Obra</span>
                    <span class="detalle-valor">${d.obra?.titulo || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Estado</span>
                    <span class="detalle-valor">${badgeEstado(d.estado)}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Fecha Identificación</span>
                    <span class="detalle-valor">${formatDate(d.fechaIdentificacion)}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Personal que Reportó</span>
                    <span class="detalle-valor">${d.personal ? `${d.personal.nombre} ${d.personal.apellido}` : '—'}</span>
                </div>
                <div class="detalle-campo full">
                    <span class="detalle-label">Descripción del Deterioro</span>
                    <span class="detalle-valor texto-largo">${d.descripcion || '—'}</span>
                </div>
            </div>
        `;
        abrirModal('modal-detalle-deterioro');
    } catch (e) { toast(e.message, 'error'); }
}

// ══ DETALLE RESTAURACIÓN ══
async function verDetalleRestauracion(id) {
    try {
        const r = await api('/restauraciones/' + id);
        document.getElementById('detalle-restauracion-body').innerHTML = `
            <div class="detalle-grid">
                <div class="detalle-campo">
                    <span class="detalle-label">ID</span>
                    <span class="detalle-valor">#${r.id}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Obra Deteriorada</span>
                    <span class="detalle-valor">Cód.${r.obraDeteriorada?.id || '—'} — ${r.obraDeteriorada?.obra?.titulo || ''}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Tipo de Restauración</span>
                    <span class="detalle-valor">${r.tipoRestauracion === 'intensivo' ? '🔴 Intensivo' : '🟡 Mantenimiento'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Estado</span>
                    <span class="detalle-valor">${badgeEstado(r.estado)}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Fecha Restauración</span>
                    <span class="detalle-valor">${formatDate(r.fechaRestauracion)}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Responsable</span>
                    <span class="detalle-valor">${r.responsable || '—'}</span>
                </div>
                <div class="detalle-campo">
                    <span class="detalle-label">Personal Museo</span>
                    <span class="detalle-valor">${r.personalMuseo ? `${r.personalMuseo.nombre} ${r.personalMuseo.apellido}` : '—'}</span>
                </div>
                <div class="detalle-campo full">
                    <span class="detalle-label">Observaciones</span>
                    <span class="detalle-valor texto-largo">${r.observaciones || '—'}</span>
                </div>
            </div>
        `;
        abrirModal('modal-detalle-restauracion');
    } catch (e) { toast(e.message, 'error'); }
}

async function init() {
    await cargarCatalogos();
    cargarSelectoresFiltros();
    cargarObras();
}

init();
