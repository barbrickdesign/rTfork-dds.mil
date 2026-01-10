/**
 * Robots.txt Configuration
 * 
 * Configures robot crawling behavior based on deployment environment
 * - Production: Allows all robots except /admin
 * - Branch/Preview deploys: Disallows all robots
 * 
 * @see https://www.gatsbyjs.com/plugins/gatsby-plugin-robots-txt/
 */

const { NODE_ENV, URL = "https://dds.mil", CONTEXT = NODE_ENV } = process.env;

/**
 * Validates and returns the current environment context
 * @returns {string} The current environment context
 */
const resolveEnv = () => {
  if (!CONTEXT) {
    console.warn("CONTEXT environment variable not set, using NODE_ENV");
  }
  return CONTEXT;
};

module.exports = {
  resolveEnv,
  env: {
    production: {
      policy: [{ userAgent: "*", disallow: ["/admin"] }],
      sitemap: `${URL}/sitemap.xml`,
      host: URL,
    },
    "branch-deploy": {
      policy: [{ userAgent: "*", disallow: ["*"] }],
      sitemap: null,
      host: null,
    },
    "deploy-preview": {
      policy: [{ userAgent: "*", disallow: ["*"] }],
      sitemap: null,
      host: null,
    },
  },
};
