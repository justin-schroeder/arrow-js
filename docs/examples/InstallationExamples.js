export default {
  cdn: `<script type="module">
  import { r, t } from 'https://cdn.skypack.dev/@arrow-js/core';
  // Start your app here!
</script>`,
  local: `<script type="module">
  import { r, t } from '/js/arrow.js';
  // Start your app here!
</script>`,
  npm: `npm install @arrow-js/core`,
  yarn: `yarn add @arrow-js/core`,
};
