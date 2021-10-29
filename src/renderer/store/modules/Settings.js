import dbs from '../../datastore'

const state = {
    settings: {}
}

const mutations = {
    updateSettings(state, settings) {
        console.log(settings)
        state.settings = settings

        dbs.settings.update({_id: state.settings._id}, {$set: state.settings}, (err, numReplaced) => {
        })
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
