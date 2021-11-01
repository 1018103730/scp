<template>
  <el-menu :router="useRoute" class="el-menu-top" mode="horizontal">
    <el-menu-item index="/"><i class="el-icon-document-copy"></i> 剪切板</el-menu-item>
    <el-menu-item index="/settings"><i class="el-icon-setting"></i> 系统设置</el-menu-item>
    <el-menu-item @click="quit"><i class="el-icon-close"></i> 退出</el-menu-item>
  </el-menu>
</template>

<style>
.el-menu-top {
  margin-bottom: 10px !important;
  font-family: '微软雅黑';
  color: #333;
}

.el-menu--horizontal > .el-menu-item {
  height: 30px !important;
  line-height: 30px !important;
}
</style>

<script>
import {remote} from "electron";

export default {
  name: 'top-nav',
  data() {
    return {
      useRoute: true
    };
  },
  methods: {
    quit() {
      remote.app.exit();
    }
  }
}
</script>
