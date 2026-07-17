package com.pzy2000.gof2;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import org.junit.Test;

public class AndroidConfigurationTest {
    @Test
    public void usesStableApplicationIdAndVersion() {
        assertEquals("com.pzy2000.gof2", BuildConfig.APPLICATION_ID);
        assertFalse(BuildConfig.VERSION_NAME.isBlank());
    }
}
