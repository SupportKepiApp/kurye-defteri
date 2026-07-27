package com.kuryedefteri.app.tr;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import java.io.File;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ExcelOpener")
public class ExcelOpenerPlugin extends Plugin {

    @PluginMethod
    public void openWithChooser(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        try {
            String cleanPath = path.replace("file://", "");
            File file = new File(cleanPath);
            if (!file.exists()) {
                call.reject("file not found: " + cleanPath);
                return;
            }

            String authority = getContext().getPackageName() + ".fileprovider";
            Uri contentUri = FileProvider.getUriForFile(getContext(), authority, file);

            String mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
            viewIntent.setDataAndType(contentUri, mimeType);
            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooserIntent = Intent.createChooser(viewIntent, "Excel dosyasını aç");
            chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(chooserIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open file: " + e.getMessage());
        }
    }
}
