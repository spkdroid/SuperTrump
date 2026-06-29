import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',           name: 'Dashboard',   component: () => import('@/views/Dashboard.vue')   },
  { path: '/players',    name: 'Players',     component: () => import('@/views/Players.vue')     },
  { path: '/games',      name: 'Games',       component: () => import('@/views/Games.vue')       },
  { path: '/games/:id',       name: 'GameDetail',    component: () => import('@/views/GameDetail.vue')    },
  { path: '/games/:id/live',  name: 'PlayerScores',  component: () => import('@/views/PlayerScores.vue')  },
  { path: '/leaderboard',     name: 'Leaderboard',   component: () => import('@/views/Leaderboard.vue')   },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
