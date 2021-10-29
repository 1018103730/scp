import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'

import dbs from './datastore'
import md5 from 'md5'
import moment from 'moment';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false
Vue.prototype.$dbs = dbs
Vue.prototype.$md5 = md5
Vue.prototype.$moment = moment


Vue.use(ElementUI);

/* eslint-disable no-new */
new Vue({
    components: {App},
    router,
    store,
    template: '<App/>'
}).$mount('#app')
