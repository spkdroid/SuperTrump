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
          background:             '#F0F2F5',
          surface:                '#FFFFFF',
          'surface-variant':      '#F7F8FA',
          primary:                '#1877F2',
          'primary-darken-1':     '#166FE5',
          secondary:              '#42B72A',
          'secondary-darken-1':   '#36A420',
          error:                  '#D93025',
          info:                   '#1877F2',
          success:                '#31A24C',
          warning:                '#F0A202',
          'on-background':        '#1C1E21',
          'on-surface':           '#1C1E21',
          'on-surface-variant':   '#65676B',
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
