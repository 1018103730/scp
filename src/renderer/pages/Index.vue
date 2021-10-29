<template>
  <keep-alive>
    <div id="app">
      <top-nav></top-nav>
      <el-input :show-word-limit="show_word_limit"
                :clearable="clearable"
                placeholder="请输入搜索内容"
                prefix-icon="el-icon-search"
                size="mini"
                v-model="search">
      </el-input>
      <ul id="records">
        <li v-for="record in records"
            :style="{order:record.score}"
            v-if="searchRecord(record.content)">
          <small :title="record._id" @click="showTool(record)">
            {{ record._id.slice(0, settings.record_id_simple_length) }}
          </small>

          <span style="display: inline-block" @click="setClipboardData(record)" v-if="search.length ===0">
        {{ simpleContent(record.content) }}
        </span>
          <span style="display: inline-block" @click="setClipboardData(record)" v-else
                v-html="searchContent(record.content)"></span>

          <span class="time">
          {{ $moment(record.updatedAt).format('YYYY-MM-DD HH:mm:ss') }}
        </span>
        </li>
      </ul>
      <el-dialog title="小工具" :visible.sync="isShowTool" width="80%">
        <el-button class="tool-btn"
                   type="info" size="mini"
                   round v-for="tool in tools"
                   @click="tool.method()">{{ tool.name }}
        </el-button>
      </el-dialog>
    </div>
  </keep-alive>
</template>

<script>
import TopNav from "../components/TopNav";

export default {
  name: 'index',
  data() {
    return {
      clearable: true,
      show_word_limit: true,
      search: '',
      records: [],
      isShowTool: false,
      toolRecord: null,
      intervalKey: null,
      tools: [
        {name: '显示全文', method: this.toolShowContent},
        {name: '去除头尾空格', method: this.toolTrim},
        {name: '删除数据', method: this.toolDeleteRecord},
        {name: '提取手机号码', method: this.toolParsePhone},
      ],
    }
  },
  components: {TopNav},
  computed: {
    settings() {
      return this.$store.state.Settings.settings;
    }
  },
  mounted() {
    //初始化配置信息
    this.initSettings();

    //初始化records
    this.refreshRecordsData();

    //提供剪贴板内容检测监听
    this.$electron.ipcRenderer.on('checkClipboard', (event, args) => {
      let content = this.$electron.clipboard.readText();
      if (!content) return;
      let hash = this.$md5(content);

      this.$dbs.records.count({hash: hash}, (err, count) => {
        if (count === 0) {
          this.$dbs.records.insert({
            hash: hash,
            content: content,
            score: this.getScore()
          });

          this.refreshRecordsData();
        }
      })
    });
  },
  beforeDestroy() {
    clearInterval(this.intervalKey);
  },
  methods: {
    toolParsePhone() {
      let reg = /1[345789][0-9]{9}/igm;
      let phones = this.toolRecord.content.match(reg);
      if (!phones) {
        this.$message('无可提取的手机号码!');
        return;
      }

      this.$alert(phones.join(' '), '处理结果');
    },
    toolShowContent() {
      this.$alert(this.toolRecord.content, '全部内容');
    },
    toolTrim() {
      let content = this.toolRecord.content.replace(/(^\s*)|(\s*$)/g, "");
      this.$alert(content, '处理结果');
    },
    toolDeleteRecord() {
      this.$dbs.records.remove({_id: this.toolRecord.id}, {}, (err, numRemoved) => {
        this.isShowTool = false;
        this.toolRecord = null;

        this.$notify.success({message: '内容已删除!', title: '操作成功', showClose: true});
      });

      this.refreshRecordsData();
    },
    showTool(record) {
      this.isShowTool = true;
      this.toolRecord = record;
    },
    getScore() {
      return this.$moment(new Date()).format('MMDDHHmmss');
    },
    setClipboardData(record) {
      this.$electron.clipboard.writeText(record.content);

      //更新排序score
      this.$dbs.records.update({_id: record._id}, {$set: {score: this.getScore()}}, (err, numReplaced) => {
        this.refreshRecordsData();
      })

      this.$notify.success({message: '内容已添加到系统剪切板!', title: '操作成功', showClose: true});
    },
    simpleContent(content) {
      let tail = content.length > this.settings.record_content_simple_length ? '...' : '';
      return content.slice(0, this.settings.record_content_simple_length) + tail;
    },
    searchContent(content) {
      let offset = content.indexOf(this.search);
      if (offset === -1) return;
      //html实体化
      content = content.replace(/</g, '&lt;')
      content = content.replace(/>/g, '&gt;');

      content = content.replace(this.search, '<span class="search-result">' + this.search + '</span>');

      return content;
    },
    searchRecord(content) {
      if (content.length === 0) return true;
      return content.indexOf(this.search) !== -1;
    },
    initSettings() {
      this.$dbs.settings.count({}, (err, count) => {
        if (count === 0) {
          let doc = this.$defaultSettings;
          this.$dbs.settings.insert(doc, (err, newDoc) => {
            this.$store.commit('Settings/updateSettings', newDoc);
          })

        } else {
          this.$dbs.settings.findOne({}, (err, data) => {
            this.$store.commit('Settings/updateSettings', data);
          });
        }
      });

    },
    refreshRecordsData() {
      //清除超量/超时数据
      let num = 0;
      this.$dbs.records.find({/*todo 去除某些需要永久保存的数据*/}).sort({score: -1}).exec((err, docs) => {
            for (let doc of docs) {
              let canDelete = false;
              //清除超时数据
              let dayout = (Date.parse(new Date) - Date.parse(doc.updatedAt)) / 1000 / 24 / 3600;
              num++;
              canDelete = (dayout >= this.settings.time_since_last_update_day) || (num > this.settings.maximum_records_num);

              if (canDelete) {
                this.$dbs.records.remove({_id: doc._id}, {}, (err, num) => {
                })
              }
            }
          }
      );

      this.$dbs.records.find({}, (err, data) => {
        this.records = data;
      });
    }
  }
}
</script>

<style>
* {
  margin: 0px;
  padding: 0px;
  font-family: arial, sans-serif, '微软雅黑';
}

#app {
  /*margin: 3px;*/
}

#records {
  margin-top: 20px;
  display: flex;
  flex-direction: column-reverse;
}

#records li {
  list-style: none;
  border-bottom: 1px solid #efefef;
  cursor: pointer;
  padding: 5px 10px;
  font: 400 12px/24px '微软雅黑';
}

#records li:hover {
  background: #efefef;
}

#records li small {
  display: inline-block;
  background: #222;
  border-radius: 3px;
  color: #fff;
  width: 40px;
  font-size: 8px;
  text-align: center;
  margin-right: 10px;
}

#records li span.time {
  color: #888;
  float: right;
  font-size: 10px;
}

.tool-btn {
  margin: 5px !important;
  text-align: center;
  width: 100px;
  font-size: 12px;
}

.search-result {
  background: #47ceff;
  color: #fff;
  display: inline-block;
  padding: 0 3px;
  border-radius: 3px;
  margin: 0 2px;
}
</style>
