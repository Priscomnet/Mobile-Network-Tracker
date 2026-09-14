// ============================================================
// PRISCOM NET-TECH
// DIRECT ANDROID CELLULAR TELEMETRY
// ============================================================
import { registerPlugin } from '@capacitor/core';

const PriscomTelephony = registerPlugin('PriscomTelephony');

alert(
    "CAPACITOR CHECK\n" +
    "Capacitor exists: " + (typeof Capacitor) + "\n" +
    "registerPlugin: " + (typeof Capacitor?.registerPlugin) + "\n" +
    "Plugins: " + Object.keys(Capacitor?.Plugins || {}).join(", ")
);

alert("CHECKPOINT 1");

let PriscomTelephony;

try {
    alert("BEFORE PLUGIN REGISTRATION");

    PriscomTelephony = Capacitor.Plugins.PriscomTelephony;

    alert(
        "PLUGIN FOUND: " +
        (PriscomTelephony ? "YES" : "NO")
    );
} catch (error) {
    alert(
        "PLUGIN REGISTRATION FAILED\n\n" +
        "Message: " + error.message + "\n\n" +
        "Name: " + error.name
    );
}

let currentCoordinates = null;
let leafMap = null;
let userMarker = null;
let refreshing = false;

function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
        el.textContent = value;
    }
}
alert("SCRIPT.JS IS LOADED");
function getGPS() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                currentCoordinates = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };

                setText("sb-gps-acc", `${Math.round(position.coords.accuracy)} m`);
                setText("val-map-gps-coords", `${currentCoordinates.lat.toFixed(5)}° N, ${currentCoordinates.lng.toFixed(5)}° E`);

                if (leafMap && userMarker) {
                    userMarker.setLatLng([currentCoordinates.lat, currentCoordinates.lng]);
                    leafMap.setView([currentCoordinates.lat, currentCoordinates.lng], 15);
                }

                resolve(currentCoordinates);
            },
            error => {
                console.warn("GPS unavailable:", error.message);
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000
            }
        );
    });
}

function initMap() {
    const mapElement = document.getElementById("leaflet-map-container");
    if (!mapElement || typeof L === "undefined") return;

    leafMap = L.map("leaflet-map-container", { zoomControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(leafMap);

    leafMap.setView([0, 0], 2);
    userMarker = L.marker([0, 0]).addTo(leafMap).bindPopup("Priscom Telemetry Node");
}

function normalizeTechnology(cell, network) {
    const tech = cell?.technology || network?.technology || "";
    const value = String(tech).toUpperCase();

    if (value.includes("NR") || value.includes("5G")) return "5G";
    if (value.includes("LTE") || value.includes("4G")) return "4G";
    if (value.includes("WCDMA") || value.includes("3G")) return "3G";
    if (value.includes("GSM") || value.includes("2G")) return "2G";
    return tech || "4G";
}

function findServingCell(raw) {
    let cells = raw?.cells || raw?.cellInfo || raw?.data || (Array.isArray(raw) ? raw : []);
    if (!cells.length) return null;

    const registered = cells.filter(c => c.registered === true || c.isRegistered === true);
    return registered.length ? registered[0] : cells[0];
}

function signalRating(dbm) {
    if (dbm === null || dbm === undefined) return "Unavailable";
    const val = Number(dbm);
    if (val >= -85) return "Excellent";
    if (val >= -95) return "Good";
    if (val >= -105) return "Fair";
    if (val >= -115) return "Poor";
    return "Very Poor";
}

function updateSignalBars(dbm) {
    const container = document.getElementById("dynamic-signal-bars");
    if (!container) return;
    const bars = container.querySelectorAll(".bar");

    let count = 1;
    if (dbm >= -85) count = 5;
    else if (dbm >= -95) count = 4;
    else if (dbm >= -105) count = 3;
    else if (dbm >= -115) count = 2;

    bars.forEach((bar, index) => {
        if (index < count) bar.classList.add("fill");
        else bar.classList.remove("fill");
    });
}

async function refreshDashboard() {
    alert("STEP 1: refreshDashboard is running");
    if (refreshing) return;
    refreshing = true;

    try {
        alert("STEP 1: JavaScript reached refreshDashboard");

        const rawCellInfo = await PriscomTelephony.getCellInfo();

        alert("STEP 2: Native plugin returned");

        alert("NATIVE RESPONSE: " + JSON.stringify(rawCellInfo));
        let networkInfo = {};

        try {
            networkInfo = await PriscomTelephony.getNetworkInfo();
        } catch (e) {
            console.warn("Network info warning:", e.message);
        }

        const cell = findServingCell(rawCellInfo);
        if (!cell) {
            setText("val-signal-rating", "No Signal");
            return;
        }

        const technology = normalizeTechnology(cell, networkInfo);
        const rsrp = cell.rsrp ?? cell.dbm ?? null;
        const rsrq = cell.rsrq ?? null;
        const sinr = cell.sinr ?? null;
        const operator = networkInfo?.operatorName || cell?.operatorName || "Carrier";

        const cellId = cell.cellId ?? null;
        const enodeb = cell.enodebId ?? (cellId ? cellId >> 8 : null);
        const pci = cell.pci ?? null;
        const tac = cell.tac ?? null;
        const mcc = cell.mcc ?? null;
        const mnc = cell.mnc ?? null;
        const earfcn = cell.earfcn ?? cell.nrarfcn ?? null;

        setText("val-operator-logo", operator.substring(0, 4).toUpperCase());
        setText("val-operator-title", operator);
        setText("val-dt-operator", operator);
        setText("val-net-type-tag", technology);
        setText("top-net-tech", technology);

        if (rsrp !== null) {
            setText("val-rsrp", rsrp);
            setText("val-rsrp-sub", rsrp);
            setText("comp-cur-sig", `${rsrp} dBm`);
            setText("val-signal-rating", signalRating(rsrp));
            updateSignalBars(rsrp);
        }

        setText("val-rsrq", rsrq !== null ? rsrq : "N/A");
        setText("val-sinr", sinr !== null ? sinr : "N/A");
        setText("val-band", earfcn ? `EARFCN ${earfcn}` : "N/A");
        setText("val-dt-band", earfcn ? `EARFCN ${earfcn}` : "N/A");

        setText("val-tower-name", `${operator} Tower`);
        setText("val-dt-tower-name", `${operator} Tower`);
        setText("val-cell-id", cellId !== null ? cellId : "N/A");
        setText("val-dt-cellid", cellId !== null ? cellId : "N/A");
        setText("val-pci", pci !== null ? pci : "N/A");
        setText("val-dt-pci", pci !== null ? pci : "N/A");
        setText("val-enodeb", enodeb !== null ? enodeb : "N/A");
        setText("val-dt-enodeb", enodeb !== null ? enodeb : "N/A");
        setText("val-dt-lac", tac !== null ? tac : "N/A");
        setText("val-dt-mccmnc", mcc && mnc ? `${mcc} / ${mnc}` : "N/A");

        // Clear active throughput placeholders
        setText("val-dl-speed", "--");
        setText("val-ul-speed", "--");
        setText("val-latency", "--");
        setText("val-packet-loss", "--");

        await getGPS();
    } catch (error) {
        console.error("Telemetry Error:", error);
    } finally {
        refreshing = false;
    }
}

window.triggerManualScan = function() { refreshDashboard(); };
window.recenterMapOnUser = function() {
    if (leafMap && currentCoordinates) {
        leafMap.setView([currentCoordinates.lat, currentCoordinates.lng], 16);
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    initMap();
    await refreshDashboard();
    setInterval(refreshDashboard, 5000);
});