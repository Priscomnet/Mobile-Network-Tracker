package com.priscom.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.CellInfo;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoWcdma;
import android.telephony.CellInfoNr;
import android.telephony.CellIdentityLte;
import android.telephony.CellIdentityWcdma;
import android.telephony.CellIdentityNr;
import android.telephony.CellSignalStrengthLte;
import android.telephony.CellSignalStrengthWcdma;
import android.telephony.CellSignalStrengthNr;
import android.telephony.TelephonyManager;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

@CapacitorPlugin(
    name = "PriscomTelephony",
    permissions = {
        @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION}, alias = "location"),
        @Permission(strings = {Manifest.permission.READ_PHONE_STATE}, alias = "phone")
    }
)
public class PriscomTelephonyPlugin extends Plugin {

    @PluginMethod
    public void getCellInfo(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        readAndReturnCellInfo(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            readAndReturnCellInfo(call);
        } else {
            call.reject("Location permission is required to read cell measurements.");
        }
    }

    private void readAndReturnCellInfo(PluginCall call) {
        try {
            TelephonyManager tm = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
            if (tm == null) {
                call.reject("Telephony service unavailable");
                return;
            }

            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Location permission missing");
                return;
            }

            List<CellInfo> cellInfoList = tm.getAllCellInfo();
            JSArray resultList = new JSArray();

            if (cellInfoList != null) {
                for (CellInfo info : cellInfoList) {
                    JSObject cellObj = new JSObject();
                    cellObj.put("registered", info.isRegistered());

                    if (info instanceof CellInfoLte) {
                        CellInfoLte lte = (CellInfoLte) info;
                        CellIdentityLte id = lte.getCellIdentity();
                        CellSignalStrengthLte signal = lte.getCellSignalStrength();

                        cellObj.put("technology", "4G LTE");
                        int ci = id.getCi();
                        cellObj.put("cellId", ci != Integer.MAX_VALUE ? ci : null);
                        cellObj.put("enodebId", ci != Integer.MAX_VALUE ? (ci >> 8) : null);
                        cellObj.put("pci", id.getPci() != Integer.MAX_VALUE ? id.getPci() : null);
                        cellObj.put("tac", id.getTac() != Integer.MAX_VALUE ? id.getTac() : null);
                        cellObj.put("earfcn", id.getEarfcn() != Integer.MAX_VALUE ? id.getEarfcn() : null);
                        cellObj.put("mcc", id.getMccString());
                        cellObj.put("mnc", id.getMncString());

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            cellObj.put("rsrp", signal.getRsrp() != Integer.MAX_VALUE ? signal.getRsrp() : null);
                            cellObj.put("rsrq", signal.getRsrq() != Integer.MAX_VALUE ? signal.getRsrq() : null);
                            cellObj.put("sinr", signal.getRssnr() != Integer.MAX_VALUE ? signal.getRssnr() : null);
                        } else {
                            cellObj.put("rsrp", signal.getDbm() != Integer.MAX_VALUE ? signal.getDbm() : null);
                            cellObj.put("rsrq", null);
                            cellObj.put("sinr", null);
                        }
                        resultList.put(cellObj);

                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && info instanceof CellInfoNr) {
                        CellInfoNr nr = (CellInfoNr) info;
                        CellIdentityNr id = (CellIdentityNr) nr.getCellIdentity();
                        CellSignalStrengthNr signal = (CellSignalStrengthNr) nr.getCellSignalStrength();

                        cellObj.put("technology", "5G NR");
                        long nci = id.getNci();
                        cellObj.put("cellId", nci != Long.MAX_VALUE ? nci : null);
                        cellObj.put("pci", id.getPci() != Integer.MAX_VALUE ? id.getPci() : null);
                        cellObj.put("tac", id.getTac() != Integer.MAX_VALUE ? id.getTac() : null);
                        cellObj.put("nrarfcn", id.getNrarfcn() != Integer.MAX_VALUE ? id.getNrarfcn() : null);
                        cellObj.put("mcc", id.getMccString());
                        cellObj.put("mnc", id.getMncString());
                        cellObj.put("rsrp", signal.getDbm() != Integer.MAX_VALUE ? signal.getDbm() : null);
                        cellObj.put("rsrq", null);
                        cellObj.put("sinr", null);

                        resultList.put(cellObj);
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("cells", resultList);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to retrieve cell info: " + e.getLocalizedMessage());
        }
    }

    @PluginMethod
    public void getNetworkInfo(PluginCall call) {
        try {
            TelephonyManager tm = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
            JSObject ret = new JSObject();
            if (tm != null) {
                ret.put("operatorName", tm.getNetworkOperatorName());
                ret.put("simOperatorName", tm.getSimOperatorName());
                ret.put("isNetworkRoaming", tm.isNetworkRoaming());
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to retrieve network info: " + e.getLocalizedMessage());
        }
    }
}