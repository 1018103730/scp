<template>
  <keep-alive>
    <div id="app">
      <el-backtop></el-backtop>
      <div class="top-fix">
        <top-nav></top-nav>
        <div class="clearfix"></div>
        <div class="search">
          <el-input :show-word-limit="show_word_limit"
                    :clearable="clearable"
                    placeholder="请输入搜索内容"
                    prefix-icon="el-icon-search"
                    size="mini"
                    id="search_input"
                    v-model="search">
          </el-input>

          <div class="tags" v-if="(Array.from(tags)).length > 0 ">
            常用tags:
            <el-select v-model="select_tag" filterable clearable placeholder="请选择" size="mini"
                       @change="selectTagChange">
              <el-option
                  v-for="tag in tags"
                  :key="tag"
                  :label="tag"
                  :value="tag">
              </el-option>
            </el-select>
          </div>
        </div>
      </div>

      <ul id="records">
        <li v-for="record in records"
            :style="{order:record.score}"
            v-if="searchRecord(record)"
            title="双击复制"
            @dblclick="setClipboardData(record)">
          <small :title="record._id" @click="showTool(record)">
            {{ record._id.slice(0, settings.record_id_simple_length) }}
          </small>

          <!--图片-->
          <span v-if="record.type === 'image'">
          <el-image :title="showReuseTime(record.reuse_time)"
                    class="clipboard-image"
                    lazy
                    style="height: 100px;"
                    :src="parseImageFile(record.filepath)">
          </el-image>
        </span>
          <!--文字-->
          <span v-else-if="record.type === 'text'">
          <span style="display: inline-block" v-if="search.length ===0"
                :title="showReuseTime(record.reuse_time)">
              {{ simpleContent(record.digest) }}
            </span>
          <span style="display: inline-block" v-else
                :title="record.size" v-html="searchContent(record)">
          </span>
        </span>

          <span class="time">
            {{ $moment(record.updatedAt).format('YYYY-MM-DD HH:mm:ss') }}
          </span>
        </li>
      </ul>
      <el-dialog title="小工具" :visible.sync="isShowTool" width="80%" v-if="toolRecord">
        <el-button class="tool-btn"
                   type="info" size="mini"
                   round v-for="tool in tools[this.toolRecord.type]"
                   @click="tool.method()">{{ tool.name }}
        </el-button>
      </el-dialog>
    </div>
  </keep-alive>
</template>

<script>
import TopNav from "../components/TopNav";
import fs from 'fs';

const tagPrefix = 'tag@';

export default {
  name: 'index',
  data() {
    return {
      autofocus: true,
      clearable: true,
      select_tag: null,
      tag_prefix: tagPrefix,
      show_word_limit: true,
      search: '',
      records: [],
      tags: [],
      isShowTool: false,
      toolRecord: null,
      intervalKey: null,
      tools: {
        'text': [
          {name: '显示全文', method: this.toolShowContent},
          {name: '去除头尾空格', method: this.toolTrim},
          {name: '删除数据', method: this.toolDeleteRecord},
          {name: '提取手机号码', method: this.toolParsePhone},
          {name: "设置Tag", method: this.toolSetTags}
        ],
        'image': [
          {name: '显示大图', method: this.toolShowImage},
          {name: '删除数据', method: this.toolDeleteRecord},
          {name: '生成DataUrl', method: this.toolImageToDataUrl},
          {name: "设置Tag", method: this.toolSetTags}
        ]
      },
    }
  },
  components: {TopNav},
  computed: {
    settings() {
      return this.$store.state.Settings.settings;
    }
  },
  mounted() {
    this.refreshRecordsData();

    this.$electron.ipcRenderer.on('refresh-records-data', () => {
      this.refreshRecordsData();
    })

    this.$electron.ipcRenderer.on('focus-search-input', () => {
      document.getElementById('search_input').focus();
    });
  },
  beforeDestroy() {
    clearInterval(this.intervalKey);
  },
  methods: {
    showReuseTime(time) {
      return '此记录已复用 ' + time + ' 次';
    },
    selectTagChange() {
      if (this.select_tag.length > 0) {
        this.search = this.tag_prefix + this.select_tag;
      } else {
        this.search = '';
      }
    },
    parseImageFile(filepath) {
      return this.$electron.nativeImage.createFromPath(filepath).toDataURL();
    },
    parseTmpFile(filepath, callback) {
      return fs.readFile(filepath, 'utf-8', callback);
    },
    parseTmpFileSync(filepath) {
      return fs.readFileSync(filepath, 'utf-8');
    },
    toolSetTags() {
      this.$prompt('多个标签可用","分隔', '标签设置', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: this.toolRecord.tags,
      }).then(({value}) => {
        this.$dbs.records.update({_id: this.toolRecord._id}, {$set: {tags: value}}, (err, data) => {
          this.$message({
            type: 'success',
            message: 'Tags设置成功!'
          });

          this.refreshRecordsData();
        })
      });
    },
    toolImageToDataUrl() {
      this.$electron.clipboard.writeText(this.parseImageFile(this.toolRecord.filepath));

      this.$message.success({type: 'success', message: 'DateUrl已存入到剪切板中!'});
    },
    toolShowImage() {
      this.$alert('<img src="' + this.parseImageFile(this.toolRecord.filepath) + '">', '图片显示', {
        dangerouslyUseHTMLString: true
      });
    },
    toolParsePhone() {
      let reg = /1[345789][0-9]{9}/igm;
      this.parseTmpFile(this.toolRecord.filepath, (err, data) => {
        let phones = data.match(reg);
        if (!phones) {
          this.$message('无可提取的手机号码!');
          return;
        }

        this.$alert(phones.join(' '), '处理结果');
      })
    },
    toolShowContent() {
      this.parseTmpFile(this.toolRecord.filepath, (err, data) => {
        this.$alert(data, '全部内容', {
          closeOnClickModal: true,
          closeOnPressEscape: true
        });
      });
    },
    toolTrim() {
      this.parseTmpFile(this.toolRecord.filepath, (err, data) => {
        let content = data.replace(/(^\s*)|(\s*$)/g, "");
        this.$alert(content, '处理结果');
      });
    },
    toolDeleteRecord() {
      this.$dbs.records.remove({_id: this.toolRecord._id}, {}, (err, numRemoved) => {
        if (numRemoved <= 0) return;

        //删除缓存文件
        fs.unlink(this.toolRecord.filepath, (err) => {
        })

        this.isShowTool = false;
        this.toolRecord = null;

        this.$notify.success({message: '内容已删除!', title: '操作成功', showClose: true});
      });

      this.refreshRecordsData();
    },
    showTool(record) {
      this.isShowTool = true;
      this.toolRecord = record;

      return false;
    },
    getScore() {
      return this.$moment(new Date()).format('MMDDHHmmss');
    },
    setClipboardData(record) {
      let type = record.type;
      this.$electron.ipcRenderer.send('set-clipboard', {type: type, filepath: record.filepath})

      //更新排序score
      let reuse_time = record.reuse_time ? record.reuse_time : 0;
      let updateData = {
        score: this.getScore(),
        reuse_time: reuse_time + 1
      }
      if (record.tags.indexOf('复用') === -1) {
        updateData.tags = record.tags + ',复用';
      }

      this.$dbs.records.update({_id: record._id}, {$set: updateData}, (err, numReplaced) => {
        this.refreshRecordsData();
      })

      this.$notify.success({message: '内容已添加到系统剪切板!', title: '操作成功', showClose: true});
      this.$electron.ipcRenderer.send('min-window', {notify: 'ping'});
    },
    simpleContent(content) {
      let tail = content.length > this.settings.record_content_simple_length ? '...' : '';
      return content.slice(0, this.settings.record_content_simple_length) + tail;
    },
    searchContent(record) {
      let isSearchTag = false;
      let tagReg = new RegExp(this.tag_prefix, 'gim');
      isSearchTag = tagReg.test(this.search)

      let search = this.search.replace(this.tag_prefix, '', this.search);
      let {
        type,
        content,
        offset,
        searchTag
      } = isSearchTag ? this.searchContentFromTags(record, search) :
          (this.searchContentFromDigest(record) || this.searchContentFromTmpFile(record));

      if (!content) return;

      let searchContent = this.search;
      if (searchTag) {
        searchContent = searchTag;
      }

      let replaceContent = '<span class="search-result">' + searchContent + '</span>';
      content = content.replace(searchContent, replaceContent);

      let marginLength = parseInt(this.settings.margin_length_when_search);
      let start = offset - marginLength;
      let end = offset + replaceContent.length + marginLength;
      let prefix = start > 0 ? '...' : '';
      let suffix = end < content.length ? '...' : '';

      content = prefix + content.slice(start > 0 ? start : 0, end < content.length ? end : content.length) + suffix;

      return content;
    },
    searchContentFromTags(record, search) {
      let tags = record.tags;
      if (tags.length === 0) return false;
      let searchTag = null;
      for (let tag of tags.split(',')) {
        let offset = tag.indexOf(search);
        if (offset === -1) continue;

        searchTag = tag;
      }
      if (!searchTag) return false;

      return {type: 'tags', content: searchTag + ':' + record.digest, offset: 0, searchTag: searchTag};
    },
    searchContentFromDigest(record) {
      let content = record.digest;
      if (content.length === 0) return false;

      //html实体化
      content = content.replace(/</g, '&lt;')
      content = content.replace(/>/g, '&gt;');

      let offset = content.indexOf(this.search);
      if (offset === -1) return false;

      return {type: 'digest', content: content, offset: offset};
    },
    searchContentFromTmpFile(record) {
      let content = this.parseTmpFileSync(record.filepath);

      //html实体化
      content = content.replace(/</g, '&lt;')
      content = content.replace(/>/g, '&gt;');

      let offset = content.indexOf(this.search);
      if (offset === -1) return false;

      return {types: 'file', content: content, offset: offset};
    },
    searchRecord(record) {
      if (this.search.length === 0) return true;
      let isSearchTag = false;
      let tagReg = new RegExp(this.tag_prefix, 'gim');
      if (tagReg.test(this.search)) {
        isSearchTag = true
      }
      if (isSearchTag) {
        let search = this.search.replace(this.tag_prefix, '', this.search);
        return record.tags.indexOf(search) !== -1;
      }

      // let tagsHas = () => {
      //   return record.tags.indexOf(this.search) !== -1
      // };
      let digestHas = () => {
        return record.digest.indexOf(this.search) !== -1
      };
      let fileHas = () => {
        return this.parseTmpFileSync(record.filepath).indexOf(this.search) !== -1
      };

      return digestHas() || fileHas();
    },
    refreshRecordsData() {
      this.$dbs.records.loadDatabase();
      //清除超量/超时数据
      let num = 0;
      this.$dbs.records.find({/*todo 去除某些需要永久保存的数据*/}).sort({score: -1}).exec((err, docs) => {
            for (let doc of docs) {
              //复用过的信息 不进行自动删除
              if (doc.reuse_time > 0) continue;

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

      this.$dbs.records.find({}).sort({score: -1}).exec((err, data) => {
        //设置tags
        let tags = '';
        for (let record of data) {
          if (record.tags === '') continue;

          tags += ',' + record.tags
        }
        if (tags === '') {
          this.tags = new Set();
        } else {
          tags = tags.slice(1, tags.length);
          this.tags = new Set(tags.split(','));
        }

        //设置数据
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
  word-break: break-word;
}

/*修改滚动条样式*/
body::-webkit-scrollbar {
  width: 5px;
  height: 5px;
  /**/
}

body::-webkit-scrollbar-track {
  background: rgb(239, 239, 239);
  border-radius: 2px;
}

body::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 10px;
}

body::-webkit-scrollbar-thumb:hover {
  background: #333;
}

body::-webkit-scrollbar-corner {
  background: #179a16;
}

#app {
  /*margin: 3px;*/
}

#records {
  margin-top: 120px;
  display: flex;
  flex-direction: column-reverse;
}

#records li {
  list-style: none;
  border-bottom: 1px solid #efefef;
  cursor: pointer;
  padding: 5px 10px;
  font: 400 12px/24px '微软雅黑';
  user-select: none;
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

.el-message-box {
  width: 80% !important;
}

.el-message-box__message p {
  /*height: 300px;*/
  /*overflow-y: scroll;*/
}

.clipboard-image img {
  width: auto !important;
}

.search {
  margin: 10px;
}

.tags {
  margin-top: 10px;
  color: #888;
  font-size: 12px;
}

.clearfix {
  clear: both;
}

.top-fix {
  width: 100%;
  position: fixed;
  top: 0px;
  background: rgba(255, 255, 255, .95);
  z-index: 9999;
}
</style>
