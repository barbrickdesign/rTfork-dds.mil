/**
 * Gatsby Node API implementation
 * Handles webpack configuration, schema customization, node creation, and page generation
 */

const path = require("path");
const webpack = require(`webpack`);
const SVGO = require("svgo");

/**
 * SVGO instance for optimizing SVG files
 * Removes XML namespaces, inlines styles, converts styles to attributes, and removes IDs
 */
const svgo = new SVGO({
  plugins: [
    { removeXMLNS: true },
    {
      inlineStyles: {
        onlyMatchedOnce: false,
      },
    },
    { convertStyleToAttrs: true },
    {
      removeAttrs: {
        attrs: ["svg:id"],
      },
    },
  ],
});

/**
 * Configures webpack to ignore netlify-identity-widget on the site
 * @see https://www.gatsbyjs.org/packages/gatsby-plugin-netlify-cms/#disable-widget-on-site
 */
exports.onCreateWebpackConfig = ({ actions }) => {
  if (!actions) {
    console.error("Actions object is required for webpack configuration");
    return;
  }
  
  actions.setWebpackConfig({
    plugins: [
      new webpack.IgnorePlugin({
        resourceRegExp: /^netlify-identity-widget$/,
      }),
    ],
  });
};

/**
 * Creates custom GraphQL schema types for the site
 * Defines types for Navigation, SideNav, Sections, and content structure
 */
exports.createSchemaCustomization = ({ actions, schema }) => {
  if (!actions) {
    console.error("Actions object is required for schema customization");
    return;
  }
  
  const { createTypes } = actions;
  const typeDefs = [
    `
      type UserLink {
        text: String
        link: String
      }

      type Navigation {
        title: String
        metaDescription: String
        navOrder: Int
        text: String
        link: String
        subnav: [UserLink]
      }

      type SideNav {
        includeSidenav: Boolean
        wrapSectionFirst: Int
        wrapSectionLast: Int
        menu: [UserLink]
        includeSocial: Boolean
      }

      type IconElement {
        icon: File @link(by: "relativePath")
        title: String
        cta: String
        ctaLink: String
        details: String
      }

      type ImageElement {
        image: File @link(by: "relativePath")
        altText: String
      }

      type CategoryElement {
        title: String
        details: String
        cta: String
        ctaLink: String
      }

      type Section {
        type: String!
        mdMain: MarkdownRemark @link(by: "rawMarkdownBody")
        mdCallout: MarkdownRemark @link(by: "rawMarkdownBody")
        heroImage: File @link(by: "relativePath")
        
        image: File @link(by: "relativePath")
        icons: [IconElement]
        categories: [CategoryElement]
        images: [ImageElement]

        altText: String
        title: String
        subtitle: String
        cta: String
        ctaLink: String

        numberTitles: Boolean
        tweetLimit: Int
      }

      type PagesJson implements Node {
        navigation: Navigation
        sidenav: SideNav
        sections: [Section]
      }

      type Frontmatter {
        image: File @link(by: "relativePath")
      }
      type MarkdownRemark implements Node {
        frontmatter: Frontmatter!
      }

      type ContentJson implements Node {
        defaultHeroImage: File @link(by: "relativePath")
      }
    `,
  ];
  createTypes(typeDefs);
};

/**
 * Processes nodes during creation
 * - Creates slug fields for content types
 * - Recursively creates markdown nodes from JSON fields starting with 'md'
 * - Optimizes and inlines SVG files
 */
exports.onCreateNode = async ({
  node,
  getNode,
  actions,
  createNodeId,
  loadNodeContent,
  createContentDigest,
}) => {
  if (!node || !actions) {
    console.error("Node and actions are required");
    return;
  }
  
  const { createNodeField, createParentChildLink, createNode } = actions;
  const typesToSlug = ["MarkdownRemark", "PagesJson", "ContentJson"];
  
  if (typesToSlug.includes(node.internal.type)) {
    const fileNode = getNode(node.parent);
    if (!fileNode) {
      console.warn(`Parent file node not found for node: ${node.id}`);
      return;
    }
    const fileName = fileNode.name;
    createNodeField({
      node,
      name: "slug",
      value: fileName,
    });
  }

  if (node.internal.type === "PagesJson") {
    /**
     * Recursively creates markdown nodes for any key in the JSON
     * node that starts with 'md'
     */
    const createFieldsForObject = (obj, path) => {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = `${path}${key}`;
        if (typeof value === "string" && key.startsWith("md")) {
          const id = createNodeId(newPath);
          const mdNode = {
            id,
            key,
            children: [],
            parent: node.id,
            internal: {
              type: `JsonMarkdownField`,
              mediaType: "text/markdown",
              content: value,
              contentDigest: createContentDigest(value),
            },
          };
          createNode(mdNode);
          createParentChildLink({ parent: node, child: mdNode });
        } else if (value && typeof value === "object") {
          createFieldsForObject(value, `${newPath}_`);
        }
      });
    };
    createFieldsForObject(node, `${node.id}_`);
  }

  if (node.internal.mediaType === "image/svg+xml") {
    /**
     * Loads content of SVG files so they can be rendered inline
     * Optimizes SVGs using SVGO and creates inline SVG nodes
     */
    try {
      const id = createNodeId(node.id);
      const fileContent = await loadNodeContent(node);
      
      if (!fileContent) {
        console.warn(`Empty content for SVG file: ${node.id}`);
        return;
      }
      
      const { data: rawSvg } = await svgo.optimize(fileContent);
      const svgNode = {
        id,
        children: [],
        rawSvg,
        parent: node.id,
        internal: {
          type: "InlineSvg",
          contentDigest: createContentDigest(rawSvg),
        },
      };
      createNode(svgNode);
      createParentChildLink({ parent: node, child: svgNode });
    } catch (error) {
      console.error(`Error processing SVG file ${node.id}:`, error.message);
    }
  }
};

/**
 * Creates pages programmatically
 * - Static pages from JSON
 * - Media list pages (announcements, blog)
 * - Individual media pages
 * - News list pages
 */
exports.createPages = async ({ graphql, actions: { createPage } }) => {
  if (!graphql || !createPage) {
    console.error("GraphQL and createPage are required");
    return;
  }
  
  //
  //  STATIC PAGES
  //
  const pagesResult = await graphql(`
    {
      allPagesJson {
        nodes {
          navigation {
            link
          }
        }
      }
    }
  `);

  if (pagesResult.errors) {
    console.error("Error fetching pages:", pagesResult.errors);
    throw new Error("Failed to fetch pages");
  }

  const staticPageTemplate = path.resolve("src/templates/static-page.tsx");
  const pages = pagesResult.data.allPagesJson.nodes;
  
  for (let i = 0; i < pages.length; i++) {
    if (!pages[i].navigation || !pages[i].navigation.link) {
      console.warn(`Page ${i} is missing navigation link, skipping`);
      continue;
    }
    
    createPage({
      path: pages[i].navigation.link,
      component: staticPageTemplate,
      context: {
        link: pages[i].navigation.link,
      },
    });
  }

  //
  //  ANNOUNCEMENTS AND BLOG POSTS
  //
  const mediaTypes = [
    ["announcements", "Announcements"],
    ["blog", "Blog"],
  ];
  const mediaListPage = path.resolve("src/templates/media-list.tsx");
  const mediaPage = path.resolve("src/templates/media-page.tsx");
  const pageSize = 10;

  for (let [mediaType, title] of mediaTypes) {
    const mediaResult = await graphql(`{
      allMarkdownRemark(
        filter: { frontmatter: { type: { eq: "${mediaType}" }}}
        sort: { fields: [frontmatter___date], order: DESC }
      ) {
        nodes {
          fields {
            slug
          }
        }
      }
    }`);
    
    if (mediaResult.errors) {
      console.error(`Error fetching ${mediaType}:`, mediaResult.errors);
      continue;
    }
    
    const results = mediaResult.data.allMarkdownRemark.nodes;
    const numPages = Math.ceil(results.length / pageSize);

    // create list pages for this media type
    for (let i = 0; i < numPages; i++) {
      createPage({
        path: i === 0 ? `/media/${mediaType}` : `/media/${mediaType}/${i + 1}`,
        component: mediaListPage,
        context: {
          limit: pageSize,
          skip: i * pageSize,
          mediaType,
          title,
          numPages,
          currentPage: i + 1,
          basePage: `/media/${mediaType}`,
          link: `/media/${mediaType}${i > 0 ? "/" + (i + 1) : ""}`,
        },
      });
    }

    // create individual pages for each of the items of this media type
    for (let i = 0; i < results.length; i++) {
      if (!results[i].fields.externalLink) {
        createPage({
          path: `/media/${mediaType}/${results[i].fields.slug}`,
          component: mediaPage,
          context: {
            slug: results[i].fields.slug,
            link: `/media/${mediaType}/${results[i].fields.slug}`,
            mediaType,
          },
        });
      }
    }
  }

  //
  //  NEWS ARTICLES
  //
  const newsListPage = path.resolve("src/templates/news-list.tsx");
  const newsResult = await graphql(`
    {
      allMarkdownRemark(
        filter: { frontmatter: { type: { eq: "news" } } }
        sort: { fields: [frontmatter___date], order: DESC }
      ) {
        nodes {
          fields {
            slug
          }
        }
      }
    }
  `);
  
  if (newsResult.errors) {
    console.error("Error fetching news articles:", newsResult.errors);
    throw new Error("Failed to fetch news articles");
  }
  
  const results = newsResult.data.allMarkdownRemark.nodes;
  const numPages = Math.ceil(results.length / 15);

  // create list pages for news articles
  for (let i = 0; i < numPages; i++) {
    createPage({
      path: i === 0 ? `/media/news` : `/media/news/${i + 1}`,
      component: newsListPage,
      context: {
        limit: 15,
        skip: i * 15,
        numPages,
        currentPage: i + 1,
        basePage: "/media/news",
        link: `/media/news${i > 0 ? "/" + (i + 1) : ""}`,
      },
    });
  }
};
