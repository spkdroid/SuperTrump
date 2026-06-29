import { createRouter, createWebHistory } from 'vue-router'
import { loadSession } from '@/utils/session'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  { path: '/',                name: 'Dashboard',   component: () => import('@/views/Dashboard.vue')   },
  { path: '/players',         name: 'Players',     component: () => import('@/views/Players.vue')     },
  { path: '/games',           name: 'Games',       component: () => import('@/views/Games.vue')       },
  { path: '/games/:id',       name: 'GameDetail',  component: () => import('@/views/GameDetail.vue')  },
  { path: '/games/:id/live',  name: 'PlayerScores', component: () => import('@/views/PlayerScores.vue') },
  { path: '/leaderboard',     name: 'Leaderboard', component: () => import('@/views/Leaderboard.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const session = loadSession()
  const isLoggedIn = Boolean(session?.username)
  const isPublic = Boolean(to.meta?.public)

  if (!isLoggedIn && !isPublic) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
    }
  }

  if (isLoggedIn && to.name === 'Login') {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/'
    return redirect
  }

  return true
})

export default router
