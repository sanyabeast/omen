package xyz.sanyabeast.jive;
import android.app.Activity;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.gson.Gson;


/**
 * Created by User13 on 19.03.2018.
 */

public class WebToolchain {
    WebView webview;
    Activity mainActivity;
    WebSettings settings;
    WebViewClient client = new WebViewClient();
    WebAppInterface webinterface;

    public WebToolchain(Activity activity){
        mainActivity = activity;
        webinterface = new WebAppInterface(activity);

        webview = (WebView) mainActivity.findViewById(R.id.webview);
        webview.setWebViewClient(client);
        webview.addJavascriptInterface(webinterface, "_android");


        settings = webview.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccessFromFileURLs(true); //Maybe you don't need this rule
        settings.setAllowUniversalAccessFromFileURLs(true);

        webview.loadUrl("https://google.com");
    }

    public void open(String location){
        webview.loadUrl(location);
    }

    public void onBackButtonPressed(){

    }

    public void send(Envelope envelope){
        Gson gson = new Gson();
        String json = gson.toJson(envelope);
        webview.loadUrl("javascript:postal.say('android::bridge', " + json + ")");
    }
}
