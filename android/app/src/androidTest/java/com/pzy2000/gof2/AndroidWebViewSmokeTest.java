package com.pzy2000.gof2;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.pm.ActivityInfo;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.UiDevice;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class AndroidWebViewSmokeTest {
    private ActivityScenario<MainActivity> scenario;
    private WebView webView;

    @Before
    public void launchApp() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        AtomicReference<WebView> reference = new AtomicReference<>();
        scenario.onActivity(activity -> reference.set(findWebView(activity.getWindow().getDecorView())));
        webView = reference.get();
        assertNotNull("Capacitor must host the game in a WebView", webView);
        waitForJavaScript("document.readyState === 'complete'", 20_000);
    }

    @After
    public void closeApp() {
        if (scenario != null) scenario.close();
    }

    @Test
    public void loadsOfflineShellWithoutProductionTestHook() throws Exception {
        assertTrue(evaluateBoolean("document.body.innerText.includes('offline single-player build')"));
        assertTrue(evaluateBoolean("typeof window.__GOF2_E2E__ === 'undefined'"));
        assertFalse(evaluateBoolean("document.body.innerText.includes('Sign in to sync')"));
        assertTrue(evaluateBoolean("document.documentElement.scrollWidth <= window.innerWidth + 1"));
    }

    @Test
    public void startsGameRendersWebGlAndHandlesAndroidBack() throws Exception {
        clickButtonContaining("New Offline Game");
        waitForJavaScript("!!document.querySelector('.flight-canvas canvas')", 25_000);
        waitForJavaScript("Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0) > 2", 25_000);

        AtomicReference<Integer> orientation = new AtomicReference<>(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        scenario.onActivity(activity -> orientation.set(activity.getRequestedOrientation()));
        assertTrue("flight must request a landscape orientation",
                orientation.get() == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE ||
                orientation.get() == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE ||
                orientation.get() == ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE);

        String dialogueSelector = "[data-testid='space-dialogue-overlay'], [data-testid='dialogue-overlay']";
        waitForJavaScript("!!document.querySelector(\"" + dialogueSelector + "\")", 10_000);
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
        waitForJavaScript("!document.querySelector(\"" + dialogueSelector + "\")", 10_000);

        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
        waitForJavaScript("document.body.innerText.includes('Resume')", 10_000);
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
        waitForJavaScript("!!document.querySelector('.flight-canvas canvas')", 10_000);
    }

    @Test
    public void survivesBackgroundResumeAndViewportResize() throws Exception {
        clickButtonContaining("New Offline Game");
        waitForJavaScript("!!document.querySelector('.flight-canvas canvas')", 25_000);
        int before = evaluateInteger("Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0)");
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);
        SystemClock.sleep(500);
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);
        waitForJavaScript("Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0) > " + before, 15_000);
        assertTrue(evaluateBoolean("document.documentElement.scrollWidth <= window.innerWidth + 1"));
    }

    @Test
    public void releasesPreviousFlightContextBeforeStationRelaunch() throws Exception {
        clickButtonContaining("New Offline Game");
        waitForJavaScript("!!document.querySelector('.flight-canvas canvas')", 25_000);
        waitForJavaScript("Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0) > 2", 25_000);

        String dialogueSelector = "[data-testid='space-dialogue-overlay'], [data-testid='dialogue-overlay']";
        if (evaluateBoolean("!!document.querySelector(\"" + dialogueSelector + "\")")) {
            UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
            waitForJavaScript("!document.querySelector(\"" + dialogueSelector + "\")", 10_000);
        }

        waitForJavaScript(
                "(() => { " +
                "if ([...document.querySelectorAll('button')].some(button => button.textContent.includes('Launch'))) return true; " +
                "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); " +
                "return false; })()",
                35_000);
        waitForJavaScript("!document.querySelector('.flight-canvas canvas')", 10_000);
        scenario.onActivity(activity -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
        waitForJavaScript("window.innerHeight > window.innerWidth", 15_000);
        int beforeLaunch = evaluateInteger("Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0)");
        SystemClock.sleep(500);
        assertTrue("station must stop the previous render loop",
                evaluateInteger("Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0)") == beforeLaunch);

        clickButtonContaining("Launch");
        waitForJavaScript(
                "!!document.querySelector('[data-testid=game-recovery]') || " +
                "(window.innerWidth > window.innerHeight && Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0) >= " + (beforeLaunch + 3) + ")",
                25_000);

        assertFalse("station relaunch must not enter recovery mode",
                evaluateBoolean("!!document.querySelector('[data-testid=game-recovery]')"));
        assertTrue(evaluateBoolean("!!document.querySelector('.flight-canvas canvas')"));
        assertTrue(evaluateInteger("Number(window.__GOF2_RENDER_HEARTBEAT_FRAME__ || 0)") >= beforeLaunch + 3);
        assertTrue("station relaunch must restore landscape flight", evaluateBoolean("window.innerWidth > window.innerHeight"));

        AtomicReference<Integer> orientation = new AtomicReference<>(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        scenario.onActivity(activity -> orientation.set(activity.getRequestedOrientation()));
        assertTrue("station relaunch must request a landscape orientation",
                orientation.get() == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE ||
                orientation.get() == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE ||
                orientation.get() == ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE);
    }

    private void clickButtonContaining(String label) throws Exception {
        String escaped = label.replace("'", "\\'");
        String script = "(() => { const b=[...document.querySelectorAll('button')].find(x => x.textContent.includes('" + escaped + "')); if (!b) return false; b.click(); return true; })()";
        assertTrue("Expected button containing: " + label, evaluateBoolean(script));
    }

    private void waitForJavaScript(String expression, long timeoutMs) throws Exception {
        long deadline = SystemClock.uptimeMillis() + timeoutMs;
        while (SystemClock.uptimeMillis() < deadline) {
            if (evaluateBoolean(expression)) return;
            SystemClock.sleep(200);
        }
        throw new AssertionError("Timed out waiting for JavaScript: " + expression);
    }

    private boolean evaluateBoolean(String expression) throws Exception {
        return "true".equals(evaluate("Boolean(" + expression + ")"));
    }

    private int evaluateInteger(String expression) throws Exception {
        return Integer.parseInt(evaluate("Math.floor(" + expression + ")"));
    }

    private String evaluate(String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                webView.evaluateJavascript(script, value -> {
                    result.set(value == null ? "null" : value.replace("\"", ""));
                    latch.countDown();
                }));
        assertTrue("JavaScript callback timed out", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }

    private static WebView findWebView(View view) {
        if (view instanceof WebView) return (WebView) view;
        if (!(view instanceof ViewGroup)) return null;
        ViewGroup group = (ViewGroup) view;
        for (int index = 0; index < group.getChildCount(); index++) {
            WebView match = findWebView(group.getChildAt(index));
            if (match != null) return match;
        }
        return null;
    }
}
