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

const svg = document.getElementById("grafico");

const datos = historial.find(h => h.id == id);

if (!datos) {

    alert("No hay historial.");

    throw "";

}

const lista = datos.historial;

if (!lista || lista.length < 1)
    throw "Sin historial";

// Calculate highest price
const precios = lista.map(x => x.vale);
const maxPrecio = Math.max(...precios);
const precioActual = lista[lista.length - 1].vale;
const esMaximo = precioActual === maxPrecio;

// Display highest price info
const priceInfoContainer = document.querySelector(".detalle-left");
const priceInfoDiv = document.createElement("div");
priceInfoDiv.className = "price-info";
priceInfoDiv.innerHTML = `
    <div class="price-row">
        <span class="price-label">Precio actual:</span>
        <span class="price-value">${precioActual}€</span>
    </div>
    <div class="price-row">
        <span class="price-label">Precio más alto:</span>
        <span class="price-value ${esMaximo ? 'highest' : ''}">${maxPrecio}€</span>
    </div>
`;
priceInfoContainer.appendChild(priceInfoDiv);

const margen = 80;

const ancho = 900 - margen * 2;

const alto = 350 - margen * 2;

// Set SVG viewBox for responsiveness
svg.setAttribute("viewBox", `0 0 900 350`);
svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

const min = Math.min(...precios);

let puntos = "";

// Calcular puntos del gráfico
for (let i = 0; i < lista.length; i++) {

    const x =
        margen +
        (lista.length > 1 ? i * (ancho / (lista.length - 1)) : ancho / 2);

    const y =
        margen +
        (maxPrecio > min ? (maxPrecio - lista[i].vale) * alto / (maxPrecio - min) : alto / 2);

    puntos += x + "," + y + " ";

}

// Dibujar ejes
// Eje X (horizontal)
svg.innerHTML +=
`<line
    x1="${margen}"
    y1="${margen + alto}"
    x2="${margen + ancho}"
    y2="${margen + alto}"
    stroke="#00d4ff"
    stroke-width="2"/>`;

// Eje Y (vertical)
svg.innerHTML +=
`<line
    x1="${margen}"
    y1="${margen}"
    x2="${margen}"
    y2="${margen + alto}"
    stroke="#00d4ff"
    stroke-width="2"/>`;

// Etiquetas del eje Y (precios)
const numIntervalos = 5;
for (let i = 0; i <= numIntervalos; i++) {
    const precio = min + (maxPrecio - min) * (numIntervalos - i) / numIntervalos;
    const y = margen + i * (alto / numIntervalos);
    
    svg.innerHTML +=
    `<text
        x="${margen - 10}"
        y="${y + 4}"
        text-anchor="end"
        font-size="12"
        fill="#a0d4ff"
        font-weight="500">
        ${precio.toFixed(0)}€
    </text>`;
    
    // Línea de rejilla horizontal
    svg.innerHTML +=
    `<line
        x1="${margen}"
        y1="${y}"
        x2="${margen + ancho}"
        y2="${y}"
        stroke="rgba(0, 212, 255, 0.15)"
        stroke-width="1"
        stroke-dasharray="5,5"/>`;
}

// Etiquetas del eje X (fechas)
for (let i = 0; i < lista.length; i++) {
    const x = margen + (lista.length > 1 ? i * (ancho / (lista.length - 1)) : ancho / 2);
    const fecha = lista[i].fecha;
    const fechaCorta = fecha.split(" ")[0]; // YYYY-MM-DD
    
    svg.innerHTML +=
    `<text
        x="${x}"
        y="${margen + alto + 25}"
        text-anchor="middle"
        font-size="11"
        fill="#a0d4ff"
        font-weight="500">
        ${fechaCorta}
    </text>`;
}

// Etiqueta del eje Y
svg.innerHTML +=
`<text
    x="${20}"
    y="${margen + alto / 2}"
    text-anchor="middle"
    font-size="14"
    fill="#00d4ff"
    font-weight="700"
    transform="rotate(-90 20 ${margen + alto / 2})">
    Precio (€)
</text>`;

// Dibujar la línea del gráfico
if (lista.length > 1) {
    svg.innerHTML +=
    `<polyline
    fill="none"
    stroke="#00d4ff"
    stroke-width="3"
    points="${puntos}"/>`;
}

// Dibujar los puntos
for (let i = 0; i < lista.length; i++) {

    const x =
        margen +
        (lista.length > 1 ? i * (ancho / (lista.length - 1)) : ancho / 2);

    const y =
        margen +
        (maxPrecio > min ? (maxPrecio - lista[i].vale) * alto / (maxPrecio - min) : alto / 2);

    svg.innerHTML +=

    `<circle
        cx="${x}"
        cy="${y}"
        r="5"
        fill="#ff6b6b"
        stroke="#0a0e27"
        stroke-width="2">
    </circle>`;

}

// Generar tabla de historial
const tabla = document.getElementById("tabla-historial");
let htmlTabla = `
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Vale (€)</th>
                <th>Efectivo (€)</th>
            </tr>
        </thead>
        <tbody>
`;

for (let i = 0; i < lista.length; i++) {
    const entrada = lista[i];
    let priceColorClass = "";
    
    // Determine price color based on direction
    if (i > 0) {
        const diferencia = entrada.vale - lista[i - 1].vale;
        if (diferencia > 0) {
            priceColorClass = "precio-subida";
        } else if (diferencia < 0) {
            priceColorClass = "precio-bajada";
        }
    }
    
    htmlTabla += `
            <tr>
                <td>${entrada.fecha}</td>
                <td class="${priceColorClass}">${entrada.vale}</td>
                <td>${entrada.efectivo}</td>
            </tr>
    `;
}

htmlTabla += `
        </tbody>
    </table>
`;

tabla.innerHTML = htmlTabla;
