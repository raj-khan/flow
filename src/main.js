import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { queryClientConfig } from './api/queryClient'
import { migrateLegacyKeys } from './api/storageKeys'

// Library styles first, so ours win where they overlap.
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/node-resizer/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import '@fontsource/patrick-hand/latin.css'
import './style.css'

// Before any store reads its key.
migrateLegacyKeys()

createApp(App)
  .use(createPinia())
  .use(router)
  .use(VueQueryPlugin, { queryClientConfig })
  .mount('#app')
