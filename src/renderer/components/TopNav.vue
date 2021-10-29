<template>
  <el-menu :router="useRoute" class="el-menu-top" mode="horizontal">
    <el-menu-item index="/">剪切板</el-menu-item>
    <el-menu-item index="/settings">系统设置</el-menu-item>
  </el-menu>
</template>

<style>
.el-menu-top {
  margin-bottom: 10px !important;
}

.el-menu--horizontal > .el-menu-item {
  height: 30px !important;
  line-height: 30px !important;
}
</style>

<script>
export default {
  name: 'top-nav',
  data() {
    return {
      useRoute: true
    };
  },
  methods: {}
}
</script>
