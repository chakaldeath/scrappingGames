const params = new URLSearchParams(window.location.search);

const id = params.get("id");

const juego = juegos.find(g => g.id == id);

// Generate barcode
JsBarcode("#barcode", id, {
    format: "EAN13",
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 12,
    margin: 5
});

document.getElementById("titulo").textContent =
    juego.nombre;

document.getElementById("imagen").src =
    juego.imagen;

// Load from localStorage if present
const precioGameMap = JSON.parse(localStorage.getItem('precioGameMap')) || {};
const historialData = JSON.parse(localStorage.getItem('historial')) || historial;

// Ensure we have a datos entry for this id
let datos = historialData.find(h => h.id == id);
if (!datos) {
    // allow creating historial entry so user can add precioGame even if none exists
    datos = { id: id, historial: [] };
    historialData.push(datos);
}

const lista = datos.historial;

// Build prices array for highest calculation (use 'vale' values)
const precios = lista.map(x => x.vale).filter(p => typeof p === 'number');
const gamePriceStored = typeof precioGameMap[id] === 'number' ? precioGameMap[id] : null;
if (typeof gamePriceStored === 'number') precios.push(gamePriceStored);

const maxPrecio = precios.length ? Math.max(...precios) : null;
const precioActual = (lista.length ? lista[lista.length - 1].vale : null);

// determine source of max for styling
let maxSource = null;
if (maxPrecio != null) {
    if (gamePriceStored === maxPrecio) maxSource = 'game';
    else if (precioActual === maxPrecio) maxSource = 'historial';
    else maxSource = 'otra';
}

// Display highest price info
const priceInfoContainer = document.querySelector(".detalle-left");
const priceInfoDiv = document.createElement("div");
priceInfoDiv.className = "price-info";
priceInfoDiv.innerHTML = `
    <div class="price-row">
        <span class="price-label">Precio actual:</span>
        <span id="precio-actual" class="price-value">${precioActual != null ? precioActual + '€' : 'N/D'}</span>
    </div>
    <div class="price-row">
        <span class="price-label">Precio más alto:</span>
        <span id="precio-mas-alto" class="price-value ${maxSource === 'game' ? 'highest-game' : (maxSource ? 'highest-other' : '')}">
            ${maxPrecio != null ? maxPrecio + '€' : 'N/D'}
        </span>
    </div>
`;
priceInfoContainer.appendChild(priceInfoDiv);

// Fill the input if value exists
const inputEl = document.getElementById('input-precio-game');
const btnGuardar = document.getElementById('btn-guardar-precio-game');
const saveStatus = document.getElementById('save-status');
if (inputEl && typeof gamePriceStored === 'number') {
    inputEl.value = String(gamePriceStored);
}

// Utility for formatted now
function nowFormatted() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

if (btnGuardar) {
  btnGuardar.addEventListener('click', () => {
    const raw = inputEl.value.trim().replace(',', '.');
    const priceNum = parseFloat(raw);
    if (isNaN(priceNum)) {
      saveStatus.style.display = 'block';
      saveStatus.textContent = 'Introduce un número válido.';
      return;
    }

    // Save in precioGameMap
    precioGameMap[id] = priceNum;
    localStorage.setItem('precioGameMap', JSON.stringify(precioGameMap));

    // Add entry to historialData for this game
    let target = historialData.find(h => h.id == id);
    if (!target) {
      target = { id: id, historial: [] };
      historialData.push(target);
    }
    target.historial.push({
      fecha: nowFormatted(),
      vale: null,
      efectivo: null,
      precioGame: priceNum,
      fuente: 'Game'
    });
    localStorage.setItem('historial', JSON.stringify(historialData));

    // Update displayed max price
    const nuevosPrecios = lista.map(x => x.vale).filter(p => typeof p === 'number');
    nuevosPrecios.push(priceNum);
    const nuevoMax = Math.max(...nuevosPrecios);
    const elemMax = document.getElementById('precio-mas-alto');
    elemMax.textContent = `${nuevoMax}€`;
    if (priceNum === nuevoMax) {
      elemMax.className = 'price-value highest-game';
    } else {
      elemMax.className = 'price-value highest-other';
    }

    // Update save status
    saveStatus.style.display = 'block';
    saveStatus.textContent = 'Precio guardado.';
    setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);

    // Also update the table to include the new historial row
    renderHistorialTable();
  });
}

// --- existing graph drawing and table generation (adapted to consider precioGame column) ---
const svg = document.getElementById("grafico");

// For the chart, use 'vale' values only (ignore precioGame entries for plotting)
const preciosChart = lista.map(x => x.vale).filter(p => typeof p === 'number');
if (preciosChart.length === 0) {
  // If no vale prices, we still want to show something; set a default
  preciosChart.push(0);
}

const min = Math.min(...preciosChart.concat(maxPrecio != null ? [maxPrecio] : []));
const maxForChart = Math.max(...preciosChart.concat(maxPrecio != null ? [maxPrecio] : []));

const margen = 80;
const ancho = 900 - margen * 2;
const alto = 350 - margen * 2;

// Set SVG viewBox for responsiveness
svg.setAttribute("viewBox", `0 0 900 350`);
svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

let puntos = "";
// Use lista.length as x axis points (including entries that may be precioGame-only)
for (let i = 0; i < lista.length; i++) {
    const x = margen + (lista.length > 1 ? i * (ancho / (lista.length - 1)) : ancho / 2);
    // For y we try to use vale if present, otherwise if precioGame present use that, otherwise place in middle
    const val = (typeof lista[i].vale === 'number') ? lista[i].vale : (typeof lista[i].precioGame === 'number' ? lista[i].precioGame : (min + maxForChart) / 2);
    const y = margen + (maxForChart > min ? (maxForChart - val) * alto / (maxForChart - min) : alto / 2);
    puntos += x + "," + y + " ";
}

// Draw axes
svg.innerHTML +=
`<line x1="${margen}" y1="${margen + alto}" x2="${margen + ancho}" y2="${margen + alto}" stroke="#00d4ff" stroke-width="2"/>`;
svg.innerHTML +=
`<line x1="${margen}" y1="${margen}" x2="${margen}" y2="${margen + alto}" stroke="#00d4ff" stroke-width="2"/>`;

// Y labels and grid
const numIntervalos = 5;
for (let i = 0; i <= numIntervalos; i++) {
    const precio = min + (maxForChart - min) * (numIntervalos - i) / numIntervalos;
    const y = margen + i * (alto / numIntervalos);
    svg.innerHTML += `<text x="${margen - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#a0d4ff" font-weight="500">${precio.toFixed(0)}€</text>`;
    svg.innerHTML += `<line x1="${margen}" y1="${y}" x2="${margen + ancho}" y2="${y}" stroke="rgba(0, 212, 255, 0.15)" stroke-width="1" stroke-dasharray="5,5"/>`;
}

// X labels
for (let i = 0; i < lista.length; i++) {
    const x = margen + (lista.length > 1 ? i * (ancho / (lista.length - 1)) : ancho / 2);
    const fecha = lista[i].fecha || '';
    const fechaCorta = fecha.split(' ')[0] || '';
    svg.innerHTML += `<text x="${x}" y="${margen + alto + 25}" text-anchor="middle" font-size="11" fill="#a0d4ff" font-weight="500">${fechaCorta}</text>`;
}

// Y axis label
svg.innerHTML += `<text x="20" y="${margen + alto / 2}" text-anchor="middle" font-size="14" fill="#00d4ff" font-weight="700" transform="rotate(-90 20 ${margen + alto / 2})">Precio (€)</text>`;

// Line
if (lista.length > 1) {
    svg.innerHTML += `<polyline fill="none" stroke="#00d4ff" stroke-width="3" points="${puntos}"/>`;
}

// Points
for (let i = 0; i < lista.length; i++) {
    const x = margen + (lista.length > 1 ? i * (ancho / (lista.length - 1)) : ancho / 2);
    const val = (typeof lista[i].vale === 'number') ? lista[i].vale : (typeof lista[i].precioGame === 'number' ? lista[i].precioGame : (min + maxForChart) / 2);
    const y = margen + (maxForChart > min ? (maxForChart - val) * alto / (maxForChart - min) : alto / 2);
    svg.innerHTML += `<circle cx="${x}" cy="${y}" r="5" fill="#ff6b6b" stroke="#0a0e27" stroke-width="2"></circle>`;
}

// Generate historial table (including precioGame column)
const tabla = document.getElementById("tabla-historial");

function renderHistorialTable() {
  // Re-fetch datos in case localStorage changed
  const currentHist = JSON.parse(localStorage.getItem('historial')) || historial;
  const entry = currentHist.find(h => h.id == id) || { historial: [] };
  const rows = entry.historial;

  let htmlTabla = `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Vale (€)</th>
          <th>Efectivo (€)</th>
          <th>Game (€)</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let i = 0; i < rows.length; i++) {
    const entrada = rows[i];
    let priceColorClass = "";
    if (i > 0 && typeof rows[i].vale === 'number' && typeof rows[i-1].vale === 'number') {
      const diferencia = rows[i].vale - rows[i - 1].vale;
      if (diferencia > 0) priceColorClass = 'precio-subida';
      else if (diferencia < 0) priceColorClass = 'precio-bajada';
    }

    htmlTabla += `
      <tr>
        <td>${entrada.fecha || ''}</td>
        <td class="${priceColorClass}">${entrada.vale != null ? entrada.vale : '-'}</td>
        <td>${entrada.efectivo != null ? entrada.efectivo : '-'}</td>
        <td>${entrada.precioGame != null ? entrada.precioGame : '-'}</td>
      </tr>
    `;
  }

  htmlTabla += `
      </tbody>
    </table>
  `;

  tabla.innerHTML = htmlTabla;
}

// Initial render
renderHistorialTable();
