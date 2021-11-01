const state = {
    settings: {}
}

const mutations = {
    updateSettings(state, settings) {
        state.settings = settings
    },
}

const actions = {}

export default {
    state,
    mutations,
    actions,
    namespaced: true
}
