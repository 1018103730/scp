const settings = {
    //列表显示的剪切板ID截取长度
    record_id_simple_length: 4,
    //列表显示的剪切板内容截取长度
    record_content_simple_length: 40,
    //最大储存记录数量
    maximum_records_num: 500,
    //数据超过这个时间(单位:天)未更新即删除
    time_since_last_update_day: 7,
    //搜索时两端显示的长度
    margin_length_when_search: 15,
    //关闭窗口方式 background/exit
    close_window_type: 'background',
}

export default settings
