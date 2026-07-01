const grid = document.getElementById("grid");

const historialMap = {};

for (const h of historial) {
    historialMap[h.id] = h.historial;
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

    card.innerHTML = `

		<img
			src="${juego.imagen}"
			alt="${juego.nombre}"
			loading="lazy">

		<div class="nombre">
		${juego.nombre}
		</div>

		<div class="precio ${precioColorClass}">
		${juego.precioVale} €
		</div>

		${cambioHtml}

	`;

    grid.appendChild(card);

}
