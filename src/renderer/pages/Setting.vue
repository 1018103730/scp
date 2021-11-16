<template>
  <div id="settings">
    <top-nav></top-nav>
    <el-form ref="form" :model="form" label-width="80px" size="mini" label-position="top" class="from">
      <el-form-item label="ID显示长度">
        <el-input v-model="form.record_id_simple_length"></el-input>
      </el-form-item>
      <el-form-item label="内容显示长度">
        <el-input v-model="form.record_content_simple_length"></el-input>
      </el-form-item>
      <el-form-item label="未复用最大存储数量">
        <el-input v-model="form.maximum_records_num"></el-input>
        <span class="help-info"><i class="el-icon-warning"></i> 当前已存储 {{ count }} 条未复用数据!</span>
      </el-form-item>
      <el-form-item label="最长存储时间">
        <el-input v-model="form.time_since_last_update_day"></el-input>
      </el-form-item>
      <el-form-item label="搜索时两端间距">
        <el-input v-model="form.margin_length_when_search"></el-input>
      </el-form-item>
      <el-form-item label="关闭窗口后">
        <el-radio v-model="form.close_window_type" label="background">后台运行</el-radio>
        <el-radio v-model="form.close_window_type" label="exit">退出程序</el-radio>
      </el-form-item>
      <el-form-item label="开始启动">
        <el-radio v-model="form.is_auto_run" label="1">开机启动</el-radio>
        <el-radio v-model="form.is_auto_run" label="0">不自动启动</el-radio>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSubmit">修改设置</el-button>
        <el-button>取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import TopNav from "../components/TopNav";
import dbs from "../datastore";

export default {
  name: "settings",
  data() {
    return {
      count: 0,
    }
  },
  computed: {
    form() {
      return this.$store.state.Settings.settings;
    }
  },
  components: {TopNav},
  mounted() {
    dbs.records.count({reuse_time: {$lte: 0}}, (err, count) => {
      this.count = count;
    });
  },
  methods: {
    onSubmit() {
      this.$store.commit('Settings/updateSettings', this.form);
      dbs.settings.update({_id: this.form._id}, {$set: this.form}, (err, numReplaced) => {
        this.$electron.ipcRenderer.send('change-close-window-type', {type: this.form.close_window_type});
      })
    }
  }
}
</script>

<style>
#settings .from {
  margin: 20px;
}

.help-info {
  color: #888;
  font-size: 12px;
}
</style>
