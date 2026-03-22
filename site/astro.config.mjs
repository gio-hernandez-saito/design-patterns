import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vue from '@astrojs/vue';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://gio-hernandez-saito.github.io',
  base: '/design-patterns',
  integrations: [
    react(),
    vue(),
    svelte(),
  ],
});
