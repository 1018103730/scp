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
import default_setting from "./default_setting";

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false
Vue.prototype.$dbs = dbs
Vue.prototype.$md5 = md5
Vue.prototype.$moment = moment

//初始化配置
dbs.settings.count({}, (err, count) => {
    if (count === 0) {
        let doc = default_setting;
        dbs.settings.insert(doc, (err, newDoc) => {
            store.commit('Settings/updateSettings', newDoc);
        })

    } else {
        dbs.settings.findOne({}, (err, data) => {
            //todo  检测是否不存在默认配置中存在的的配置 如果有 就动态更新到数据库并写入data
            for (let key in default_setting) {
                if (!data[key]) {
                    data[key] = default_setting[key];
                }
            }
            //配置信息
            store.commit('Settings/updateSettings', data);
        });
    }
});

Vue.use(ElementUI);

/* eslint-disable no-new */
new Vue({
    components: {App},
    router,
    store,
    template: '<App/>'
}).$mount('#app')
