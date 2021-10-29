import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
    routes: [
        {
            path: '/',
            name: 'index',
            component: require('@/pages/Index').default
        },
        {
            path: '/settings',
            name: 'settings',
            component: require('@/pages/Setting').default
        },
        {
            path: '*',
            redirect: '/'
        }
    ]
})
