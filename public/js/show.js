$(function () {
    var pid = $('#projectId').val()
    var alexEditor ;

    if (!pid) { return  ; }

    function initEditor () {
        var editor = new wangEditor('postContent');
        var disMenus = ['strikethrough', 'bgcolor', 'emotion', 'video', 'location', 'redo', 'fullscreen']
        editor.config.menus = editor.config.menus.filter((k) => disMenus.indexOf(k) === -1 )
        editor.config.uploadImgUrl = '/images/upload';
        editor.config.uploadImgFileName = 'editorFile'
        editor.create();
        alexEditor = editor;
    }
    initEditor();

    //=======db api ============
    function dbAddItem (cb) {
        //todo convert html 2 entities
        $.ajax({
            url: '/item/add/' + pid,
            method: 'POST',
            data: {content: alexEditor.$txt.html()},
            type: 'json'
        }).done(function(xhr, status){
            if(status=='success' ){ cb && cb(xhr.message) }
        })
    }
    function dbGetItem (pid, itemId, cb) {
        $.ajax({
            url: '/item/get/' + pid + '/' + itemId
        }).done(function (xhr, status) {
            if(status=='success' ){ cb && cb(xhr.message.content) }
        })
    }
    function dbRemoveItem (pid, itemId, cb) {
        $.ajax({
            url: '/item/remove/' + pid + '/' + itemId
        }).done(function (xhr, status) {
            if(status=='success' ){ cb && cb(xhr.message) }
        })
    }
    function dbUpdateItem (pid, itemId, cb) {
        $.ajax({
            url: '/item/update/' + pid + '/' + itemId,
            method: 'POST',
            data: {content: alexEditor.$txt.html() },
            type: 'json'
        }).done(function (xhr, status) {
            if(status=='success' ){ cb && cb(xhr.message) }
        })
    }
    function getDefCont (title) {
        return '<h2>' + (title || '标题') + '</h2><br><h3>设计指南</h3><br><br><br><h3>配色指南</h3><br><br>'   ;
    }

    //render tree
    function renderData (orgData ) {
        let _ret = '' ;
        let _getData = (data) => {
            _ret += `<ul>`
            for(let item of data) {
                if ($.isArray(item.id)) {
                    _ret += `<li><span>${item.name}</span>`
                    _getData(item.id)
                    _ret += '</li>'
                }else {
                    _ret += `<li><span class="treenode_item" data-id=${item.id}>${item.name}</span></li>`
                }
            }
            _ret += `</ul>`
        }
        _getData(orgData);
        return _ret  ;
    }
    //init tree
    var treeHtml = renderData(JSON.parse($('#treemenuStr').val()) )
    $('#menus').html(treeHtml)

    //update tree
    function updateTreeData () {
        var getJsonFromDOM = (data) => {
            var ret = []

            for(let item of data.childNodes) {
                if (item.nodeType != 1) { continue; }

                if (item.getElementsByTagName('ul').length > 0) {
                    var single = $(item).find('span')
                    ret.push({name: single.text(), id: getJsonFromDOM(single.find('ul')[0]) })
                }else {
                    var single = $(item).find('span')
                    ret.push({name: single.text(), id: single.data('id')})
                }
            }
            return ret ;
        }
        var ret = getJsonFromDOM($('#menus ul')[0]);

        console.log('get tree json: ', ret) ;
        $.ajax({
            url: '/menu/update/' + pid,
            method: 'POST',
            data: {treemenu: JSON.stringify(ret) },
            type: 'json'
        }).done(function (xhr, status) {
            if(status=='success' ){ console.log(xhr) }
        })
    }

    //event delegate
        //remove.click - db:removeItem - dom:render - updateTreemenu 


    $('#btnAddMenu').click(function () {
        var treenode = $('<li><span class="treenode_item" contenteditable="true">newitem</span> <i class="treenode_remove">&#215;</i></li>')
        $('#menus>ul').append(treenode)
        treenode.find('span').focus()
    })
    
    //todo set it to default itemId
    var activeItemId ;
    //handle event
    $('#menus').on('focusin', function (e) {
        // console.log(e.target.innerHTML) ;

    }).on('focusout', function (e) {
        var self = $(e.target)
        self.attr('contenteditable', 'false')
        alexEditor.$txt.html(getDefCont(self.text()) )

        if (self.data('id')) {
            updateTreeData()
            console.log('update only') ;
            return  ;
        }

        console.log('insert item') ;
        dbAddItem(function (id) {
            self.data('id', id )
            activeItemId = id
            updateTreeData()
            console.log('insert ok') ;
        })

    }).on('dblclick', function (e) {
        if (!$(e.target).hasClass('treenode_item')) {
            return  ;
        }

        $(e.target).attr('contenteditable', 'true').focus()

    }).on('click', function (e) {
        var self = $(e.target)
        var itemId = self.data('id')


        if (self.hasClass('treenode_item')) {
            if (itemId === activeItemId) {
                return  ;
            }
            //update active item 
            //todo: 恶心的异步
            if (activeItemId) {
                dbUpdateItem(pid, activeItemId, function (v) {
                    console.log('saved active item', v) ;

                    if (!itemId) { return  ; }
                    dbGetItem(pid, itemId, function (v) {
                        activeItemId = itemId
                        alexEditor.$txt.html(v)
                        console.log('got item content: ', v) ;
                    })
                })
            }else {
                    if (!itemId) { return  ; }
                    dbGetItem(pid, itemId, function (v) {
                        activeItemId = itemId
                        alexEditor.$txt.html(v)
                        console.log('got item content: ', v) ;
                    })
            }

            return  ;
        }
        if (self.hasClass('treenode_remove')) {
            itemId = self.parent().data('id')
            if (!itemId) { return  ; }
            dbRemoveItem(pid, itemId, function (v) {
                console.log('remove item: ', v) ;
                //remove DOM
                //load def item cont 
            })
            return  ;
        }
    })
})
