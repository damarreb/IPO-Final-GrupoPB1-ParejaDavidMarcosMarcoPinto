const screens = document.querySelectorAll(".screen");
const buttons = document.querySelectorAll(".nav-button");
const headerPriceWrap = document.querySelector("[data-header-price-wrap]");
const headerPriceLabel = document.querySelector("[data-header-price]");
const defaultScreen = "viajar";
const navTargetByScreen = {
	editar: "datos",
	exito: "datos",
	factura: "historial",
	busqueda: "viajar",
	qr: "viajar",
	"viaje-exito": "viajar",
	valoracion: "viajar",
	streetview: "viajar",
};
const perfil = {
	nombre: "Usuario",
	tarjeta: "0000 0000 0000 0000",
	cvv: "000",
};
const cabinaImageBase = "./assets/images/cabinas/";
const cabinas = [
	{
		id: "mad",
		nombre: "Cabina Madrid",
		imagen: "madrid.jpg",
		lat: 40.4168,
		lng: -3.7038,
	},
	{
		id: "bcn",
		nombre: "Cabina Barcelona",
		imagen: "barcelona.jpg",
		lat: 41.3874,
		lng: 2.1686,
	},
	{
		id: "leo",
		nombre: "Cabina Leon",
		imagen: "leon.jpg",
		lat: 42.5987,
		lng: -5.5671,
	},
	{
		id: "nyc",
		nombre: "Cabina New York",
		imagen: "new-york.jpg",
		lat: 40.7128,
		lng: -74.006,
	},
	{
		id: "tyo",
		nombre: "Cabina Tokyo",
		imagen: "tokyo.jpg",
		lat: 35.6895,
		lng: 139.6917,
	},
	{
		id: "par",
		nombre: "Cabina Paris",
		imagen: "paris.jpg",
		lat: 48.8566,
		lng: 2.3522,
	},
	{
		id: "syd",
		nombre: "Cabina Sydney",
		imagen: "sydney.jpg",
		lat: -33.8688,
		lng: 151.2093,
	},
	{
		id: "sao",
		nombre: "Cabina Sao Paulo",
		imagen: "sao-paulo.jpg",
		lat: -23.5505,
		lng: -46.6333,
	},
	{
		id: "sal",
		nombre: "Cabina Salamanca",
		imagen: "salamanca.jpg",
		lat: 40.9701,
		lng: -5.6635,
	},
	{
		id: "dxb",
		nombre: "Cabina Dubai",
		imagen: "dubai.jpg",
		lat: 25.2048,
		lng: 55.2708,
	},
];
const viajeActual = {
	origen: null,
	destino: null,
};
let cabinaDestinoConfirmada = null;
const ratingState = {
	selected: 0,
	hover: 0,
};
const ratingIcons = {
	inactive: "./assets/icons/star.png",
	active: "./assets/icons/star-active.png",
};
const googleMapsApiKey = "AIzaSyBCNuyvvAhDEDtE3ANrOVqAvRsoh22ojic";
const streetViewState = {
	panorama: null,
	loading: null,
};
let tipoBusqueda = null;
let activePopupCabinaId = null;
const mapCabinaMarkers = new Map();
const viajes = [
];
let viajeSeleccionado = viajes[0] ?? null;
let mapa = null;

const setActiveScreen = (target) => {
	if (!target) {
		return;
	}

	screens.forEach((screen) => {
		const isActive = screen.dataset.screen === target;
		screen.classList.toggle("is-active", isActive);
		screen.setAttribute("aria-hidden", String(!isActive));
	});

	const navTarget = navTargetByScreen[target] ?? target;
	buttons.forEach((button) => {
		const isActive = button.dataset.target === navTarget;
		const icon = button.querySelector(".nav-icon");
		button.classList.toggle("is-active", isActive);
		if (icon) {
			const activeSrc = button.dataset.iconActive;
			const inactiveSrc = button.dataset.icon;
			if (activeSrc && inactiveSrc) {
				icon.src = isActive ? activeSrc : inactiveSrc;
			}
		}
		if (isActive) {
			button.setAttribute("aria-current", "page");
		} else {
			button.removeAttribute("aria-current");
		}
	});

	if (target === "viajar" && mapa) {
		setTimeout(() => mapa.invalidateSize(), 0);
	}

	if (headerPriceWrap) {
		headerPriceWrap.hidden = target !== "viajar";
	}
};

const loadPerfil = () => {
	const fields = document.querySelectorAll("[data-profile]");
	fields.forEach((field) => {
		const key = field.dataset.profile;
		const value = perfil[key];
		if (value === undefined) {
			return;
		}
		if (field instanceof HTMLInputElement) {
			field.value = value;
		} else {
			field.textContent = value;
		}
	});
};

const renderFactura = (viaje) => {
	const fields = document.querySelectorAll("[data-factura]");
	fields.forEach((field) => {
		const key = field.dataset.factura;
		if (!key) {
			return;
		}
		field.textContent = viaje?.[key] ?? "";
	});
};

const renderViaje = () => {
	const origenField = document.querySelector('[data-viaje="origen"]');
	const destinoField = document.querySelector('[data-viaje="destino"]');
	const travelButton = document.querySelector('[data-action="iniciar-viaje"]');
	const hasSelection = viajeActual.origen && viajeActual.destino;

	if (origenField) {
		origenField.textContent = viajeActual.origen?.nombre ?? "Sin seleccionar";
	}
	if (destinoField) {
		destinoField.textContent = viajeActual.destino?.nombre ?? "Sin seleccionar";
	}
	if (travelButton) {
		travelButton.disabled = !hasSelection;
	}
	if (headerPriceLabel) {
		if (hasSelection) {
			const kilometros = calcularKm(viajeActual.origen, viajeActual.destino);
			const precio = formatCurrency(kilometros * 0.2);
			headerPriceLabel.textContent = `Precio: ${precio}`;
		} else {
			headerPriceLabel.textContent = "Precio: --";
		}
	}
};

const renderRatingStars = () => {
	const stars = document.querySelectorAll("[data-star]");
	const activeCount = ratingState.hover || ratingState.selected;
	stars.forEach((button) => {
		const index = Number(button.dataset.star);
		const image = button.querySelector("img");
		if (!image) {
			return;
		}
		image.src = index <= activeCount ? ratingIcons.active : ratingIcons.inactive;
	});
};

const renderCabinaImage = () => {
	const image = document.querySelector("[data-cabina-image]");
	if (!image) {
		return;
	}
	if (cabinaDestinoConfirmada?.imagen) {
		image.src = `${cabinaImageBase}${cabinaDestinoConfirmada.imagen}`;
		image.alt = cabinaDestinoConfirmada.nombre;
		return;
	}
	image.src = "./assets/icons/travel.png";
	image.alt = "Imagen de cabina";
};

const loadStreetViewApi = () => {
	if (window.google?.maps?.StreetViewPanorama) {
		return Promise.resolve();
	}
	if (streetViewState.loading) {
		return streetViewState.loading;
	}

	streetViewState.loading = new Promise((resolve, reject) => {
		window.onStreetViewApiReady = () => resolve();
		const script = document.createElement("script");
		script.async = true;
		script.defer = true;
		script.src =
			"https://maps.googleapis.com/maps/api/js?key=" +
			googleMapsApiKey +
			"&callback=onStreetViewApiReady";
		script.onerror = () => reject(new Error("Street View API load failed"));
		document.head.appendChild(script);
	});

	return streetViewState.loading;
};

const renderStreetView = (cabina) => {
	if (!cabina) {
		return;
	}
	const container = document.getElementById("streetview");
	if (!container || googleMapsApiKey === "YOUR_API_KEY") {
		return;
	}

	const position = { lat: cabina.lat, lng: cabina.lng };
	loadStreetViewApi().then(() => {
		if (!streetViewState.panorama) {
			streetViewState.panorama = new google.maps.StreetViewPanorama(container, {
				position,
				pov: { heading: 0, pitch: 0 },
				zoom: 0,
				disableDefaultUI: true,
				clickToGo: false,
				scrollwheel: false,
				keyboardShortcuts: false,
				linksControl: false,
				panControl: false,
				zoomControl: false,
				addressControl: false,
				motionTracking: false,
				motionTrackingControl: false,
			});
		} else {
			streetViewState.panorama.setPosition(position);
		}
	});
};

const buildCabinaPopup = (cabina) => {
	return `
		<div class="profile-card">
			<table width="100%">
				<tr>
					<td><p class="label-strong">${cabina.nombre}</p></td>
					<td align="right">
						<button
							type="button"
							class="pure-button btn-icon"
							data-action="abrir-streetview"
							data-cabina-id="${cabina.id}"
						>
							StreetView
						</button>
					</td>
				</tr>
			</table>
			<table width="100%">
				<tr>
					<td align="center">
						<button
							type="button"
							class="pure-button btn-icon"
							data-action="popup-origen"
							data-cabina-id="${cabina.id}"
						>
							Origen
						</button>
					</td>
					<td align="center">
						<button
							type="button"
							class="pure-button btn-icon"
							data-action="popup-destino"
							data-cabina-id="${cabina.id}"
						>
							Destino
						</button>
					</td>
				</tr>
			</table>
		</div>
	`;
};

const openPopupForCabina = (cabinaId) => {
	const marker = mapCabinaMarkers.get(cabinaId);
	if (!marker || !mapa) {
		return;
	}
	setTimeout(() => {
		marker.openPopup();
	}, 0);
};

const bindRatingStars = () => {
	const container = document.querySelector("[data-rating-stars]");
	if (!container) {
		return;
	}
	const stars = container.querySelectorAll("[data-star]");
	stars.forEach((button) => {
		const index = Number(button.dataset.star);
		button.addEventListener("mouseenter", () => {
			ratingState.hover = index;
			renderRatingStars();
		});
		button.addEventListener("click", () => {
			ratingState.selected = index;
			ratingState.hover = 0;
			renderRatingStars();
		});
	});
	container.addEventListener("mouseleave", () => {
		ratingState.hover = 0;
		renderRatingStars();
	});
	container.addEventListener("blur", () => {
		ratingState.hover = 0;
		renderRatingStars();
	});

	renderRatingStars();
};

const formatCurrency = (value) => {
	const formatted = value.toFixed(2).replace(".", ",");
	return `${formatted} EUR`;
};

const formatDateTime = (date) => {
	const fecha = date.toLocaleDateString("es-ES", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const hora = date.toLocaleTimeString("es-ES", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	return `${fecha} ${hora}`;
};

const calcularKm = (origen, destino) => {
	const toRad = (value) => (value * Math.PI) / 180;
	const radius = 6371;
	const dLat = toRad(destino.lat - origen.lat);
	const dLng = toRad(destino.lng - origen.lng);
	const lat1 = toRad(origen.lat);
	const lat2 = toRad(destino.lat);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return Math.max(1, Math.round(radius * c));
};

const crearViaje = () => {
	if (!viajeActual.origen || !viajeActual.destino) {
		return null;
	}
	const kilometros = calcularKm(viajeActual.origen, viajeActual.destino);
	const precio = formatCurrency(kilometros * 1.2);
	return {
		id: `v${Date.now()}`,
		fechaHora: formatDateTime(new Date()),
		origen: viajeActual.origen.nombre,
		destino: viajeActual.destino.nombre,
		precio,
		viajero: perfil.nombre,
		tarjeta: perfil.tarjeta,
		kilometros,
	};
};

const renderCabinasList = () => {
	const list = document.querySelector("[data-cabina-list]");
	if (!list) {
		return;
	}
	list.innerHTML = "";
	cabinas.forEach((cabina) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "pure-button btn-icon";
		button.textContent = cabina.nombre;
		button.setAttribute("data-action", "seleccionar-cabina");
		button.setAttribute("data-cabina-id", cabina.id);
		list.appendChild(button);
	});
};

const openBusqueda = (tipo) => {
	tipoBusqueda = tipo;
	renderCabinasList();
	setActiveScreen("busqueda");
};

const seleccionarCabina = (cabinaId) => {
	const cabina = cabinas.find((item) => item.id === cabinaId) ?? null;
	if (!cabina || !tipoBusqueda) {
		return;
	}
	if (tipoBusqueda === "origen" && viajeActual.destino?.id === cabinaId) {
		viajeActual.destino = null;
	}
	if (tipoBusqueda === "destino" && viajeActual.origen?.id === cabinaId) {
		viajeActual.origen = null;
	}
	viajeActual[tipoBusqueda] = cabina;
	renderViaje();
	setActiveScreen("viajar");
};

const seleccionarCabinaDesdePopup = (cabinaId, tipo) => {
	const cabina = cabinas.find((item) => item.id === cabinaId) ?? null;
	if (!cabina) {
		return;
	}
	if (tipo === "origen" && viajeActual.destino?.id === cabinaId) {
		viajeActual.destino = null;
	}
	if (tipo === "destino" && viajeActual.origen?.id === cabinaId) {
		viajeActual.origen = null;
	}
	viajeActual[tipo] = cabina;
	renderViaje();
	const marker = mapCabinaMarkers.get(cabinaId);
	if (marker) {
		marker.closePopup();
	} else if (mapa) {
		mapa.closePopup();
	}
};

const initMapa = () => {
	const mapElement = document.querySelector("[data-map]");
	if (!mapElement || typeof L === "undefined") {
		return null;
	}

	mapElement.style.width = "100%";
	mapElement.style.height = "320px";

	const map = L.map(mapElement).setView([20, 0], 2);
	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		attribution: "&copy; OpenStreetMap contributors",
	}).addTo(map);

	const accent =
		getComputedStyle(document.documentElement)
			.getPropertyValue("--color-accent-primary")
			.trim() || "#4f5aff";

	cabinas.forEach((cabina) => {
		const marker = L.circleMarker([cabina.lat, cabina.lng], {
			radius: 6,
			color: accent,
			fillColor: accent,
			fillOpacity: 1,
		}).addTo(map);
		marker.bindPopup(buildCabinaPopup(cabina));
		marker.on("click", () => {
			activePopupCabinaId = cabina.id;
		});
		mapCabinaMarkers.set(cabina.id, marker);
	});

	return map;
};

const renderHistorial = () => {
	const viajesField = document.querySelector("[data-historial=\"viajes\"]");
	const kilometrosField = document.querySelector(
		"[data-historial=\"kilometros\"]"
	);
	const list = document.querySelector("[data-trip-list]");
	const totalKilometros = viajes.reduce(
		(acc, viaje) => acc + (viaje.kilometros ?? 0),
		0
	);

	if (viajesField) {
		viajesField.textContent = String(viajes.length);
	}
	if (kilometrosField) {
		kilometrosField.textContent = `${totalKilometros}`;
	}
	if (!list) {
		return;
	}

	list.innerHTML = "";
	viajes.forEach((viaje) => {
		const item = document.createElement("div");
		item.className = "panel";

		const table = document.createElement("table");
		table.width = "100%";

		const row = document.createElement("tr");
		const infoCell = document.createElement("td");
		const actionCell = document.createElement("td");
		actionCell.setAttribute("align", "right");

		const title = document.createElement("p");
		title.className = "label-strong";
		title.textContent = `Origen: ${viaje.origen} - Destino: ${viaje.destino}`;

		const date = document.createElement("p");
		date.className = "label";
		date.textContent = `Fecha y hora: ${viaje.fechaHora}`;

		const actionButton = document.createElement("button");
		actionButton.type = "button";
		actionButton.className = "pure-button btn-icon";
		actionButton.textContent = "I";
		actionButton.setAttribute("data-action", "factura");
		actionButton.setAttribute("data-trip-id", viaje.id);
		actionButton.setAttribute("aria-label", "Ver factura");

		infoCell.appendChild(title);
		infoCell.appendChild(date);
		actionCell.appendChild(actionButton);
		row.appendChild(infoCell);
		row.appendChild(actionCell);
		table.appendChild(row);
		item.appendChild(table);
		list.appendChild(item);
	});
};

const savePerfil = () => {
	const inputs = document.querySelectorAll("input[data-profile]");
	inputs.forEach((input) => {
		const key = input.dataset.profile;
		if (key) {
			perfil[key] = input.value;
		}
	});
	loadPerfil();
};

buttons.forEach((button) => {
	button.addEventListener("click", () => {
		setActiveScreen(button.dataset.target);
	});
});

document.addEventListener("click", (event) => {
	const button = event.target.closest("[data-action]");
	if (!button) {
		return;
	}

	const action = button.dataset.action;
	if (action === "editar") {
		loadPerfil();
		setActiveScreen("editar");
		return;
	}
	if (action === "cancelar") {
		loadPerfil();
		setActiveScreen("datos");
		return;
	}
	if (action === "guardar") {
		savePerfil();
		setActiveScreen("exito");
		return;
	}
	if (action === "volver") {
		setActiveScreen("datos");
		return;
	}
	if (action === "factura") {
		const tripId = button.dataset.tripId;
		const trip = viajes.find((item) => item.id === tripId) ?? null;
		viajeSeleccionado = trip;
		renderFactura(viajeSeleccionado);
		setActiveScreen("factura");
		return;
	}
	if (action === "volver-historial") {
		setActiveScreen("historial");
		return;
	}
	if (action === "buscar-origen") {
		openBusqueda("origen");
		return;
	}
	if (action === "buscar-destino") {
		openBusqueda("destino");
		return;
	}
	if (action === "volver-busqueda") {
		setActiveScreen("viajar");
		return;
	}
	if (action === "seleccionar-cabina") {
		seleccionarCabina(button.dataset.cabinaId);
		return;
	}
	if (action === "popup-origen") {
		seleccionarCabinaDesdePopup(button.dataset.cabinaId, "origen");
		return;
	}
	if (action === "popup-destino") {
		seleccionarCabinaDesdePopup(button.dataset.cabinaId, "destino");
		return;
	}
	if (action === "abrir-streetview") {
		activePopupCabinaId = button.dataset.cabinaId ?? null;
		setActiveScreen("streetview");
		const cabina = cabinas.find((item) => item.id === activePopupCabinaId) ?? null;
		renderStreetView(cabina);
		return;
	}
	if (action === "volver-streetview") {
		setActiveScreen("viajar");
		if (activePopupCabinaId) {
			openPopupForCabina(activePopupCabinaId);
		}
		return;
	}
	if (action === "iniciar-viaje") {
		if (viajeActual.origen && viajeActual.destino) {
			setActiveScreen("qr");
		}
		return;
	}
	if (action === "volver-viaje") {
		setActiveScreen("viajar");
		return;
	}
	if (action === "confirmar-viaje") {
		cabinaDestinoConfirmada = viajeActual.destino;
		const nuevoViaje = crearViaje();
		if (nuevoViaje) {
			viajes.unshift(nuevoViaje);
			viajeSeleccionado = nuevoViaje;
			renderHistorial();
		}
		viajeActual.origen = null;
		viajeActual.destino = null;
		tipoBusqueda = null;
		renderViaje();
		setActiveScreen("viaje-exito");
		return;
	}
	if (action === "finalizar-viaje") {
		viajeActual.origen = null;
		viajeActual.destino = null;
		tipoBusqueda = null;
		renderViaje();
		setActiveScreen("viajar");
		return;
	}
	if (action === "valorar") {
		ratingState.hover = 0;
		renderCabinaImage();
		renderRatingStars();
		setActiveScreen("valoracion");
		return;
	}
	if (action === "confirmar-valoracion") {
		ratingState.selected = 0;
		ratingState.hover = 0;
		renderRatingStars();
		setActiveScreen("viajar");
		return;
	}
});

loadPerfil();
renderViaje();
renderCabinasList();
renderHistorial();
renderFactura(viajeSeleccionado);
bindRatingStars();
mapa = initMapa();
setActiveScreen(defaultScreen);
