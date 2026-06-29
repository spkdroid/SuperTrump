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
import './styles/theme.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'supertrump',
    themes: {
      supertrump: {
        dark: false,
        colors: {
          background:             '#F4F8FF',
          surface:                '#FFFFFF',
          'surface-variant':      '#EAF2FF',
          primary:                '#1D4ED8',
          'primary-darken-1':     '#1E40AF',
          secondary:              '#0EA5E9',
          'secondary-darken-1':   '#0284C7',
          error:                  '#DC2626',
          info:                   '#0284C7',
          success:                '#16A34A',
          warning:                '#D97706',
          'on-background':        '#0F172A',
          'on-surface':           '#0F172A',
          'on-surface-variant':   '#475569',
          'on-primary':           '#FFFFFF',
          'on-secondary':         '#FFFFFF',
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
