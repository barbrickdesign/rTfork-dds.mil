/**
 * Gatsby Server-Side Rendering (SSR) API
 * Configures server-side rendering behavior, including analytics scripts
 */

import React from "react";

/**
 * Injects Digital Analytics Program (DAP) script into the page body
 * Only runs in production environment
 * @see https://digital.gov/guides/dap/
 */
export const onRenderBody = ({ setPostBodyComponents }) => {
  if (process.env.NODE_ENV !== `production`) {
    return null;
  }
  
  const dapSrc = `https://dap.digitalgov.gov/Universal-Federated-Analytics-Min.js?agency=DOD`;
  
  try {
    return setPostBodyComponents([<script src={dapSrc} id="_fed_an_ua_tag" />]);
  } catch (error) {
    console.error("Error setting post-body components:", error);
    return null;
  }
};
