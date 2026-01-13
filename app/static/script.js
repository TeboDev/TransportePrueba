document.addEventListener('DOMContentLoaded', () => {
    fetchMetadata();
    fetchPasajes();

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

        try {
            const response = await fetch('/api/pasajes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Reset form and reload list
                e.target.reset();
                // Set default date again
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                document.getElementById('input-fecha').value = now.toISOString().slice(0, 16);

                fetchPasajes();
            } else {
                const err = await response.json();
                alert('Error: ' + (err.error || 'No se pudo crear el pasaje'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    });
});

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
        } else {
            alert('Error al eliminar');
        }
    } catch (e) {
        console.error(e);
    }
}

function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
