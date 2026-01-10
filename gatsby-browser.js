/**
 * Gatsby Browser API
 * Handles client-side route updates and analytics tracking
 */

import "./src/styles/index.scss";
import "uswds";

const env = process.env.NODE_ENV;
const ctx = process.env.CONTEXT || env;

/**
 * Triggered on route updates to track pageviews in Google Analytics
 * Only runs in production when analytics is available
 */
export const onRouteUpdate = ({ location }) => {
  if (!location) {
    console.warn("Location object is undefined in onRouteUpdate");
    return null;
  }
  
  if (ctx !== "production" || !window.gas) {
    return null;
  }
  
  try {
    window.gas("send", "pageview", location.pathname);
  } catch (error) {
    console.error("Error tracking pageview:", error);
  }
};
