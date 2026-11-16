package com.exmark.erp;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Ensure dark theme background matches EXMARK (#070d18) to prevent white flash
                webView.setBackgroundColor(Color.parseColor("#070d18"));
            }
        } catch (Exception ignored) {}
    }
}
