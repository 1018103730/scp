import dbs from '../../datastore'

const state = {
    settings: {}
}

const mutations = {
    updateSettings(state, settings, needUpdate = false) {
        state.settings = settings

        if (needUpdate) {
            //todo 更新数据库
        }
    },
    updateField(state, data) {
        state.settings[data.key] = data.value;

        console.log(dbs);

        dbs.settings.update({_id: state.settings._id}, {$set: state.settings}, (err, numReplaced) => {
        })
    }
}

const actions = {}

export default {
    state,
    mutations,
    actions,
    namespaced: true
}
