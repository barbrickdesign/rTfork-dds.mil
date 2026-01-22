/**
 * Gatsby Remark Plugin: Relative Pathify Images
 * 
 * This plugin adds a relative path prefix to image URLs in markdown
 * that don't already start with a relative path indicator (.)
 * 
 * @param {Object} markdownAST - The markdown abstract syntax tree
 * @param {Object} pluginOptions - Plugin configuration options
 * @param {string} pluginOptions.relativePathPrefix - The prefix to add to image URLs
 * @returns {Object} The modified markdown AST
 */

var visit = require("unist-util-visit");

module.exports = ({ markdownAST }, pluginOptions) => {
  // Validate inputs
  if (!markdownAST) {
    console.error("gatsby-relative-pathify-images: markdownAST is required");
    return markdownAST;
  }
  
  if (!pluginOptions || !pluginOptions.relativePathPrefix) {
    console.warn("gatsby-relative-pathify-images: relativePathPrefix option is missing");
    return markdownAST;
  }
  
  const { relativePathPrefix } = pluginOptions;
  
  // Visit all image nodes and modify their URLs
  visit(markdownAST, "image", (node) => {
    if (!node.url) {
      console.warn("gatsby-relative-pathify-images: Image node missing URL");
      return;
    }
    
    // Only add prefix if URL doesn't already start with a relative path
    if (!node.url.startsWith(".")) {
      node.url = `${relativePathPrefix}${node.url}`;
    }
  });
  
  return markdownAST;
};
