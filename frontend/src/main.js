import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VueApexCharts from 'vue3-apexcharts'
import router from './router'
import App from './App.vue'

import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'supertrump',
    themes: {
      supertrump: {
        dark: true,
        colors: {
          background:             '#090E09',
          surface:                '#0F1810',
          'surface-variant':      '#162B1B',
          primary:                '#4ADE80',
          'primary-darken-1':     '#22C55E',
          secondary:              '#FCD34D',
          'secondary-darken-1':   '#F59E0B',
          error:                  '#F87171',
          info:                   '#60A5FA',
          success:                '#4ADE80',
          warning:                '#FBBF24',
          'on-background':        '#DCF0E2',
          'on-surface':           '#C4E8CA',
          'on-surface-variant':   '#7BAE8A',
          'on-primary':           '#052E16',
          'on-secondary':         '#1C1000',
        },
      },
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.use(VueApexCharts)
app.mount('#app')
