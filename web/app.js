const grid = document.getElementById("grid");

const historialMap = {};

for (const h of historial) {
    historialMap[h.id] = h.historial;
}

// Load Game prices from localStorage (saved from detalle page)
const precioGameMap = JSON.parse(localStorage.getItem('precioGameMap')) || {};

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

    // Determine highest price among vale, efectivo and Game (from localStorage)
    const gamePrice = typeof precioGameMap[juego.id] === 'number' ? precioGameMap[juego.id] : null;
    let best = { price: -Infinity, source: null };
    if (typeof juego.precioVale === 'number' && juego.precioVale > best.price) {
        best = { price: juego.precioVale, source: 'vale' };
    }
    if (typeof juego.precioEfectivo === 'number' && juego.precioEfectivo > best.price) {
        best = { price: juego.precioEfectivo, source: 'efectivo' };
    }
    if (typeof gamePrice === 'number' && gamePrice > best.price) {
        best = { price: gamePrice, source: 'game' };
    }
    const highestHtml = best.price !== -Infinity ? `${best.price} €` : 'N/D';
    const highestClass = best.source === 'game' ? 'precio-game' : 'precio-other';

    // badge for games that have a saved precioGame
    const hasGamePrice = typeof precioGameMap[juego.id] === 'number';
    const badgeHtml = hasGamePrice ? `<div class="game-badge" title="Precio Game disponible">✔</div>` : '';

    card.innerHTML = `

		${badgeHtml}
		<img
			src="${juego.imagen}"
			alt="${juego.nombre}"
			loading="lazy">

		<div class="nombre">
		${juego.nombre}
		</div>

		<div class="precio ${precioColorClass} ${highestClass}">
		${highestHtml}
		</div>

		${cambioHtml}

	`;

    grid.appendChild(card);

}
