const grid = document.getElementById("grid");

// Load historial from localStorage if present, otherwise use embedded historial
const historialData = JSON.parse(localStorage.getItem('historial')) || historial;

// Load precioGame map from localStorage
const precioGameMap = JSON.parse(localStorage.getItem('precioGameMap')) || {};

const historialMap = {};

for (const h of historialData) {
    historialMap[h.id] = h.historial;
}

// helper: get highest price and source for a game
function getHighestForGame(juego) {
    const gamePrice = precioGameMap[juego.id];
    const vale = juego.precioVale;
    const efectivo = juego.precioEfectivo;

    let best = { price: -Infinity, source: null };
    if (typeof vale === 'number' && vale > best.price) {
        best = { price: vale, source: 'vale' };
    }
    if (typeof efectivo === 'number' && efectivo > best.price) {
        best = { price: efectivo, source: 'efectivo' };
    }
    if (typeof gamePrice === 'number' && gamePrice > best.price) {
        best = { price: gamePrice, source: 'game' };
    }
    if (best.price === -Infinity) return { price: null, source: null };
    return best;
}

juegos.sort((a, b) => b.precioVale - a.precioVale);

for (const juego of juegos) {

    const card = document.createElement("article");

    card.style.cursor = "pointer";

    card.addEventListener("click", () => {

        window.location = "detalle.html?id=" + juego.id;

    });

    card.className = "card";

    //----------------------------------------

    const fecha = new Date(
        juego.ultimaActualizacion.replace(" ", "T")
    );

    const hoy = new Date();

    const dias = (hoy - fecha) / (1000 * 60 * 60 * 24);

    if (dias < 5) {

        card.classList.add("nuevo");

    }

    let cambioHtml = "";
    let precioColorClass = "";

    const lista = historialMap[juego.id];

    if (lista && lista.length >= 2) {

        const ultimo = lista[lista.length - 1];
        const anterior = lista[lista.length - 2];

        const diferencia = (ultimo.vale - anterior.vale).toFixed(2);

        if (diferencia > 0) {

            cambioHtml = `
                <div class="subida">
                    ▲ +${diferencia} €
                </div>
            `;
            precioColorClass = "precio-subida";

        }
        else if (diferencia < 0) {

            cambioHtml = `
                <div class="bajada">
                    ▼ ${Math.abs(diferencia)} €
                </div>
            `;
            precioColorClass = "precio-bajada";

        }

    }
    //----------------------------------------

    // Determine highest price and source
    const highest = getHighestForGame(juego);
    let highestHtml = 'N/D';
    let highestClass = '';
    if (highest.price != null) {
        highestHtml = `${highest.price} €`;
        highestClass = highest.source === 'game' ? 'precio-game' : 'precio-other';
    }

    card.innerHTML = `

        <img
            src="${juego.imagen}"
            alt="${juego.nombre}"
            loading="lazy">

        <div class="nombre">
        ${juego.nombre}
        </div>

        <div class="precio ${precioColorClass}">
        ${highestHtml}
        </div>

        ${cambioHtml}

    `;

    grid.appendChild(card);

}
