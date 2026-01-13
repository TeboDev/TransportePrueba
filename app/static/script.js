document.addEventListener('DOMContentLoaded', () => {
    fetchMetadata();
    fetchPasajes();

    // Reset form state on load
    resetForm();

    // Event Listener for Filters
    document.getElementById('filter-ruta').addEventListener('change', (e) => {
        fetchPasajes(e.target.value);
    });

    // Handle Form Submit
    document.getElementById('pasaje-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            id_ruta: document.getElementById('input-ruta').value,
            id_unidad: document.getElementById('input-unidad').value,
            id_tipo: document.getElementById('input-tipo').value,
            fecha__viaje: document.getElementById('input-fecha').value.replace('T', ' '),
            nombre_pasajero: document.getElementById('input-nombre').value
        };

        const isUpdate = currentPasajeId !== null;
        const url = isUpdate ? `/api/pasajes/${currentPasajeId}` : '/api/pasajes';
        const method = isUpdate ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Reset form and reload list
                resetForm();
                fetchPasajes();
                // If it was a filter active, maybe we want to keep it? For now fetch all or current filter
                const currentFilter = document.getElementById('filter-ruta').value;
                if (currentFilter) fetchPasajes(currentFilter);

            } else {
                const err = await response.json();
                alert('Error: ' + (err.error || 'No se pudo guardar el pasaje'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    });
});

let currentPasajeId = null;
let allPasajesData = []; // Store data to populate edit form


async function fetchMetadata() {
    try {
        const res = await fetch('/api/metadata');
        const data = await res.json();

        if (data.error) {
            console.error(data.error);
            return;
        }

        // Populate Form Selects
        populateSelect('input-ruta', data.rutas, 'id', 'nombre');
        populateSelect('input-unidad', data.unidades, 'id', (item) => `Disco ${item.disco} - ${item.placa}`);
        populateSelect('input-tipo', data.tipos, 'id', 'descripcion');

        // Populate Filter Select
        populateSelect('filter-ruta', data.rutas, 'id', 'nombre');

    } catch (e) {
        console.error("Failed to load metadata", e);
    }
}

function populateSelect(elementId, items, valueKey, labelKeyOrFn) {
    const select = document.getElementById(elementId);
    // Keep first option if it's the filter
    if (elementId === 'filter-ruta') {
        select.innerHTML = '<option value="">Todas las rutas</option>';
    } else {
        select.innerHTML = '';
    }

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = typeof labelKeyOrFn === 'function' ? labelKeyOrFn(item) : item[labelKeyOrFn];
        select.appendChild(option);
    });
}

async function fetchPasajes(rutaId = null) {
    const tbody = document.getElementById('pasajes-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Cargando...</td></tr>';

    let url = '/api/pasajes';
    if (rutaId) {
        url += `?ruta_id=${rutaId}`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        allPasajesData = data; // Store for editing lookup

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-secondary)">No hay pasajes registrados</td></tr>';
            return;
        }

        data.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(p.FECHA_VIAJE)}</td>
                <td>${p.NOMBRE_RUTA}</td>
                <td>${p.NUMERO_DISCO}</td>
                <td>${p.DESCRIPCION}</td>
                <td>${p.NOMBRE_PASAJERO}</td>
                <td>$${p.VALOR_FINAL.toFixed(2)}</td>
                <td>
                    <button class="edit-btn" onclick="editPasaje(${p.ID_PASAJE})" style="margin-right: 5px;">Editar</button>
                    <button class="delete-btn" onclick="deletePasaje(${p.ID_PASAJE})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--danger)">Error al cargar datos</td></tr>';
    }
}

async function deletePasaje(id) {
    if (!confirm('¿Está seguro de eliminar este pasaje?')) return;

    try {
        const res = await fetch(`/api/pasajes/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchPasajes(document.getElementById('filter-ruta').value); // Reload with current filter
            if (currentPasajeId === id) resetForm(); // Reset if we deleted the one being edited
        } else {
            alert('Error al eliminar');
        }
    } catch (e) {
        console.error(e);
    }
}

function editPasaje(id) {
    const pasaje = allPasajesData.find(p => p.ID_PASAJE === id);
    if (!pasaje) return;

    currentPasajeId = id;

    // UPDATE FORM UI
    document.getElementById('form-title').textContent = `Editar Pasaje #${id}`;
    document.querySelector('#pasaje-form button[type="submit"]').textContent = 'Actualizar Pasaje';

    // Populate Fields
    document.getElementById('input-ruta').value = pasaje.ID_RUTA;
    document.getElementById('input-unidad').value = pasaje.ID_UNIDAD;
    document.getElementById('input-tipo').value = pasaje.ID_TIPO_PASAJE;
    document.getElementById('input-nombre').value = pasaje.NOMBRE_PASAJERO;

    // Format Date for Input (YYYY-MM-DDTHH:MM)
    if (pasaje.FECHA_VIAJE) {
        // pasaje.FECHA_VIAJE is ISO string from backend (2025-01-13T10:00:00)
        // input requires the same format so it should work directly usually
        document.getElementById('input-fecha').value = pasaje.FECHA_VIAJE.slice(0, 16);
    }
}

function resetForm() {
    currentPasajeId = null;
    document.getElementById('pasaje-form').reset();
    document.getElementById('form-title').textContent = 'Nuevo Pasaje';
    document.querySelector('#pasaje-form button[type="submit"]').textContent = 'Emitir Pasaje';

    // Set default date
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('input-fecha').value = now.toISOString().slice(0, 16);
}

function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
