/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    docs: { url: '/', static: true },
    src: { url: '/dev' },
    dist: { url: '/dist', static: true },
  },
  plugins: ['@snowpack/plugin-typescript'],
  routes: [
    /* Enable an SPA Fallback in development: */
    // {"match": "routes", "src": ".*", "dest": "/index.html"},
  ],
  optimize: {
    /* Example: Bundle your final build: */
    // "bundle": true,
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    out: 'public',
  },
};
