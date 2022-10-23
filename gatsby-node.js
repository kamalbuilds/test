const { resolve } = require('path');
const env = require('@codesandbox/common/lib/config/env');

// Parse date information out of post filename.

const DOCUMENTATION_FILENAME_REGEX = /[0-9]+-(.*)\.md$/;

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `MarkdownRemark`) {
    const { url } = node.frontmatter;
    const { relativePath } = getNode(node.parent);

    createNodeField({
      node,
      name: 'path',
      value: relativePath,
    });

    if (relativePath.includes('docs')) {
      const match = DOCUMENTATION_FILENAME_REGEX.exec(relativePath);

      createNodeField({
        node,
        name: `slug`,
        value: `/docs/${match[1]}`,
      });
    }

    // Used by createPages() above to register redirects.
    createNodeField({
      node,
      name: 'url',
      value: url ? '/docs' + url : node.fields.slug,
    });
  }
};

exports.createPages = async ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions;

  const docsTemplate = resolve(__dirname, './src/templates/docs.js');

  // Redirect /index.html to root.
  createRedirect({
    fromPath: '/index.html',
    redirectInBrowser: true,
    toPath: '/',
  });

  const allMarkdown = await graphql(
    `
      {
        allMarkdownRemark(
          filter: { fileAbsolutePath: { regex: "/docs/" } }
          limit: 1000
        ) {
          edges {
            node {
              fields {
                slug
                url
              }
            }
          }
        }
      }
    `
  );

  if (allMarkdown.errors) {
    console.error(allMarkdown.errors);

    throw Error(allMarkdown.errors);
  }

  allMarkdown.data.allMarkdownRemark.edges.forEach(edge => {
    const slug = edge.node.fields.slug;
    const url = edge.node.fields.url;

    if (slug.includes('docs/')) {
      let template;
      if (slug.includes('docs/')) {
        template = docsTemplate;
      }

      const createArticlePage = path =>
        createPage({
          path,
          component: template,
          context: {
            slug,
          },
        });

      // Register primary URL.
      createArticlePage(url || slug);
    }
  });
};

exports.onCreateWebpackConfig = ({
  stage,
  getConfig,
  loaders,
  actions,
  plugins,
}) => {
  if (stage === 'build-html') {
    actions.setWebpackConfig({
      module: {
        rules: [
          {
            test: /gsap/,
            use: loaders.null(),
          },
        ],
      },
    });
  }

  actions.setWebpackConfig({
    plugins: [plugins.define(env.default)],
  });

  const config = getConfig();

  config.module.rules = [
    // Omit the default rule where test === '\.jsx?$'
    ...config.module.rules.filter(
      rule => String(rule.test) !== String(/\.jsx?$/)
    ),

    // Recreate it with custom exclude filter
    {
      // Called without any arguments, `loaders.js` will return an
      // object like:
      // {
      //   options: undefined,
      //   loader: '/path/to/node_modules/gatsby/dist/utils/babel-loader.js',
      // }
      // Unless you're replacing Babel with a different transpiler, you probably
      // want this so that Gatsby will apply its required Babel
      // presets/plugins.  This will also merge in your configuration from
      // `babel.config.js`.
      ...loaders.js(),

      test: /\.jsx?$/,

      // Exclude all node_modules from transpilation, except for 'common' and 'app'
      exclude: modulePath =>
        /node_modules/.test(modulePath) &&
        !/node_modules\/(common|app)/.test(modulePath),
    },
  ];

  // This will completely replace the webpack config with the modified object.
  actions.replaceWebpackConfig(config);
};
