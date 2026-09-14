from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

# ============================================================
# CONFIGURATION
# ============================================================

HOST = "0.0.0.0"
PORT = 8000

# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/v1/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "Priscom Cellular Telemetry API",
        "timestamp": time.time()
    })


# ============================================================
# RECEIVE REAL PHONE TELEMETRY
# ============================================================

@app.route("/api/v1/telemetry", methods=["POST"])
def telemetry():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "No telemetry data received"
        }), 400

    print("\n========== PHONE TELEMETRY ==========")

    print("Operator :", data.get("operator"))
    print("Technology:", data.get("technology"))
    print("dBm      :", data.get("dbm"))
    print("RSRP     :", data.get("rsrp"))
    print("RSRQ     :", data.get("rsrq"))
    print("SINR     :", data.get("sinr"))
    print("Cell ID  :", data.get("cellId"))
    print("PCI      :", data.get("pci"))
    print("TAC/LAC  :", data.get("tac"))
    print("MCC      :", data.get("mcc"))
    print("MNC      :", data.get("mnc"))
    print("Latitude :", data.get("lat"))
    print("Longitude:", data.get("lng"))

    print("======================================\n")

    return jsonify({
        "success": True,
        "received": True,
        "timestamp": time.time()
    })


# ============================================================
# TOWER INFORMATION
# ============================================================
#
# IMPORTANT:
# We DO NOT invent tower coordinates.
#
# Until a real tower/cell database is connected, the API
# reports that tower location is unavailable.
#
# ============================================================

@app.route("/api/v1/tower-info", methods=["POST"])
def tower_info():

    data = request.get_json(silent=True) or {}

    cell_id = data.get("cellId")
    mcc = data.get("mcc")
    mnc = data.get("mnc")
    technology = data.get("technology")

    return jsonify({
        "success": True,
        "found": False,

        "tower": {
            "name": "Tower location unavailable",
            "latitude": None,
            "longitude": None,
            "distanceKm": None,
            "bearing": None
        },

        "cell": {
            "cellId": cell_id,
            "mcc": mcc,
            "mnc": mnc,
            "technology": technology
        },

        "message": (
            "No tower database match is available for this cell. "
            "Physical tower coordinates require a real cell/tower database."
        )
    })


# ============================================================
# SPEED TEST DOWNLOAD
# ============================================================
#
# This endpoint is ONLY useful when the phone can reach this
# Flask server through the network.
#
# It measures throughput between the phone and this server.
#
# It must NOT be labelled as cellular Internet speed unless
# this server itself is reached through the cellular network.
#
# ============================================================

@app.route("/api/v1/speedtest/download", methods=["GET"])
def speedtest_download():

    try:
        size_mb = int(request.args.get("mb", 5))

        # Safety limit
        size_mb = max(1, min(size_mb, 50))

        size_bytes = size_mb * 1024 * 1024

        payload = b"0" * size_bytes

        return Response(
            payload,
            status=200,
            mimetype="application/octet-stream",
            headers={
                "Cache-Control": "no-store",
                "Content-Length": str(size_bytes)
            }
        )

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# SPEED TEST UPLOAD
# ============================================================

@app.route("/api/v1/speedtest/upload", methods=["POST"])
def speedtest_upload():

    try:
        start = time.perf_counter()

        total_bytes = 0

        while True:
            chunk = request.stream.read(64 * 1024)

            if not chunk:
                break

            total_bytes += len(chunk)

        elapsed = time.perf_counter() - start

        if elapsed <= 0:
            elapsed = 0.001

        mbps = (total_bytes * 8) / elapsed / 1_000_000

        return jsonify({
            "success": True,
            "bytes": total_bytes,
            "seconds": round(elapsed, 3),
            "mbps": round(mbps, 2)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    print("")
    print("==============================================")
    print("   PRISCOM CELLULAR TELEMETRY SERVER")
    print("==============================================")
    print(f"Server: http://0.0.0.0:{PORT}")
    print("")
    print("Endpoints:")
    print("  GET  /api/v1/health")
    print("  POST /api/v1/telemetry")
    print("  POST /api/v1/tower-info")
    print("  GET  /api/v1/speedtest/download")
    print("  POST /api/v1/speedtest/upload")
    print("")
    print("Waiting for phone telemetry...")
    print("==============================================")
    print("")

    app.run(
        host=HOST,
        port=PORT,
        debug=True,
        threaded=True
    )